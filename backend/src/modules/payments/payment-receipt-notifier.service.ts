import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { SmsService } from '../sms/sms.service';
import { MailService } from '../mail/mail.service';

/**
 * Reçu numérique envoyé au parent dès qu'un paiement est enregistré (économat, Mobile Money en
 * ligne) : WhatsApp, SMS (si configuré) et e-mail, avec le solde restant de l'année. Le parent a
 * toujours une preuve de paiement : plus de reçu papier perdu ni de contestation.
 * Ne bloque jamais l'enregistrement du paiement : les erreurs d'envoi sont seulement journalisées.
 */
@Injectable()
export class PaymentReceiptNotifier {
  private readonly logger = new Logger(PaymentReceiptNotifier.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly sms: SmsService,
    private readonly mail: MailService,
  ) {}

  /** Lance l'envoi en arrière-plan */
  notify(paymentId: string): void {
    this.send(paymentId).catch((err) => this.logger.warn(`Reçu non envoyé pour ${paymentId} : ${err?.message ?? err}`));
  }

  private async send(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        institution: { select: { name: true } },
        student: {
          include: {
            user: { select: { name: true } },
            parent: { select: { name: true, email: true, whatsappNumber: true, language: true } },
          },
        },
      },
    });
    if (!payment) return;
    const parent = payment.student.parent;
    if (!parent) return;

    // Solde restant de l'année scolaire après ce paiement
    const [fees, paid] = await Promise.all([
      this.prisma.studentFee.findMany({
        where: { studentId: payment.studentId, academicYear: payment.academicYear, isExempt: false },
        select: { amountDue: true, fee: { select: { currency: true } } },
      }),
      this.prisma.payment.aggregate({
        where: { studentId: payment.studentId, academicYear: payment.academicYear },
        _sum: { amount: true },
      }),
    ]);
    const due = fees.reduce((s, f) => s + Number(f.amountDue), 0);
    const balance = Math.max(0, due - Number(paid._sum.amount ?? 0));
    const currency = fees[0]?.fee?.currency === 'XOF' || !fees[0] ? 'FCFA' : fees[0].fee.currency;
    const money = (v: number) => `${Math.round(v).toLocaleString('fr-FR')} ${currency}`;

    const en = parent.language === 'EN';
    const studentName = payment.student.user?.name ?? payment.student.admissionNumber;
    const date = payment.paymentDate.toLocaleDateString(en ? 'en-GB' : 'fr-FR');
    const school = payment.institution.name;
    const lines = en
      ? [
        `✅ Payment received — ${school}`,
        `${money(Number(payment.amount))} for ${studentName} on ${date}.`,
        `Receipt no. ${payment.receiptNumber}`,
        balance > 0 ? `Remaining balance for ${payment.academicYear}: ${money(balance)}.` : `School fees for ${payment.academicYear} are fully paid. Thank you!`,
      ]
      : [
        `✅ Paiement reçu — ${school}`,
        `${money(Number(payment.amount))} pour ${studentName} le ${date}.`,
        `Reçu n° ${payment.receiptNumber}`,
        balance > 0 ? `Solde restant ${payment.academicYear} : ${money(balance)}.` : `Les frais ${payment.academicYear} sont entièrement réglés. Merci !`,
      ];

    const sent: string[] = [];
    if (parent.whatsappNumber) {
      if (await this.whatsapp.sendText(parent.whatsappNumber, lines.join('\n')).catch(() => false)) sent.push('WhatsApp');
      if (this.sms.enabled && await this.sms.sendText(parent.whatsappNumber, lines.join(' ')).catch(() => false)) sent.push('SMS');
    }
    if (parent.email) {
      if (await this.mail.sendPaymentReceipt(parent.email, `${en ? 'Payment receipt' : 'Reçu de paiement'} ${payment.receiptNumber} — ${school}`, lines).catch(() => false)) sent.push('e-mail');
    }
    this.logger.log(`Reçu ${payment.receiptNumber} : ${sent.length ? sent.join(', ') : 'aucun canal disponible'}`);
  }
}
