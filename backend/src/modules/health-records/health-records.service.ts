import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { HealthVisitType } from '@prisma/client';

@Injectable()
export class HealthRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(institutionId: string, params?: { search?: string; type?: HealthVisitType }) {
    const where: any = { institutionId };
    if (params?.type) where.visitType = params.type;
    if (params?.search) {
      where.OR = [
        { complaint: { contains: params.search, mode: 'insensitive' } },
        { diagnosis: { contains: params.search, mode: 'insensitive' } },
        { treatment: { contains: params.search, mode: 'insensitive' } },
        { student: { user: { name: { contains: params.search, mode: 'insensitive' } } } },
        { student: { admissionNumber: { contains: params.search, mode: 'insensitive' } } },
      ];
    }
    return this.prisma.healthRecord.findMany({
      where,
      include: {
        student: { include: { user: { select: { name: true } } } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async listByStudent(studentId: string, institutionId: string) {
    return this.prisma.healthRecord.findMany({
      where: { studentId, institutionId },
      orderBy: { date: 'desc' },
    });
  }

  async create(
    dto: CreateHealthRecordDto,
    institutionId: string,
    attendedByName?: string,
    attendedById?: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, institutionId },
    });
    if (!student) throw new NotFoundException('Élève introuvable dans cet établissement');

    return this.prisma.healthRecord.create({
      data: {
        institutionId,
        studentId: dto.studentId,
        date: new Date(dto.date),
        visitType: dto.visitType ?? 'CONSULTATION',
        complaint: dto.complaint,
        diagnosis: dto.diagnosis,
        treatment: dto.treatment,
        referredToHospital: dto.referredToHospital ?? false,
        hospital: dto.hospital,
        attendedByName: dto.attendedByName ?? attendedByName,
        attendedById,
        notes: dto.notes,
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
      },
    });
  }

  async update(id: string, dto: Partial<CreateHealthRecordDto>, institutionId: string) {
    const record = await this.prisma.healthRecord.findFirst({ where: { id, institutionId } });
    if (!record) throw new NotFoundException('Dossier médical introuvable');
    return this.prisma.healthRecord.update({
      where: { id },
      data: {
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.visitType !== undefined && { visitType: dto.visitType }),
        ...(dto.complaint !== undefined && { complaint: dto.complaint }),
        ...(dto.diagnosis !== undefined && { diagnosis: dto.diagnosis }),
        ...(dto.treatment !== undefined && { treatment: dto.treatment }),
        ...(dto.referredToHospital !== undefined && { referredToHospital: dto.referredToHospital }),
        ...(dto.hospital !== undefined && { hospital: dto.hospital }),
        ...(dto.attendedByName !== undefined && { attendedByName: dto.attendedByName }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
      },
    });
  }

  async remove(id: string, institutionId: string) {
    const record = await this.prisma.healthRecord.findFirst({ where: { id, institutionId } });
    if (!record) throw new NotFoundException('Dossier médical introuvable');
    return this.prisma.healthRecord.delete({ where: { id } });
  }
}
