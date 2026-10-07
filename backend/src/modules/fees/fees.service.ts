import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeeDto } from './dto/create-fee.dto';
import { AssignFeeDto } from './dto/assign-fee.dto';

@Injectable()
export class FeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(institutionId: string, academicYear?: string) {
    return this.prisma.fee.findMany({
      where: { institutionId, isActive: true, ...(academicYear && { academicYear }) },
      include: { _count: { select: { studentFees: true } } },
      orderBy: [{ academicYear: 'desc' }, { feeType: 'asc' }],
    });
  }

  async create(dto: CreateFeeDto, institutionId: string) {
    const now = new Date();
    const defaultYear = `${now.getFullYear() - (now.getMonth() < 8 ? 1 : 0)}-${now.getFullYear() + (now.getMonth() >= 8 ? 1 : 0)}`;
    return this.prisma.fee.create({
      data: {
        ...dto,
        feeType: dto.feeType ?? 'TUITION',
        academicYear: dto.academicYear || defaultYear,
        amount: new Prisma.Decimal(dto.amount),
        institutionId,
      },
    });
  }

  async update(id: string, dto: Partial<CreateFeeDto>, institutionId: string) {
    await this.ensureExists(id, institutionId);
    const { amount, ...rest } = dto;
    return this.prisma.fee.update({
      where: { id },
      data: {
        ...rest,
        ...(amount !== undefined && { amount: new Prisma.Decimal(amount) }),
      },
    });
  }

  async deactivate(id: string, institutionId: string) {
    await this.ensureExists(id, institutionId);
    return this.prisma.fee.update({ where: { id }, data: { isActive: false } });
  }

  /**
   * Année affichée par défaut : l'année scolaire en cours si des frais y sont attribués, sinon la
   * plus récente qui en a (sinon les écrans de suivi resteraient vides en début d'année).
   */
  private async defaultFeeYear(institutionId: string): Promise<string> {
    const now = new Date();
    const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    const current = `${y}-${y + 1}`;
    const has = await this.prisma.studentFee.findFirst({ where: { academicYear: current, student: { institutionId } }, select: { id: true } });
    if (has) return current;
    const latest = await this.prisma.studentFee.findFirst({
      where: { student: { institutionId } }, orderBy: { academicYear: 'desc' }, select: { academicYear: true },
    });
    return latest?.academicYear ?? current;
  }

  /**
   * Situation des paiements de chaque élève inscrit pour l'année (y compris ceux qui n'ont rien
   * payé) : attendu, payé, reste, statut, dernier paiement et contact du parent.
   */
  async studentsPaymentStatus(institutionId: string, academicYear?: string, classId?: string) {
    const year = academicYear || await this.defaultFeeYear(institutionId);
    const enrolments = await this.prisma.classStudent.findMany({
      where: { academicYear: year, student: { institutionId }, ...(classId ? { classId } : {}) },
      select: {
        studentId: true,
        class: { select: { id: true, name: true } },
        student: {
          select: {
            admissionNumber: true,
            user: { select: { name: true } },
            parent: { select: { name: true, whatsappNumber: true, email: true } },
          },
        },
      },
    });
    const ids = [...new Set(enrolments.map((e) => e.studentId))];
    const [fees, payments] = await Promise.all([
      this.prisma.studentFee.findMany({
        where: { studentId: { in: ids }, academicYear: year },
        select: { studentId: true, amountDue: true, isExempt: true },
      }),
      this.prisma.payment.findMany({
        where: { institutionId, studentId: { in: ids }, academicYear: year },
        select: { studentId: true, amount: true, paymentDate: true },
        orderBy: { paymentDate: 'desc' },
      }),
    ]);
    const due = new Map<string, number>();
    const exempt = new Set<string>();
    for (const f of fees) {
      if (f.isExempt) { exempt.add(f.studentId); continue; }
      due.set(f.studentId, (due.get(f.studentId) ?? 0) + Number(f.amountDue));
    }
    const paid = new Map<string, number>();
    const last = new Map<string, { date: Date; amount: number }>();
    for (const p of payments) {
      paid.set(p.studentId, (paid.get(p.studentId) ?? 0) + Number(p.amount));
      if (!last.has(p.studentId)) last.set(p.studentId, { date: p.paymentDate, amount: Number(p.amount) });
    }
    const seen = new Set<string>();
    const rows = enrolments.filter((e) => !seen.has(e.studentId) && seen.add(e.studentId)).map((e) => {
      const d = due.get(e.studentId) ?? 0;
      const p = paid.get(e.studentId) ?? 0;
      const balance = Math.max(0, d - p);
      const status = exempt.has(e.studentId) && d === 0 ? 'EXEMPT'
        : d === 0 ? 'NO_FEES'
        : balance <= 0 ? 'PAID'
        : p > 0 ? 'PARTIAL' : 'UNPAID';
      return {
        studentId: e.studentId,
        name: e.student.user?.name ?? e.student.admissionNumber,
        admissionNumber: e.student.admissionNumber,
        classId: e.class.id,
        className: e.class.name,
        expected: d,
        paid: p,
        balance,
        status,
        lastPayment: last.get(e.studentId) ?? null,
        parent: e.student.parent
          ? { name: e.student.parent.name, phone: e.student.parent.whatsappNumber, email: e.student.parent.email }
          : null,
      };
    });
    return { academicYear: year, rows: rows.sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name, 'fr')) };
  }

  /**
   * Suivi du recouvrement d'une année scolaire, en temps réel : montant attendu, encaissé, reste à
   * recouvrer, taux de recouvrement, arriérés repris, situation par classe et élèves les plus en
   * retard de paiement.
   */
  async collectionOverview(institutionId: string, academicYear?: string) {
    const year = academicYear || await this.defaultFeeYear(institutionId);
    const [studentFees, payments, enrolments] = await Promise.all([
      this.prisma.studentFee.findMany({
        where: { academicYear: year, isExempt: false, student: { institutionId } },
        select: { studentId: true, amountDue: true, fee: { select: { name: true } } },
      }),
      this.prisma.payment.groupBy({
        by: ['studentId'],
        where: { institutionId, academicYear: year },
        _sum: { amount: true },
      }),
      this.prisma.classStudent.findMany({
        where: { academicYear: year, student: { institutionId } },
        select: { studentId: true, class: { select: { id: true, name: true } }, student: { select: { admissionNumber: true, user: { select: { name: true } } } } },
      }),
    ]);

    const due = new Map<string, number>();
    let arrears = 0;
    for (const sf of studentFees) {
      due.set(sf.studentId, (due.get(sf.studentId) ?? 0) + Number(sf.amountDue));
      if (sf.fee.name === 'Solde antérieur (arriérés)') arrears += Number(sf.amountDue);
    }
    const paid = new Map(payments.map((p) => [p.studentId, Number(p._sum.amount ?? 0)]));
    const info = new Map(enrolments.map((e) => [e.studentId, e]));

    let expected = 0; let collected = 0; let outstanding = 0;
    const counts = { paid: 0, partial: 0, unpaid: 0 };
    const byClass = new Map<string, { classId: string; name: string; expected: number; collected: number; students: number }>();
    const debtors: { studentId: string; name: string; admissionNumber: string; className: string; due: number; paid: number; balance: number }[] = [];
    for (const [studentId, d] of due) {
      if (d <= 0) continue;
      const p = Math.min(paid.get(studentId) ?? 0, d);
      const balance = d - p;
      expected += d; collected += p; outstanding += balance;
      if (balance <= 0) counts.paid++; else if (p > 0) counts.partial++; else counts.unpaid++;
      const e = info.get(studentId);
      const cls = e?.class ?? { id: 'none', name: 'Sans classe' };
      const c = byClass.get(cls.id) ?? { classId: cls.id, name: cls.name, expected: 0, collected: 0, students: 0 };
      c.expected += d; c.collected += p; c.students++;
      byClass.set(cls.id, c);
      if (balance > 0) {
        debtors.push({
          studentId, name: e?.student.user?.name ?? e?.student.admissionNumber ?? '—',
          admissionNumber: e?.student.admissionNumber ?? '', className: cls.name, due: d, paid: p, balance,
        });
      }
    }
    const rate = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
    return {
      academicYear: year,
      expected, collected, outstanding, arrears,
      collectionRate: rate(collected, expected),
      students: counts,
      byClass: [...byClass.values()]
        .map((c) => ({ ...c, rate: rate(c.collected, c.expected) }))
        .sort((a, b) => a.rate - b.rate),
      topDebtors: debtors.sort((a, b) => b.balance - a.balance).slice(0, 15),
    };
  }

  /**
   * Reprise des soldes antérieurs (arriérés d'une période ou d'une année précédente) : chaque montant
   * devient une ligne « Solde antérieur » due par l'élève pour l'année indiquée. Il apparaît alors
   * dans le solde vu par le parent, dans les rappels et dans le suivi du recouvrement.
   * Réimporter le fichier remplace le montant (pas de doublon) ; un montant à 0 annule l'arriéré.
   */
  async importArrears(institutionId: string, academicYear: string, rows: { admissionNumber: string; amount: number; note?: string }[]) {
    const label = 'Solde antérieur (arriérés)';
    let fee = await this.prisma.fee.findFirst({ where: { institutionId, academicYear, name: label } });
    if (!fee) {
      fee = await this.prisma.fee.create({
        data: { institutionId, academicYear, name: label, feeType: 'OTHER' as any, amount: 0 },
      });
    }
    const students = await this.prisma.student.findMany({
      where: { institutionId, admissionNumber: { in: rows.map((r) => r.admissionNumber.trim()) } },
      select: { id: true, admissionNumber: true },
    });
    const byNumber = new Map(students.map((s) => [s.admissionNumber.trim().toLowerCase(), s.id]));

    let imported = 0;
    let cleared = 0;
    const notFound: string[] = [];
    for (const row of rows) {
      const studentId = byNumber.get(row.admissionNumber.trim().toLowerCase());
      if (!studentId) { notFound.push(row.admissionNumber); continue; }
      const existing = await this.prisma.studentFee.findFirst({ where: { studentId, feeId: fee.id, academicYear, term: null } });
      if (row.amount <= 0) {
        if (existing) { await this.prisma.studentFee.delete({ where: { id: existing.id } }); cleared++; }
        continue;
      }
      const data = { amountDue: row.amount };
      if (existing) await this.prisma.studentFee.update({ where: { id: existing.id }, data });
      else await this.prisma.studentFee.create({ data: { studentId, feeId: fee.id, academicYear, term: null, ...data } });
      imported++;
    }
    return { imported, cleared, notFound, feeId: fee.id };
  }

  async assignToClass(feeId: string, dto: AssignFeeDto, institutionId: string) {
    const fee = await this.prisma.fee.findFirst({ where: { id: feeId, institutionId } });
    if (!fee) throw new NotFoundException('Fee not found');

    const enrollments = await this.prisma.classStudent.findMany({
      // The class must belong to this school — otherwise a fee could be charged to another school's students.
      where: { classId: dto.classId, academicYear: dto.academicYear, class: { institutionId } },
      select: { studentId: true },
    });

    if (enrollments.length === 0) return { assigned: 0 };

    await this.prisma.studentFee.createMany({
      data: enrollments.map((e) => ({
        studentId: e.studentId,
        feeId,
        academicYear: dto.academicYear,
        term: dto.term,
        amountDue: fee.amount,
      })),
      skipDuplicates: true,
    });

    return { assigned: enrollments.length };
  }

  async getStudentFeeSummary(studentId: string, institutionId: string, academicYear?: string) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, institutionId } });
    if (!student) throw new NotFoundException('Student not found');

    const studentFees = await this.prisma.studentFee.findMany({
      where: { studentId, ...(academicYear && { academicYear }) },
      include: { fee: { select: { name: true, feeType: true, currency: true } } },
    });

    const payments = await this.prisma.payment.findMany({
      where: { studentId, ...(academicYear && { academicYear }) },
      select: { amount: true, academicYear: true, term: true, paymentDate: true },
    });

    const totalDue = studentFees.filter((sf) => !sf.isExempt).reduce((sum, sf) => sum + Number(sf.amountDue), 0);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = totalDue - totalPaid;

    const hasExemption = studentFees.some((sf) => sf.isExempt);
    const paymentStatus =
      hasExemption && totalDue === 0 ? 'EXEMPT' :
      totalDue === 0 ? 'PAID' :
      totalPaid >= totalDue ? 'PAID' :
      totalPaid > 0 ? 'PARTIAL' : 'UNPAID';

    return { studentFees, payments, totalDue, totalPaid, balance, paymentStatus };
  }

  private async ensureExists(id: string, institutionId: string) {
    const fee = await this.prisma.fee.findFirst({ where: { id, institutionId } });
    if (!fee) throw new NotFoundException('Fee not found');
  }
}
