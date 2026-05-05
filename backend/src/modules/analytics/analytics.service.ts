import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return { students, classes, teachers, subjects, publishedReports, heldNotifications, academicYear: latestClass?.academicYear ?? null };
  }

  async getPaymentSummary(institutionId: string, academicYear: string) {
    const fees = await this.prisma.studentFee.findMany({
      where: { student: { institutionId }, academicYear },
      select: { amountDue: true, isExempt: true },
    });

    const payments = await this.prisma.payment.findMany({
      where: { institutionId, academicYear },
      select: { amount: true },
    });

    const totalDue = fees.filter((f) => !f.isExempt).reduce((s, f) => s + Number(f.amountDue), 0);
    const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
    const totalPending = Math.max(0, totalDue - totalCollected);
    const exemptCount = fees.filter((f) => f.isExempt).length;

    return { academicYear, totalDue, totalCollected, totalPending, exemptCount };
  }

  async getReportStats(institutionId: string, academicYear?: string) {
    const where: any = { class: { institutionId } };
    if (academicYear) where.academicYear = academicYear;

    const [draft, review, published] = await Promise.all([
      this.prisma.reportCard.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.reportCard.count({ where: { ...where, status: 'REVIEW' } }),
      this.prisma.reportCard.count({ where: { ...where, status: 'PUBLISHED' } }),
    ]);

    return { draft, review, published, total: draft + review + published };
  }

  async getClassStats(institutionId: string, classId: string, academicYear: string, termNumber: number) {
    const [currentReports, previousReports] = await Promise.all([
      this.prisma.reportCard.findMany({
        where: { classId, academicYear, termNumber, status: 'PUBLISHED', class: { institutionId } },
        select: {
          studentId: true,
          overallAverage: true,
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
    };
  }
}
