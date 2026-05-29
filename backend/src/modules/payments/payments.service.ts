import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { FedaPayService } from './fedapay.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fedaPay: FedaPayService,
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

    const { url, fedapayId } = await this.fedaPay.createTransaction({
      studentId,
      institutionId,
      academicYear,
      term,
      amount: balance,
      parentName,
      parentEmail,
    });

    await this.prisma.paymentIntent.create({
      data: { fedapayId, studentId, institutionId, academicYear, term, amount: balance, parentUserId },
    });

    return { url, amount: balance, fedapayId };
  }

  async handleFedapayWebhook(body: any) {
    const event = body?.event;
    if (event !== 'transaction.approved') return { received: true };

    const fedapayId: number = body?.data?.object?.id;
    if (!fedapayId) return { received: true };

    // Idempotency — skip if already processed
    const existing = await this.prisma.payment.findUnique({ where: { fedapayTransactionId: fedapayId } });
    if (existing) return { received: true };

    // Verify with FedaPay API
    const { approved, amount, metadata } = await this.fedaPay.verifyTransaction(fedapayId);
    if (!approved) return { received: true };

    const intent = await this.prisma.paymentIntent.findUnique({ where: { fedapayId } });
    if (!intent) {
      this.logger.warn(`No PaymentIntent found for FedaPay transaction ${fedapayId}`);
      return { received: true };
    }

    await this.prisma.paymentIntent.update({ where: { fedapayId }, data: { status: 'COMPLETED' } });

    const receiptNumber = await this.generateReceiptNumber(intent.institutionId);
    const payment = await this.prisma.payment.create({
      data: {
        studentId: intent.studentId,
        institutionId: intent.institutionId,
        academicYear: intent.academicYear,
        term: intent.term ?? undefined,
        amount: amount,
        paymentMethod: 'MOBILE_MONEY_ONLINE',
        receiptNumber,
        paymentDate: new Date(),
        notes: `Paiement en ligne FedaPay #${fedapayId}`,
        recordedById: intent.parentUserId,
        fedapayTransactionId: fedapayId,
      },
    });

    await this.tryReleaseHeldNotifications(
      intent.studentId, intent.academicYear, intent.term ?? undefined, intent.institutionId,
    );

    this.logger.log(`FedaPay webhook processed: payment ${payment.id} for student ${intent.studentId}`);
    return { received: true };
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
