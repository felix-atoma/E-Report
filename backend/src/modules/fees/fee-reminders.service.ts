import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class FeeRemindersService {
  private readonly logger = new Logger(FeeRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  // Every Monday at 9:00 AM Togo time
  @Cron('0 9 * * 1', { name: 'fee-reminders', timeZone: 'Africa/Lomé' })
  async sendFeeReminders() {
    this.logger.log('Running weekly fee reminders…');

    try {
      const institutions = await this.prisma.institution.findMany({
        where: { status: 'ACTIVE' as any },
        select: { id: true, name: true },
      });

      let sent = 0;

      for (const institution of institutions) {
        // Load all student fees with student + parent info
        const studentFees = await this.prisma.studentFee.findMany({
          where: { student: { institutionId: institution.id } },
          include: {
            student: {
              include: {
                user:   { select: { name: true } },
                parent: { select: { name: true, whatsappNumber: true } },
              },
            },
            fee: { select: { name: true, academicYear: true, currency: true } },
          },
        });

        // Group by studentId
        const grouped = new Map<string, typeof studentFees>();
        for (const sf of studentFees) {
          const list = grouped.get(sf.studentId) ?? [];
          list.push(sf);
          grouped.set(sf.studentId, list);
        }

        for (const [studentId, fees] of grouped) {
          const totalDue = fees.reduce((s, f) => s + Number(f.amountDue), 0);
          if (totalDue === 0) continue;

          const payments = await this.prisma.payment.findMany({
            where: { studentId },
            select: { amount: true },
          });
          const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
          const balance = totalDue - totalPaid;

          if (balance <= 0) continue;

          const student     = fees[0].student;
          const studentName = student.user?.name ?? student.admissionNumber;
          const currency    = fees[0].fee.currency ?? 'FCFA';
          const parentPhone = student.parent?.whatsappNumber;

          if (!parentPhone) continue;

          const ok = await this.whatsapp.sendBulletinReady({
            phone: parentPhone,
            studentName,
            termName: '',
            academicYear: fees[0].fee.academicYear,
            average: `${balance.toLocaleString('fr-FR')} ${currency} impayé`,
            mention: '',
            institutionName: institution.name,
            pdfUrl: null,
          } as any).catch(() => false);

          if (!ok) {
            this.logger.debug(`[FEE REMINDER] ${parentPhone} — ${studentName} — ${balance} ${currency}`);
          } else {
            sent++;
          }
        }
      }

      this.logger.log(`Fee reminders sent: ${sent}`);
    } catch (err: any) {
      this.logger.error('Fee reminder cron failed', err?.message);
    }
  }

  async triggerReminders() {
    return this.sendFeeReminders();
  }
}
