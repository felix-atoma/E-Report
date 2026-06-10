import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { NotchpayService } from './notchpay.service';
import { PdfService } from '../pdf/pdf.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notchpay: NotchpayService,
    private readonly pdf: PdfService,
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

    const receiptNumber = await this.generateReceiptNumber(institutionId);
    const now = new Date();
    const defaultYear = `${now.getFullYear() - (now.getMonth() < 8 ? 1 : 0)}-${now.getFullYear() + (now.getMonth() >= 8 ? 1 : 0)}`;
    const academicYear = dto.academicYear || defaultYear;

    const payment = await this.prisma.payment.create({
      data: {
        studentId: dto.studentId,
        academicYear,
        term: dto.term,
        amount: new Prisma.Decimal(dto.amount),
        paymentMethod: dto.paymentMethod as any,
        referenceNumber: dto.referenceNumber,
        receiptNumber,
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

    const totalDue = studentFees.reduce((sum, sf) => sum + Number(sf.amountDue), 0);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = totalDue - totalPaid;
    const hasExemption = studentFees.some((sf) => sf.isExempt);

    const status =
      hasExemption ? 'EXEMPT' :
      totalDue === 0 ? 'PAID' :
      totalPaid >= totalDue ? 'PAID' :
      totalPaid > 0 ? 'PARTIAL' : 'UNPAID';

    return { studentId, academicYear, term, totalDue, totalPaid, balance, status };
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
      where: { id: studentId, institutionId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const { status, balance } = await this.getStudentPaymentStatus(studentId, institutionId, academicYear, term);
    if (status === 'PAID' || status === 'EXEMPT') {
      throw new BadRequestException('Les frais sont déjà à jour pour cet élève.');
    }
    if (balance <= 0) throw new BadRequestException('Aucun solde impayé.');

    const { url, reference } = await this.notchpay.createTransaction({
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
    // Verify signature
    const rawBody = JSON.stringify(body);
    if (!this.notchpay.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn('Notchpay webhook signature mismatch — rejected');
      return { received: false };
    }

    const event: string = body?.event;
    if (event !== 'payment.complete') return { received: true };

    const reference: string = body?.data?.reference ?? body?.data?.payment?.reference;
    if (!reference) return { received: true };

    // Idempotency — skip if already processed
    const existing = await this.prisma.payment.findFirst({ where: { notchpayReference: reference } });
    if (existing) return { received: true };

    // Verify with Notchpay API
    const { complete, amount, metadata } = await this.notchpay.verifyTransaction(reference);
    if (!complete) return { received: true };

    const intent = await this.prisma.paymentIntent.findFirst({ where: { notchpayReference: reference } });
    if (!intent) {
      this.logger.warn(`No PaymentIntent for Notchpay reference ${reference}`);
      return { received: true };
    }

    await this.prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: 'COMPLETED' } });

    const receiptNumber = await this.generateReceiptNumber(intent.institutionId);
    const payment = await this.prisma.payment.create({
      data: {
        studentId: intent.studentId,
        institutionId: intent.institutionId,
        academicYear: intent.academicYear,
        term: intent.term ?? undefined,
        amount,
        paymentMethod: 'MOBILE_MONEY_ONLINE',
        receiptNumber,
        paymentDate: new Date(),
        notes: `Paiement en ligne Notchpay — ${reference}`,
        recordedById: intent.parentUserId,
        notchpayReference: reference,
      },
    });

    await this.tryReleaseHeldNotifications(
      intent.studentId, intent.academicYear, intent.term ?? undefined, intent.institutionId,
    );

    this.logger.log(`Notchpay webhook processed: payment ${payment.id} for student ${intent.studentId}`);
    return { received: true };
  }

  async generateReceipt(id: string, institutionId: string): Promise<Buffer> {
    const payment = await this.prisma.payment.findFirst({
      where: { id, institutionId },
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
    const studentName = payment.student.user?.name ?? payment.student.admissionNumber;
    const className   = payment.student.classes?.[0]?.class?.name ?? '—';
    const schoolName  = payment.institution.name;
    const amount      = fmt(Number(payment.amount));

    const METHOD_LABELS: Record<string, string> = {
      CASH: 'Espèces', BANK_TRANSFER: 'Virement bancaire',
      MOMO: 'Mobile Money', CHECK: 'Chèque',
      CARD: 'Carte bancaire', OTHER: 'Autre',
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
      ${payment.institution.logo ? `<img class="header__logo" src="${payment.institution.logo}" />` : ''}
      <div>
        <div class="header__school">${schoolName}</div>
        <div class="header__school-sub">${payment.institution.address ?? ''} ${payment.institution.phone ? '· ' + payment.institution.phone : ''}</div>
      </div>
    </div>
    <div class="header__right">
      <div class="receipt-title">Reçu de paiement</div>
      <div class="receipt-num">N° ${payment.receiptNumber}</div>
      <div class="receipt-num">${date}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Élève</div>
    <div class="row"><span class="row__label">Nom complet</span><span class="row__value">${studentName}</span></div>
    <div class="row"><span class="row__label">Classe</span><span class="row__value">${className}</span></div>
    <div class="row"><span class="row__label">Année scolaire</span><span class="row__value">${payment.academicYear}</span></div>
    ${payment.term ? `<div class="row"><span class="row__label">Trimestre</span><span class="row__value">${payment.term}</span></div>` : ''}
  </div>

  <div class="amount-box">
    <div class="amount-box__label">Montant payé</div>
    <div class="amount-box__value">${amount} FCFA</div>
  </div>

  <div class="section">
    <div class="section-title">Détails du paiement</div>
    <div class="row"><span class="row__label">Mode de paiement</span><span class="row__value">${METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}</span></div>
    ${payment.referenceNumber ? `<div class="row"><span class="row__label">Référence</span><span class="row__value">${payment.referenceNumber}</span></div>` : ''}
    <div class="row"><span class="row__label">Enregistré par</span><span class="row__value">${payment.recordedBy?.name ?? '—'}</span></div>
    ${payment.notes ? `<div class="row"><span class="row__label">Notes</span><span class="row__value">${payment.notes}</span></div>` : ''}
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

  private async generateReceiptNumber(institutionId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.payment.count({
      where: { institutionId, createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `REC-${year}-${seq}`;
  }
}
