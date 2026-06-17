import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { MailService } from '../mail/mail.service';

type Severity = 'FRIENDLY' | 'URGENT';

/** Months elapsed since school resumption (assumed Sept 1 of the academic year's first year). */
function monthsSinceResumption(academicYear: string, now = new Date()): number {
  const startYear = parseInt(academicYear?.split('-')[0], 10);
  if (!startYear) return 0;
  const resumption = new Date(startYear, 8, 1); // September 1
  return (now.getFullYear() - resumption.getFullYear()) * 12 + (now.getMonth() - resumption.getMonth());
}

@Injectable()
export class FeeRemindersService {
  private readonly logger = new Logger(FeeRemindersService.name);
  private readonly friendlyAfterMonths: number;
  private readonly urgentAfterMonths: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {
    this.friendlyAfterMonths = Number(config.get('FEE_REMINDER_FRIENDLY_AFTER_MONTHS', '1'));
    this.urgentAfterMonths = Number(config.get('FEE_REMINDER_URGENT_AFTER_MONTHS', '2'));
  }

  /** Tier 1 — friendly weekly reminder, once 1 month has passed since resumption. */
  @Cron('0 9 * * 1', { name: 'fee-reminders-friendly', timeZone: 'Africa/Lome' })
  async sendFriendlyReminders() {
    return this.runReminders('FRIENDLY');
  }

  /** Tier 2 — daily reminder with exclusion warning, once 2 months have passed since resumption. */
  @Cron('0 8 * * *', { name: 'fee-reminders-urgent', timeZone: 'Africa/Lome' })
  async sendUrgentReminders() {
    return this.runReminders('URGENT');
  }

  async triggerReminders(severity: Severity = 'FRIENDLY') {
    return this.runReminders(severity);
  }

  private async runReminders(severity: Severity) {
    this.logger.log(`Running ${severity.toLowerCase()} fee reminders…`);

    try {
      const institutions = await this.prisma.institution.findMany({
        where: { status: 'ACTIVE' as any },
        select: { id: true, name: true },
      });

      let sent = 0;

      for (const institution of institutions) {
        const studentFees = await this.prisma.studentFee.findMany({
          where: { student: { institutionId: institution.id } },
          include: {
            student: {
              include: {
                user: { select: { name: true } },
                parent: { select: { name: true, email: true, whatsappNumber: true, language: true } },
              },
            },
            fee: { select: { name: true, academicYear: true, currency: true } },
          },
        });

        const grouped = new Map<string, typeof studentFees>();
        for (const sf of studentFees) {
          const list = grouped.get(sf.studentId) ?? [];
          list.push(sf);
          grouped.set(sf.studentId, list);
        }

        for (const [studentId, fees] of grouped) {
          const academicYear = fees[0].fee.academicYear;
          const elapsed = monthsSinceResumption(academicYear);

          const threshold = severity === 'URGENT' ? this.urgentAfterMonths : this.friendlyAfterMonths;
          const nextThreshold = severity === 'FRIENDLY' ? this.urgentAfterMonths : Infinity;
          // Friendly tier only fires before the urgent threshold takes over — avoids double-sending the same day.
          if (elapsed < threshold || elapsed >= nextThreshold) continue;

          const totalDue = fees.reduce((s, f) => s + Number(f.amountDue), 0);
          if (totalDue === 0) continue;

          const payments = await this.prisma.payment.findMany({
            where: { studentId, academicYear },
            select: { amount: true },
          });
          const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
          const balance = totalDue - totalPaid;
          if (balance <= 0) continue;

          const student = fees[0].student;
          const studentName = student.user?.name ?? student.admissionNumber;
          const currency = fees[0].fee.currency ?? 'FCFA';
          const balanceLabel = `${balance.toLocaleString('fr-FR')} ${currency}`;
          const parent = student.parent;
          const language = (parent?.language as 'FR' | 'EN' | undefined) ?? 'FR';

          let delivered = false;

          if (parent?.whatsappNumber) {
            const message = this.buildWhatsAppMessage({
              severity,
              parentName: parent.name,
              studentName,
              balanceLabel,
              institutionName: institution.name,
              language,
            });
            const ok = await this.whatsapp.sendText(parent.whatsappNumber, message).catch(() => false);
            delivered = delivered || ok;
          }

          if (parent?.email) {
            const ok = await this.mail.sendFeeReminder({
              to: parent.email,
              parentName: parent.name,
              studentName,
              balance: balanceLabel,
              institutionName: institution.name,
              severity,
              language,
            }).catch(() => false);
            delivered = delivered || ok;
          }

          if (delivered) {
            sent++;
          } else {
            this.logger.debug(`[FEE REMINDER:${severity}] no channel for ${studentName} — ${balanceLabel}`);
          }
        }
      }

      this.logger.log(`${severity} fee reminders sent: ${sent}`);
    } catch (err: any) {
      this.logger.error(`Fee reminder cron failed (${severity})`, err?.message);
    }
  }

  private buildWhatsAppMessage(p: {
    severity: Severity;
    parentName?: string;
    studentName: string;
    balanceLabel: string;
    institutionName: string;
    language: 'FR' | 'EN';
  }): string {
    const en = p.language === 'EN';
    const greeting = p.parentName ? `${en ? 'Hello' : 'Bonjour'} ${p.parentName},` : (en ? 'Hello,' : 'Bonjour,');

    if (p.severity === 'URGENT') {
      return en
        ? [
            `⚠️ *IMPORTANT NOTICE*`,
            greeting,
            `School fees for *${p.studentName}* remain unpaid (*${p.balanceLabel}*) for more than two months.`,
            `Without prompt payment, the school reserves the right to exclude the student in accordance with its internal regulations.`,
            `Please settle this matter urgently to avoid this measure.`,
            `🏫 ${p.institutionName}`,
          ].join('\n\n')
        : [
            `⚠️ *AVIS IMPORTANT*`,
            greeting,
            `Les frais scolaires de *${p.studentName}* restent impayés (*${p.balanceLabel}*) depuis plus de deux mois.`,
            `Sans régularisation rapide, l'établissement se réserve le droit d'exclure l'élève conformément à son règlement intérieur.`,
            `Merci de régulariser la situation dans les plus brefs délais pour éviter cette mesure.`,
            `🏫 ${p.institutionName}`,
          ].join('\n\n');
    }

    return en
      ? [
          greeting,
          `This is a friendly reminder that school fees for *${p.studentName}* have not yet been settled (*${p.balanceLabel}* outstanding).`,
          `Please make payment as soon as possible so your child can continue to enjoy all school services.`,
          `🏫 ${p.institutionName}`,
        ].join('\n\n')
      : [
          greeting,
          `Nous vous rappelons amicalement que les frais scolaires de *${p.studentName}* ne sont pas encore réglés (*${p.balanceLabel}* restant).`,
          `Merci de procéder au paiement dans les meilleurs délais.`,
          `🏫 ${p.institutionName}`,
        ].join('\n\n');
  }
}
