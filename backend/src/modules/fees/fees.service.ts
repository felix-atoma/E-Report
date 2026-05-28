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

  async assignToClass(feeId: string, dto: AssignFeeDto, institutionId: string) {
    const fee = await this.prisma.fee.findFirst({ where: { id: feeId, institutionId } });
    if (!fee) throw new NotFoundException('Fee not found');

    const enrollments = await this.prisma.classStudent.findMany({
      where: { classId: dto.classId, academicYear: dto.academicYear },
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

    const totalDue = studentFees.reduce((sum, sf) => sum + Number(sf.amountDue), 0);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = totalDue - totalPaid;

    const hasExemption = studentFees.some((sf) => sf.isExempt);
    const paymentStatus =
      hasExemption ? 'EXEMPT' :
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
