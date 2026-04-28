import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(institutionId: string) {
    const [students, classes, teachers, subjects, publishedReports, heldNotifications] =
      await Promise.all([
        this.prisma.student.count({ where: { institutionId } }),
        this.prisma.class.count({ where: { institutionId, isActive: true } }),
        this.prisma.user.count({ where: { institutionId, role: 'TEACHER', isActive: true } }),
        this.prisma.subject.count({ where: { institutionId, isActive: true } }),
        this.prisma.reportCard.count({ where: { class: { institutionId }, status: 'PUBLISHED' } }),
        this.prisma.notificationLog.count({
          where: { status: { in: ['HELD_UNPAID', 'HELD_PARTIAL'] }, student: { institutionId } },
        }),
      ]);

    return { students, classes, teachers, subjects, publishedReports, heldNotifications };
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
}
