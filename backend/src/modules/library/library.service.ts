import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLoanDto } from './dto/create-loan.dto';

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    institutionId: string,
    params?: { isReturned?: boolean; search?: string; overdue?: boolean },
  ) {
    const where: any = { institutionId };
    if (params?.isReturned !== undefined) where.isReturned = params.isReturned;
    if (params?.overdue) {
      where.dueDate = { lt: new Date() };
      where.isReturned = false;
    }
    if (params?.search) {
      where.OR = [
        { borrowerName: { contains: params.search, mode: 'insensitive' } },
        { item: { name: { contains: params.search, mode: 'insensitive' } } },
        { student: { user: { name: { contains: params.search, mode: 'insensitive' } } } },
        { student: { admissionNumber: { contains: params.search, mode: 'insensitive' } } },
      ];
    }
    return this.prisma.libraryLoan.findMany({
      where,
      include: {
        item: true,
        student: { include: { user: { select: { name: true } } } },
      },
      orderBy: { loanDate: 'desc' },
    });
  }

  async create(
    dto: CreateLoanDto,
    institutionId: string,
    issuedByName?: string,
    issuedById?: string,
  ) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.itemId, institutionId },
    });
    if (!item) throw new NotFoundException('Article introuvable dans cet établissement');

    return this.prisma.libraryLoan.create({
      data: {
        institutionId,
        itemId: dto.itemId,
        studentId: dto.studentId,
        borrowerName: dto.borrowerName,
        loanDate: new Date(dto.loanDate),
        dueDate: new Date(dto.dueDate),
        conditionOut: dto.conditionOut,
        notes: dto.notes,
        issuedByName,
        issuedById,
      },
      include: {
        item: true,
        student: { include: { user: { select: { name: true } } } },
      },
    });
  }

  async returnLoan(id: string, institutionId: string, conditionIn?: string) {
    const loan = await this.prisma.libraryLoan.findFirst({ where: { id, institutionId } });
    if (!loan) throw new NotFoundException('Prêt introuvable');
    return this.prisma.libraryLoan.update({
      where: { id },
      data: {
        isReturned: true,
        returnDate: new Date(),
        conditionIn,
      },
      include: {
        item: true,
        student: { include: { user: { select: { name: true } } } },
      },
    });
  }

  async remove(id: string, institutionId: string) {
    const loan = await this.prisma.libraryLoan.findFirst({ where: { id, institutionId } });
    if (!loan) throw new NotFoundException('Prêt introuvable');
    return this.prisma.libraryLoan.delete({ where: { id } });
  }

  async listByStudent(studentId: string, institutionId: string) {
    return this.prisma.libraryLoan.findMany({
      where: { studentId, institutionId },
      include: { item: true },
      orderBy: { loanDate: 'desc' },
    });
  }
}
