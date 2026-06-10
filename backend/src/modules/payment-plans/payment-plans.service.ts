import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentPlanDto } from './dto/create-payment-plan.dto';
import { PayInstalmentDto } from './dto/pay-instalment.dto';

@Injectable()
export class PaymentPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, createdById: string, dto: CreatePaymentPlanDto) {
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, institutionId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Étudiant introuvable');

    return this.prisma.paymentPlan.create({
      data: {
        studentId: dto.studentId,
        institutionId,
        academicYear: dto.academicYear,
        totalAmount: dto.totalAmount,
        notes: dto.notes,
        createdById,
        instalments: {
          create: dto.instalments.map((i) => ({
            dueDate: new Date(i.dueDate),
            amount: i.amount,
            notes: i.notes,
          })),
        },
      },
      include: { instalments: { orderBy: { dueDate: 'asc' } } },
    });
  }

  async findAll(institutionId: string, studentId?: string, academicYear?: string) {
    return this.prisma.paymentPlan.findMany({
      where: {
        institutionId,
        ...(studentId ? { studentId } : {}),
        ...(academicYear ? { academicYear } : {}),
      },
      include: {
        instalments: { orderBy: { dueDate: 'asc' } },
        student: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, institutionId: string) {
    const plan = await this.prisma.paymentPlan.findFirst({
      where: { id, institutionId },
      include: {
        instalments: { orderBy: { dueDate: 'asc' } },
        student: { include: { user: { select: { name: true } } } },
        createdBy: { select: { name: true } },
      },
    });
    if (!plan) throw new NotFoundException('Plan introuvable');
    return plan;
  }

  async payInstalment(instalmentId: string, institutionId: string, dto: PayInstalmentDto) {
    const instalment = await this.prisma.paymentPlanInstalment.findFirst({
      where: { id: instalmentId, plan: { institutionId } },
    });
    if (!instalment) throw new NotFoundException('Échéance introuvable');
    if (instalment.paidAt) throw new ForbiddenException('Déjà payée');

    return this.prisma.paymentPlanInstalment.update({
      where: { id: instalmentId },
      data: {
        paidAt: new Date(),
        paidAmount: dto.paidAmount,
        notes: dto.notes ?? instalment.notes,
      },
    });
  }

  async deletePlan(id: string, institutionId: string) {
    const plan = await this.prisma.paymentPlan.findFirst({
      where: { id, institutionId },
    });
    if (!plan) throw new NotFoundException('Plan introuvable');
    await this.prisma.paymentPlan.delete({ where: { id } });
    return { message: 'Plan supprimé' };
  }
}
