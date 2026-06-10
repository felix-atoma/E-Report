import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  async getOverview(institutionId: string) {
    const [students, classes, teachers, subjects, publishedReports, heldNotifications, latestClass] =
      await Promise.all([
        this.prisma.student.count({ where: { institutionId } }),
        this.prisma.class.count({ where: { institutionId, isActive: true } }),
        this.prisma.user.count({ where: { institutionId, role: 'TEACHER', isActive: true } }),
        this.prisma.subject.count({ where: { institutionId, isActive: true } }),
        this.prisma.reportCard.count({ where: { class: { institutionId }, status: 'PUBLISHED' } }),
        this.prisma.notificationLog.count({
          where: { status: { in: ['HELD_UNPAID', 'HELD_PARTIAL'] }, student: { institutionId } },
        }),
        this.prisma.class.findFirst({
          where: { institutionId, isActive: true },
          select: { academicYear: true },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    return {
      totalStudents: students,
      totalTeachers: teachers,
      totalClasses: classes,
      subjects,
      publishedReports,
      pendingPayments: heldNotifications,
      academicYear: latestClass?.academicYear ?? null,
    };
  }

  private currentAcademicYear(): string {
    const now = new Date();
    const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return `${y}-${y + 1}`;
  }

  async getPaymentSummary(institutionId: string, academicYear?: string) {
    const year = academicYear || this.currentAcademicYear();

    const [fees, payments] = await Promise.all([
      this.prisma.studentFee.findMany({
        where: { student: { institutionId }, academicYear: year },
        select: { studentId: true, amountDue: true, isExempt: true },
      }),
      this.prisma.payment.findMany({
        where: { institutionId, academicYear: year },
        select: { studentId: true, amount: true },
      }),
    ]);

    // Aggregate per student: due amount and paid amount
    type StudentEntry = { due: number; paid: number; allExempt: boolean; hasNonExempt: boolean };
    const byStudent = new Map<string, StudentEntry>();

    for (const fee of fees) {
      const e = byStudent.get(fee.studentId) ?? { due: 0, paid: 0, allExempt: true, hasNonExempt: false };
      if (fee.isExempt) {
        // exempt fee — don't add to due
      } else {
        e.hasNonExempt = true;
        e.allExempt = false;
        e.due += (fee.amountDue as any).toNumber();
      }
      byStudent.set(fee.studentId, e);
    }

    for (const payment of payments) {
      const e = byStudent.get(payment.studentId) ?? { due: 0, paid: 0, allExempt: false, hasNonExempt: false };
      e.paid += (payment.amount as any).toNumber();
      byStudent.set(payment.studentId, e);
    }

    let paidCount = 0, partialCount = 0, unpaidCount = 0, exemptCount = 0;
    let totalDue = 0, totalCollected = 0;

    for (const s of byStudent.values()) {
      if (!s.hasNonExempt) {
        exemptCount++;
        continue;
      }
      totalDue += s.due;
      const contributed = Math.min(s.paid, s.due);
      totalCollected += contributed;
      if (s.paid >= s.due) paidCount++;
      else if (s.paid > 0) partialCount++;
      else unpaidCount++;
    }

    const collectionRate = totalDue > 0 ? Math.min(100, Math.round((totalCollected / totalDue) * 100)) || 0 : 0;

    return {
      academicYear: year,
      paidCount,
      partialCount,
      unpaidCount,
      exemptCount,
      collectionRate,
      totalDue,
      totalPaid: totalCollected,
      totalPending: Math.max(0, totalDue - totalCollected),
    };
  }

  async getReportStats(institutionId: string, academicYear?: string) {
    const where: any = { class: { institutionId } };
    if (academicYear) where.academicYear = academicYear;

    const [draft, review, published] = await Promise.all([
      this.prisma.reportCard.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.reportCard.count({ where: { ...where, status: 'REVIEW' } }),
      this.prisma.reportCard.count({ where: { ...where, status: 'PUBLISHED' } }),
    ]);

    return { draftCount: draft, reviewCount: review, publishedCount: published, total: draft + review + published };
  }

  async remindUnpaid(institutionId: string, academicYear?: string) {
    const year = academicYear || this.currentAcademicYear();

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { name: true },
    });
    const schoolName = institution?.name ?? 'l\'établissement';

    const [fees, payments] = await Promise.all([
      this.prisma.studentFee.findMany({
        where: { student: { institutionId }, academicYear: year, isExempt: false },
        select: {
          studentId: true,
          amountDue: true,
          student: {
            select: {
              admissionNumber: true,
              fatherPhone: true,
              motherPhone: true,
              user:   { select: { name: true } },
              parent: { select: { whatsappNumber: true } },
            },
          },
        },
      }),
      this.prisma.payment.findMany({
        where: { institutionId, academicYear: year },
        select: { studentId: true, amount: true },
      }),
    ]);

    // Aggregate paid amount per student
    const paidMap = new Map<string, number>();
    for (const p of payments) {
      paidMap.set(p.studentId, (paidMap.get(p.studentId) ?? 0) + (p.amount as any).toNumber());
    }

    // Sum due per student
    type FeeEntry = { due: number; student: (typeof fees)[0]['student'] };
    const dueMap = new Map<string, FeeEntry>();
    for (const f of fees) {
      const entry = dueMap.get(f.studentId) ?? { due: 0, student: f.student };
      entry.due += (f.amountDue as any).toNumber();
      dueMap.set(f.studentId, entry);
    }

    let sent = 0, skipped = 0, failed = 0;

    for (const [studentId, { due, student }] of dueMap) {
      const paid = paidMap.get(studentId) ?? 0;
      if (paid >= due) continue; // fully paid — skip

      const remaining = Math.max(0, due - paid);
      const phone = student.parent?.whatsappNumber || student.fatherPhone || student.motherPhone;
      if (!phone) { skipped++; continue; }

      const studentName = student.user?.name ?? student.admissionNumber;
      const fmt = (n: number) => n.toLocaleString('fr-FR');
      const message = this.buildReminderMessage(schoolName, studentName, year, due, paid, remaining, fmt);

      const ok = await this.whatsapp.sendText(phone, message);
      if (ok) sent++; else failed++;
    }

    return { sent, skipped, failed, academicYear: year };
  }

  async getAtRiskStudents(institutionId: string, academicYear?: string) {
    const year = academicYear || this.currentAcademicYear();

    // Get all published report cards for both terms in the year
    const reports = await this.prisma.reportCard.findMany({
      where: { class: { institutionId }, academicYear: year, status: 'PUBLISHED' },
      select: {
        studentId: true,
        termNumber: true,
        overallAverage: true,
        classRank: true,
        student: {
          select: {
            admissionNumber: true,
            user: { select: { name: true } },
            classes: {
              include: { class: { select: { id: true, name: true } } },
              orderBy: { academicYear: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { termNumber: 'asc' },
    });

    // Group by student → termNumber → average
    type TermEntry = { avg: number; rank: number | null; termNumber: number };
    const byStudent = new Map<string, { student: (typeof reports)[0]['student']; terms: TermEntry[] }>();

    for (const r of reports) {
      if (r.overallAverage == null) continue;
      const entry = byStudent.get(r.studentId) ?? { student: r.student, terms: [] };
      entry.terms.push({ avg: Number(r.overallAverage), rank: r.classRank, termNumber: r.termNumber });
      byStudent.set(r.studentId, entry);
    }

    const atRisk: {
      studentId: string;
      studentName: string;
      admissionNumber: string;
      className: string;
      currentAvg: number;
      previousAvg: number;
      drop: number;
      currentTerm: number;
      isFailingNow: boolean;
    }[] = [];

    for (const [studentId, { student, terms }] of byStudent) {
      if (terms.length < 2) continue;
      const sorted = terms.sort((a, b) => a.termNumber - b.termNumber);
      const prev    = sorted[sorted.length - 2];
      const current = sorted[sorted.length - 1];
      const drop    = Math.round((prev.avg - current.avg) * 100) / 100;

      // Flag if dropped more than 1.5 points OR now failing (< 10)
      if (drop > 1.5 || current.avg < 10) {
        atRisk.push({
          studentId,
          studentName:    student.user?.name ?? student.admissionNumber,
          admissionNumber: student.admissionNumber,
          className:      student.classes?.[0]?.class?.name ?? '—',
          currentAvg:     current.avg,
          previousAvg:    prev.avg,
          drop,
          currentTerm:    current.termNumber,
          isFailingNow:   current.avg < 10,
        });
      }
    }

    atRisk.sort((a, b) => b.drop - a.drop);
    return { academicYear: year, count: atRisk.length, students: atRisk };
  }

  private buildReminderMessage(
    schoolName: string,
    studentName: string,
    academicYear: string,
    due: number,
    paid: number,
    remaining: number,
    fmt: (n: number) => string,
  ): string {
    if (paid > 0) {
      // Partial payer — thank them, show progress, ask to finish
      const pct = Math.round((paid / due) * 100);
      return (
        `Madame / Monsieur,\n\n` +
        `Nous vous contactons au sujet des frais scolaires de *${studentName}* pour l'année *${academicYear}* — *${schoolName}*.\n\n` +
        `✅ *Paiement reçu :* ${fmt(paid)} XOF (${pct} % du total)\n` +
        `🔄 *Reste à payer :* ${fmt(remaining)} XOF sur ${fmt(due)} XOF\n\n` +
        `Nous tenons à vous remercier sincèrement pour vos efforts et votre sérieux. Votre paiement a bien été enregistré et nous vous en sommes reconnaissants.\n\n` +
        `Afin de finaliser la situation de votre enfant et de lever toute retenue éventuelle du bulletin, nous vous invitons à régler le solde restant de *${fmt(remaining)} XOF* dès que cela vous sera possible.\n\n` +
        `Nous restons disponibles pour tout renseignement.\n` +
        `🏫 *${schoolName}*`
      );
    } else {
      // No payment at all — polite but firm reminder
      return (
        `Madame / Monsieur,\n\n` +
        `Nous vous contactons au sujet des frais scolaires de *${studentName}* pour l'année *${academicYear}* — *${schoolName}*.\n\n` +
        `💰 *Montant dû :* ${fmt(due)} XOF\n` +
        `⚠️ *Aucun paiement enregistré à ce jour.*\n\n` +
        `Nous vous invitons à régulariser cette situation dans les meilleurs délais afin d'éviter toute retenue du bulletin scolaire de votre enfant.\n\n` +
        `Si vous rencontrez des difficultés, n'hésitez pas à nous contacter directement pour trouver une solution adaptée.\n\n` +
        `Merci pour votre compréhension et votre collaboration.\n` +
        `🏫 *${schoolName}*`
      );
    }
  }

  async getRecordsSummary(institutionId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear  = new Date(now.getFullYear(), 0, 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      disciplinaryUnresolved,
      overdueLoans,
      healthThisMonth,
      alumniCount,
      transfersThisYear,
      inventoryActive,
      examAdmis,
      examTotal,
    ] = await Promise.all([
      this.prisma.disciplinaryRecord.count({ where: { institutionId, resolved: false } }),
      this.prisma.libraryLoan.count({ where: { institutionId, isReturned: false, dueDate: { lt: today } } }),
      this.prisma.healthRecord.count({ where: { institutionId, date: { gte: startOfMonth } } }),
      this.prisma.alumniRecord.count({ where: { institutionId } }),
      this.prisma.studentTransfer.count({ where: { institutionId, transferDate: { gte: startOfYear } } }),
      this.prisma.inventoryItem.count({ where: { institutionId, isActive: true } }),
      this.prisma.nationalExamResult.count({ where: { institutionId, result: 'ADMIS' } }),
      this.prisma.nationalExamResult.count({ where: { institutionId } }),
    ]);

    return {
      disciplinaryUnresolved,
      overdueLoans,
      healthThisMonth,
      alumniCount,
      transfersThisYear,
      inventoryActive,
      examPassRate: examTotal > 0 ? Math.round((examAdmis / examTotal) * 100) : null,
      examTotal,
    };
  }

  async getClassStats(institutionId: string, classId: string, academicYear: string, termNumber: number) {
    const [currentReports, previousReports] = await Promise.all([
      this.prisma.reportCard.findMany({
        where: { classId, academicYear, termNumber, status: 'PUBLISHED', class: { institutionId } },
        select: {
          studentId: true,
          overallAverage: true,
          classRank: true,
          student: { select: { admissionNumber: true, user: { select: { name: true } } } },
        },
      }),
      termNumber > 1
        ? this.prisma.reportCard.findMany({
            where: { classId, academicYear, termNumber: termNumber - 1, status: 'PUBLISHED', class: { institutionId } },
            select: { studentId: true, overallAverage: true },
          })
        : Promise.resolve([]),
    ]);

    const prevMap = new Map(previousReports.map((r) => [r.studentId, r.overallAverage]));

    let progressed = 0, declined = 0, stable = 0, noPrevious = 0;
    let bestProgress: { studentName: string; admissionNumber: string; delta: number; currentAvg: number; previousAvg: number } | null = null;
    let worstDecline: { studentName: string; admissionNumber: string; delta: number; currentAvg: number; previousAvg: number } | null = null;

    for (const r of currentReports) {
      const currAvg = r.overallAverage != null ? Number(r.overallAverage) : null;
      if (currAvg == null) continue;

      const prevRaw = prevMap.get(r.studentId);
      if (prevRaw == null) { noPrevious++; continue; }
      const prevAvg = Number(prevRaw);
      const delta = Math.round((currAvg - prevAvg) * 100) / 100;
      const studentName = r.student.user?.name ?? r.student.admissionNumber;
      const admissionNumber = r.student.admissionNumber;

      if (delta > 0) {
        progressed++;
        if (!bestProgress || delta > bestProgress.delta)
          bestProgress = { studentName, admissionNumber, delta, currentAvg: currAvg, previousAvg: prevAvg };
      } else if (delta < 0) {
        declined++;
        if (!worstDecline || delta < worstDecline.delta)
          worstDecline = { studentName, admissionNumber, delta, currentAvg: currAvg, previousAvg: prevAvg };
      } else {
        stable++;
      }
    }

    const withPrevious = progressed + declined + stable;
    const pct = (n: number) => withPrevious > 0 ? Math.round((n / withPrevious) * 100) : 0;

    // ── Statistical measures on current term averages ──────────────────────
    const averages = currentReports
      .map((r) => (r.overallAverage != null ? Number(r.overallAverage) : null))
      .filter((a): a is number => a != null);

    const n = averages.length;
    const round2 = (v: number) => Math.round(v * 100) / 100;

    const classAverage = n > 0 ? round2(averages.reduce((s, a) => s + a, 0) / n) : null;

    const sorted = [...averages].sort((a, b) => a - b);
    const classMedian = n > 0
      ? round2(n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)])
      : null;

    const classMin = n > 0 ? round2(sorted[0]) : null;
    const classMax = n > 0 ? round2(sorted[n - 1]) : null;

    const classStdDev =
      n > 1 && classAverage != null
        ? round2(Math.sqrt(averages.reduce((s, a) => s + Math.pow(a - classAverage, 2), 0) / n))
        : null;

    const distribution = {
      TB:    averages.filter((a) => a >= 16).length,
      B:     averages.filter((a) => a >= 14 && a < 16).length,
      AB:    averages.filter((a) => a >= 12 && a < 14).length,
      P:     averages.filter((a) => a >= 10 && a < 12).length,
      Insuf: averages.filter((a) => a < 10).length,
    };

    const passingCount = averages.filter((a) => a >= 10).length;
    const passingRate = n > 0 ? Math.round((passingCount / n) * 100) : null;

    return {
      classId,
      academicYear,
      termNumber,
      totalStudents: currentReports.length,
      withPreviousTerm: withPrevious,
      noPreviousTerm: noPrevious,
      progressed: { count: progressed, percentage: pct(progressed) },
      declined:   { count: declined,   percentage: pct(declined)   },
      stable:     { count: stable,     percentage: pct(stable)     },
      bestProgress,
      worstDecline,
      classAverage,
      classMedian,
      classMin,
      classMax,
      classStdDev,
      distribution,
      passingRate,
      passingCount,
    };
  }
}
