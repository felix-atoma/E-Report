import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordPaymentDto } from './dto/record-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

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

  private async generateReceiptNumber(institutionId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.payment.count({
      where: { institutionId, createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `REC-${year}-${seq}`;
  }
}
