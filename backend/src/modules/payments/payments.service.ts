import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { NotchpayService } from './notchpay.service';
import { CinetpayService } from './cinetpay.service';
import { PdfService } from '../pdf/pdf.service';
import { PaymentReceiptNotifier } from './payment-receipt-notifier.service';
import { decryptSecret } from '../../common/utils/crypto.util';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notchpay: NotchpayService,
    private readonly cinetpay: CinetpayService,
    private readonly pdf: PdfService,
    private readonly receipts: PaymentReceiptNotifier,
  ) {}

  /** STUDENT: their own payment history */
  async findForStudent(userId: string, institutionId: string) {
    const student = await this.prisma.student.findFirst({
      where: { userId, institutionId },
      select: { id: true },
    });
    if (!student) return [];
    return this.prisma.payment.findMany({
      where: { studentId: student.id, institutionId },
      select: {
        id: true, academicYear: true, term: true,
        amount: true, paymentMethod: true, receiptNumber: true, paymentDate: true,
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  /** PARENT: payment history for all their children */
  async findForParent(parentUserId: string, institutionId: string) {
    const children = await this.prisma.student.findMany({
      where: { parentId: parentUserId, institutionId },
      select: { id: true, user: { select: { name: true } } },
    });
    if (!children.length) return [];
    const ids = children.map((c) => c.id);
    const payments = await this.prisma.payment.findMany({
      where: { studentId: { in: ids }, institutionId },
      select: {
        id: true, studentId: true, academicYear: true, term: true,
        amount: true, paymentMethod: true, receiptNumber: true, paymentDate: true,
      },
      orderBy: { paymentDate: 'desc' },
    });
    const nameMap = Object.fromEntries(children.map((c) => [c.id, c.user?.name ?? c.id]));
    return payments.map((p) => ({ ...p, studentName: nameMap[p.studentId] }));
  }

  async findAll(institutionId: string, filters: { studentId?: string; academicYear?: string; term?: string }) {
    return this.prisma.payment.findMany({
      where: {
        institutionId,
        ...(filters.studentId && { studentId: filters.studentId }),
        ...(filters.academicYear && { academicYear: filters.academicYear }),
        ...(filters.term && { term: filters.term }),
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
        recordedBy: { select: { id: true, name: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async findOne(id: string, institutionId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, institutionId },
      include: {
        student: { include: { user: { select: { name: true } } } },
        recordedBy: { select: { id: true, name: true } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async record(dto: RecordPaymentDto, institutionId: string, recordedById: string) {
    const student = await this.prisma.student.findFirst({ where: { id: dto.studentId, institutionId } });
    if (!student) throw new NotFoundException('Student not found');

    const now = new Date();
    const defaultYear = `${now.getFullYear() - (now.getMonth() < 8 ? 1 : 0)}-${now.getFullYear() + (now.getMonth() >= 8 ? 1 : 0)}`;
    const academicYear = dto.academicYear || defaultYear;

    const payment = await this.createPaymentWithReceipt(institutionId, {
      data: {
        studentId: dto.studentId,
        academicYear,
        term: dto.term,
        amount: new Prisma.Decimal(dto.amount),
        paymentMethod: dto.paymentMethod as any,
        referenceNumber: dto.referenceNumber,
        receiptNumber: '',
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
        notes: dto.notes,
        recordedById,
        institutionId,
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
        recordedBy: { select: { id: true, name: true } },
      },
    });

    // Auto-release any held notifications if student is now fully paid
    await this.tryReleaseHeldNotifications(dto.studentId, academicYear, dto.term, institutionId);
    // Reçu numérique au parent (WhatsApp, SMS, e-mail) avec le solde restant
    this.receipts.notify(payment.id);

    return payment;
  }

  async getStudentPaymentStatus(studentId: string, institutionId: string, academicYear: string, term?: string) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, institutionId } });
    if (!student) throw new NotFoundException('Student not found');

    const studentFees = await this.prisma.studentFee.findMany({
      where: { studentId, academicYear, ...(term && { term }) },
    });

    const payments = await this.prisma.payment.findMany({
      where: { studentId, academicYear, ...(term && { term }) },
      select: { amount: true },
    });

    // Exempted fee lines are not owed; the student is EXEMPT only when nothing else is due
    // (one exempted fee used to mark the whole account EXEMPT and release held bulletins).
    const totalDue = studentFees.filter((sf) => !sf.isExempt).reduce((sum, sf) => sum + Number(sf.amountDue), 0);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = totalDue - totalPaid;
    const hasExemption = studentFees.some((sf) => sf.isExempt);

    const status =
      hasExemption && totalDue === 0 ? 'EXEMPT' :
      totalDue === 0 ? 'PAID' :
      totalPaid >= totalDue ? 'PAID' :
      totalPaid > 0 ? 'PARTIAL' : 'UNPAID';

    return { studentId, academicYear, term, totalDue, totalPaid, balance, status };
  }

  async getMyChildPaymentStatus(
    studentId: string,
    parentUserId: string,
    institutionId: string,
    academicYear: string,
    term?: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, parentId: parentUserId, institutionId },
    });
    if (!student) throw new NotFoundException('Student not found');

    return this.getStudentPaymentStatus(studentId, institutionId, academicYear, term);
  }

  private async tryReleaseHeldNotifications(
    studentId: string,
    academicYear: string,
    term: string | undefined,
    institutionId: string,
  ) {
    const { status } = await this.getStudentPaymentStatus(studentId, institutionId, academicYear, term);
    if (status !== 'PAID' && status !== 'EXEMPT') return;

    await this.prisma.notificationLog.updateMany({
      where: {
        studentId,
        status: { in: ['HELD_UNPAID', 'HELD_PARTIAL'] },
      },
      data: { status: 'PENDING', heldReason: null },
    });
  }

  async initiateOnlinePayment(
    studentId: string,
    institutionId: string,
    academicYear: string,
    term: string | undefined,
    parentUserId: string,
    parentName: string,
    parentEmail: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, institutionId, parentId: parentUserId }, // only the parent's own child
    });
    if (!student) throw new NotFoundException('Student not found');

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { notchpayPublicKey: true },
    });
    if (!institution?.notchpayPublicKey) {
      throw new BadRequestException(
        "Le paiement en ligne n'est pas encore configuré par votre école. Contactez l'administration.",
      );
    }

    const { status, balance } = await this.getStudentPaymentStatus(studentId, institutionId, academicYear, term);
    if (status === 'PAID' || status === 'EXEMPT') {
      throw new BadRequestException('Les frais sont déjà à jour pour cet élève.');
    }
    if (balance <= 0) throw new BadRequestException('Aucun solde impayé.');

    const { url, reference } = await this.notchpay.createTransaction(institution.notchpayPublicKey, {
      studentId,
      institutionId,
      academicYear,
      term,
      amount: balance,
      parentName,
      parentEmail,
    });

    await this.prisma.paymentIntent.create({
      data: {
        notchpayReference: reference,
        studentId,
        institutionId,
        academicYear,
        term,
        amount: balance,
        parentUserId,
      },
    });

    return { url, amount: balance, reference };
  }

  async handleNotchpayWebhook(body: any, signature: string) {
    const event: string = body?.event;
    if (event !== 'payment.complete') return { received: true };

    const reference: string = body?.data?.reference ?? body?.data?.payment?.reference;
    if (!reference) return { received: true };

    // Idempotency — skip if already processed
    const existing = await this.prisma.payment.findFirst({ where: { notchpayReference: reference } });
    if (existing) return { received: true };

    const intent = await this.prisma.paymentIntent.findFirst({ where: { notchpayReference: reference } });
    if (!intent) {
      this.logger.warn(`No PaymentIntent for Notchpay reference ${reference}`);
      return { received: true };
    }

    const institution = await this.prisma.institution.findUnique({
      where: { id: intent.institutionId },
      select: { notchpayPublicKey: true, notchpayHashKeyEnc: true },
    });
    if (!institution?.notchpayPublicKey) {
      this.logger.warn(`Institution ${intent.institutionId} has no Notchpay key — rejecting webhook`);
      return { received: true };
    }

    const hashKey = institution.notchpayHashKeyEnc ? decryptSecret(institution.notchpayHashKeyEnc) : '';
    const rawBody = JSON.stringify(body);
    if (!this.notchpay.verifyWebhookSignature(rawBody, signature, hashKey)) {
      this.logger.warn('Notchpay webhook signature mismatch — rejected');
      return { received: false };
    }

    // Verify with Notchpay API using the school's own key
    const { complete, amount } = await this.notchpay.verifyTransaction(institution.notchpayPublicKey, reference);
    if (!complete) return { received: true };

    await this.prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: 'COMPLETED' } });

    const payment = await this.createPaymentWithReceipt(intent.institutionId, {
      data: {
        studentId: intent.studentId,
        institutionId: intent.institutionId,
        academicYear: intent.academicYear,
        term: intent.term ?? undefined,
        amount,
        paymentMethod: 'MOBILE_MONEY_ONLINE',
        receiptNumber: '',
        paymentDate: new Date(),
        notes: `Paiement en ligne Notchpay — ${reference}`,
        recordedById: intent.parentUserId,
        notchpayReference: reference,
      },
    });

    await this.tryReleaseHeldNotifications(
      intent.studentId, intent.academicYear, intent.term ?? undefined, intent.institutionId,
    );
    this.receipts.notify(payment.id);

    this.logger.log(`Notchpay webhook processed: payment ${payment.id} for student ${intent.studentId}`);
    return { received: true };
  }

  async initiateOnlineCinetpayPayment(
    studentId: string,
    institutionId: string,
    academicYear: string,
    term: string | undefined,
    parentUserId: string,
    parentName: string,
    parentEmail: string,
  ) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, institutionId, parentId: parentUserId } });
    if (!student) throw new NotFoundException('Student not found');

    const { status, balance } = await this.getStudentPaymentStatus(studentId, institutionId, academicYear, term);
    if (status === 'PAID' || status === 'EXEMPT') {
      throw new BadRequestException('Les frais sont déjà à jour pour cet élève.');
    }
    if (balance <= 0) throw new BadRequestException('Aucun solde impayé.');

    const { url, transactionId } = await this.cinetpay.initiatePayment({
      studentId,
      institutionId,
      academicYear,
      term,
      amount: balance,
      parentName,
      parentEmail,
    });

    await this.prisma.paymentIntent.create({
      data: {
        cinetpayTransactionId: transactionId,
        studentId,
        institutionId,
        academicYear,
        term,
        amount: balance,
        parentUserId,
      },
    });

    return { url, amount: balance, transactionId };
  }

  async handleCinetpayWebhook(transactionId: string, result: string) {
    if (result !== '00') return { received: true };

    const existing = await this.prisma.payment.findFirst({
      where: { notchpayReference: `CINETPAY-${transactionId}` },
    });
    if (existing) return { received: true };

    const { status, amount } = await this.cinetpay.verifyPayment(transactionId);
    if (status !== 'ACCEPTED') return { received: true };

    const intent = await this.prisma.paymentIntent.findFirst({
      where: { cinetpayTransactionId: transactionId },
    });
    if (!intent) {
      this.logger.warn(`No PaymentIntent for CinetPay transaction ${transactionId}`);
      return { received: true };
    }

    await this.prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: 'COMPLETED' } });

    const payment = await this.createPaymentWithReceipt(intent.institutionId, {
      data: {
        studentId: intent.studentId,
        institutionId: intent.institutionId,
        academicYear: intent.academicYear,
        term: intent.term ?? undefined,
        amount,
        paymentMethod: 'MOBILE_MONEY_ONLINE',
        receiptNumber: '',
        paymentDate: new Date(),
        notes: `Paiement en ligne CinetPay — ${transactionId}`,
        recordedById: intent.parentUserId,
        notchpayReference: `CINETPAY-${transactionId}`,
      },
    });

    await this.tryReleaseHeldNotifications(
      intent.studentId, intent.academicYear, intent.term ?? undefined, intent.institutionId,
    );
    this.receipts.notify(payment.id);

    this.logger.log(`CinetPay webhook processed: payment ${payment.id} for student ${intent.studentId}`);
    return { received: true };
  }

  async generateReceipt(id: string, institutionId: string, viewer?: { id: string; role: string }): Promise<Buffer> {
    // Parents and students only get their own family's receipts.
    const ownership =
      viewer?.role === 'PARENT' ? { student: { parentId: viewer.id } } :
      viewer?.role === 'STUDENT' ? { student: { userId: viewer.id } } : {};
    const payment = await this.prisma.payment.findFirst({
      where: { id, institutionId, ...ownership },
      include: {
        student: {
          include: {
            user: { select: { name: true } },
            classes: { include: { class: { select: { name: true } } }, take: 1 },
          },
        },
        institution: { select: { name: true, address: true, phone: true, email: true, logo: true } },
        recordedBy: { select: { name: true } },
      },
    });
    if (!payment) throw new NotFoundException('Paiement introuvable');

    const fmt = (n: number) => n.toLocaleString('fr-FR');
    const date = new Date(payment.paymentDate).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    // Everything typed by users is escaped before going into the HTML rendered by the PDF browser.
    const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
    const studentName = esc(payment.student.user?.name ?? payment.student.admissionNumber);
    const className   = esc(payment.student.classes?.[0]?.class?.name ?? '—');
    const schoolName  = esc(payment.institution.name);
    const amount      = fmt(Number(payment.amount));

    const METHOD_LABELS: Record<string, string> = {
      CASH: 'Espèces', BANK_TRANSFER: 'Virement bancaire', CHEQUE: 'Chèque',
      MOBILE_MONEY_TMONEY: 'Mobile Money (T-Money)', MOBILE_MONEY_FLOOZ: 'Mobile Money (Flooz)',
      MOBILE_MONEY_MOMO: 'Mobile Money (MoMo)', MOBILE_MONEY_ONLINE: 'Paiement en ligne', OTHER: 'Autre',
    };

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #111; background:#fff; }
  .page { width: 100%; max-width: 680px; margin: 0 auto; padding: 28px 32px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1e3a8a; padding-bottom: 14px; margin-bottom: 20px; }
  .header__left { display: flex; align-items: center; gap: 14px; }
  .header__logo { width: 64px; height: 64px; object-fit: contain; }
  .header__school { font-size: 18px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; }
  .header__school-sub { font-size: 11px; color: #555; margin-top: 2px; }
  .header__right { text-align: right; }
  .receipt-title { font-size: 22px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 1px; }
  .receipt-num { font-size: 11px; color: #555; margin-top: 3px; font-family: monospace; }
  .section { margin-bottom: 18px; }
  .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px; color: #1e3a8a; border-bottom: 1px solid #dbeafe; padding-bottom: 4px; margin-bottom: 10px; }
  .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f3f4f6; }
  .row:last-child { border-bottom: none; }
  .row__label { color: #555; font-weight: 600; }
  .row__value { font-weight: 700; text-align: right; }
  .amount-box { background: #1e3a8a; color: #fff; border-radius: 8px; padding: 16px 24px; text-align: center; margin: 20px 0; }
  .amount-box__label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.85; }
  .amount-box__value { font-size: 32px; font-weight: 900; margin-top: 4px; }
  .footer { text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 24px; }
  .stamp-zone { text-align: right; margin-top: 28px; }
  .stamp-zone__label { font-size: 10px; color: #555; margin-bottom: 40px; }
  .stamp-zone__line { border-top: 1px solid #374151; width: 160px; margin-left: auto; }
  .stamp-zone__sig { font-size: 10px; color: #555; text-align: center; margin-top: 4px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header__left">
      ${payment.institution.logo ? `<img class="header__logo" src="${esc(payment.institution.logo)}" />` : ''}
      <div>
        <div class="header__school">${schoolName}</div>
        <div class="header__school-sub">${esc(payment.institution.address)} ${payment.institution.phone ? '· ' + esc(payment.institution.phone) : ''}</div>
      </div>
    </div>
    <div class="header__right">
      <div class="receipt-title">Reçu de paiement</div>
      <div class="receipt-num">N° ${esc(payment.receiptNumber)}</div>
      <div class="receipt-num">${date}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Élève</div>
    <div class="row"><span class="row__label">Nom complet</span><span class="row__value">${studentName}</span></div>
    <div class="row"><span class="row__label">Classe</span><span class="row__value">${className}</span></div>
    <div class="row"><span class="row__label">Année scolaire</span><span class="row__value">${esc(payment.academicYear)}</span></div>
    ${payment.term ? `<div class="row"><span class="row__label">Trimestre</span><span class="row__value">${esc(payment.term)}</span></div>` : ''}
  </div>

  <div class="amount-box">
    <div class="amount-box__label">Montant payé</div>
    <div class="amount-box__value">${amount} FCFA</div>
  </div>

  <div class="section">
    <div class="section-title">Détails du paiement</div>
    <div class="row"><span class="row__label">Mode de paiement</span><span class="row__value">${METHOD_LABELS[payment.paymentMethod] ?? esc(payment.paymentMethod)}</span></div>
    ${payment.referenceNumber ? `<div class="row"><span class="row__label">Référence</span><span class="row__value">${esc(payment.referenceNumber)}</span></div>` : ''}
    <div class="row"><span class="row__label">Enregistré par</span><span class="row__value">${esc(payment.recordedBy?.name ?? '—')}</span></div>
    ${payment.notes ? `<div class="row"><span class="row__label">Notes</span><span class="row__value">${esc(payment.notes)}</span></div>` : ''}
  </div>

  <div class="stamp-zone">
    <div class="stamp-zone__label">Cachet et signature</div>
    <div class="stamp-zone__line"></div>
    <div class="stamp-zone__sig">Le caissier / La caissière</div>
  </div>

  <div class="footer">
    Ce reçu est un document officiel émis par ${schoolName}. Conservez-le précieusement.
    Généré par NovaBulletin · ${new Date().toLocaleDateString('fr-FR')}
  </div>
</div>
</body>
</html>`;

    return this.pdf.generateFromHtml(html);
  }

  /**
   * receiptNumber is unique across the whole platform, so each school gets its own prefix
   * (REC-2026-3852-00001); otherwise the second school to record a payment in a year collided.
   */
  private async generateReceiptNumber(institutionId: string, offset = 0): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.payment.count({
      where: { institutionId, createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    const seq = String(count + 1 + offset).padStart(5, '0');
    return `REC-${year}-${institutionId.replace(/-/g, '').slice(0, 4).toUpperCase()}-${seq}`;
  }

  /** Creates a payment with a fresh receipt number, retrying if two payments were recorded at the same moment. */
  private async createPaymentWithReceipt<T extends Prisma.PaymentCreateArgs>(
    institutionId: string,
    args: T,
  ): Promise<Prisma.PaymentGetPayload<T>> {
    for (let attempt = 0; ; attempt++) {
      const receiptNumber = await this.generateReceiptNumber(institutionId, attempt);
      try {
        return (await this.prisma.payment.create({
          ...args,
          data: { ...args.data, receiptNumber },
        } as any)) as any;
      } catch (e: any) {
        const receiptClash = e?.code === 'P2002' && String(e?.meta?.target ?? '').includes('receiptNumber');
        if (!receiptClash || attempt >= 5) throw e;
      }
    }
  }
}
