import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferDirection } from '@prisma/client';

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    institutionId: string,
    params?: { direction?: TransferDirection; studentId?: string; search?: string },
  ) {
    const where: any = { institutionId };
    if (params?.direction) where.direction = params.direction;
    if (params?.studentId) where.studentId = params.studentId;
    if (params?.search) {
      where.OR = [
        { otherSchool: { contains: params.search, mode: 'insensitive' } },
        {
          student: {
            OR: [
              { admissionNumber: { contains: params.search, mode: 'insensitive' } },
              { user: { name: { contains: params.search, mode: 'insensitive' } } },
            ],
          },
        },
      ];
    }
    return this.prisma.studentTransfer.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            admissionNumber: true,
            sex: true,
            photo: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { transferDate: 'desc' },
    });
  }

  async create(dto: CreateTransferDto, institutionId: string, processedByName?: string, processedById?: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, institutionId },
    });
    if (!student) throw new BadRequestException('Student not found in this institution');

    return this.prisma.studentTransfer.create({
      data: {
        studentId: dto.studentId,
        institutionId,
        direction: dto.direction,
        otherSchool: dto.otherSchool,
        transferDate: new Date(dto.transferDate),
        academicYear: dto.academicYear,
        reason: dto.reason,
        documentUrl: dto.documentUrl,
        notes: dto.notes,
        processedByName,
        processedById,
      },
      include: {
        student: {
          select: {
            id: true,
            admissionNumber: true,
            user: { select: { name: true } },
          },
        },
      },
    });
  }

  async update(id: string, dto: Partial<CreateTransferDto>, institutionId: string) {
    const record = await this.prisma.studentTransfer.findFirst({ where: { id, institutionId } });
    if (!record) throw new NotFoundException('Transfer record not found');
    return this.prisma.studentTransfer.update({
      where: { id },
      data: {
        ...(dto.direction !== undefined && { direction: dto.direction }),
        ...(dto.otherSchool !== undefined && { otherSchool: dto.otherSchool }),
        ...(dto.transferDate && { transferDate: new Date(dto.transferDate) }),
        ...(dto.academicYear !== undefined && { academicYear: dto.academicYear }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
        ...(dto.documentUrl !== undefined && { documentUrl: dto.documentUrl }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async remove(id: string, institutionId: string) {
    const record = await this.prisma.studentTransfer.findFirst({ where: { id, institutionId } });
    if (!record) throw new NotFoundException('Transfer record not found');
    return this.prisma.studentTransfer.delete({ where: { id } });
  }
}
