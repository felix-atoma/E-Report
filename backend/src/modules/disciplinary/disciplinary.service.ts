import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDisciplinaryDto } from './dto/create-disciplinary.dto';
import { DisciplinaryType } from '@prisma/client';

@Injectable()
export class DisciplinaryService {
  constructor(private readonly prisma: PrismaService) {}

  async listByStudent(studentId: string, institutionId: string) {
    return this.prisma.disciplinaryRecord.findMany({
      where: { studentId, institutionId },
      orderBy: { date: 'desc' },
    });
  }

  async listByInstitution(
    institutionId: string,
    params?: { type?: DisciplinaryType; resolved?: boolean },
  ) {
    const where: any = { institutionId };
    if (params?.type) where.type = params.type;
    if (params?.resolved !== undefined) where.resolved = params.resolved;

    return this.prisma.disciplinaryRecord.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            admissionNumber: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async create(
    dto: CreateDisciplinaryDto,
    institutionId: string,
    recordedByName?: string,
    recordedById?: string,
  ) {
    // Verify student belongs to institution
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, institutionId },
    });
    if (!student) throw new BadRequestException('Student not found in this institution');

    return this.prisma.disciplinaryRecord.create({
      data: {
        studentId: dto.studentId,
        institutionId,
        date: new Date(dto.date),
        type: dto.type,
        description: dto.description,
        sanction: dto.sanction,
        sanctionStart: dto.sanctionStart ? new Date(dto.sanctionStart) : undefined,
        sanctionEnd: dto.sanctionEnd ? new Date(dto.sanctionEnd) : undefined,
        resolved: dto.resolved ?? false,
        recordedByName,
        recordedById,
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

  async update(id: string, dto: Partial<CreateDisciplinaryDto>, institutionId: string) {
    const record = await this.prisma.disciplinaryRecord.findFirst({ where: { id, institutionId } });
    if (!record) throw new NotFoundException('Disciplinary record not found');

    return this.prisma.disciplinaryRecord.update({
      where: { id },
      data: {
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sanction !== undefined && { sanction: dto.sanction }),
        ...(dto.sanctionStart !== undefined && { sanctionStart: dto.sanctionStart ? new Date(dto.sanctionStart) : null }),
        ...(dto.sanctionEnd !== undefined && { sanctionEnd: dto.sanctionEnd ? new Date(dto.sanctionEnd) : null }),
        ...(dto.resolved !== undefined && { resolved: dto.resolved }),
      },
    });
  }

  async remove(id: string, institutionId: string) {
    const record = await this.prisma.disciplinaryRecord.findFirst({ where: { id, institutionId } });
    if (!record) throw new NotFoundException('Disciplinary record not found');
    return this.prisma.disciplinaryRecord.delete({ where: { id } });
  }
}
