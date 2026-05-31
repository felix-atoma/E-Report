import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertExamResultDto } from './dto/upsert-exam-result.dto';
import { NationalExamType, NationalExamResultStatus } from '@prisma/client';

@Injectable()
export class NationalExamResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    institutionId: string,
    params?: { examType?: NationalExamType; academicYear?: string; search?: string },
  ) {
    const where: any = { institutionId };
    if (params?.examType) where.examType = params.examType;
    if (params?.academicYear) where.academicYear = params.academicYear;
    if (params?.search) {
      where.OR = [
        { session: { contains: params.search, mode: 'insensitive' } },
        { center: { contains: params.search, mode: 'insensitive' } },
        { mention: { contains: params.search, mode: 'insensitive' } },
        { student: { user: { name: { contains: params.search, mode: 'insensitive' } } } },
        { student: { admissionNumber: { contains: params.search, mode: 'insensitive' } } },
      ];
    }
    return this.prisma.nationalExamResult.findMany({
      where,
      include: {
        student: { include: { user: { select: { name: true } } } },
      },
      orderBy: [{ academicYear: 'desc' }, { examType: 'asc' }],
    });
  }

  async upsert(dto: UpsertExamResultDto, institutionId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, institutionId },
    });
    if (!student) throw new NotFoundException('Élève introuvable dans cet établissement');

    return this.prisma.nationalExamResult.upsert({
      where: {
        studentId_examType_session: {
          studentId: dto.studentId,
          examType: dto.examType,
          session: dto.session,
        },
      },
      create: {
        institutionId,
        studentId: dto.studentId,
        examType: dto.examType,
        session: dto.session,
        academicYear: dto.academicYear,
        result: dto.result,
        registrationNumber: dto.registrationNumber,
        center: dto.center,
        series: dto.series,
        mention: dto.mention,
        totalScore: dto.totalScore,
        notes: dto.notes,
      },
      update: {
        academicYear: dto.academicYear,
        result: dto.result,
        registrationNumber: dto.registrationNumber,
        center: dto.center,
        series: dto.series,
        mention: dto.mention,
        totalScore: dto.totalScore,
        notes: dto.notes,
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
      },
    });
  }

  async listByStudent(studentId: string, institutionId: string) {
    return this.prisma.nationalExamResult.findMany({
      where: { studentId, institutionId },
      orderBy: [{ academicYear: 'desc' }, { examType: 'asc' }],
    });
  }

  async remove(id: string, institutionId: string) {
    const record = await this.prisma.nationalExamResult.findFirst({
      where: { id, institutionId },
    });
    if (!record) throw new NotFoundException('Résultat introuvable');
    return this.prisma.nationalExamResult.delete({ where: { id } });
  }

  async summary(institutionId: string, params?: { examType?: NationalExamType; academicYear?: string }) {
    const where: any = { institutionId };
    if (params?.examType) where.examType = params.examType;
    if (params?.academicYear) where.academicYear = params.academicYear;

    const records = await this.prisma.nationalExamResult.findMany({ where, select: { result: true } });
    const total = records.length;
    const admis = records.filter((r) => r.result === 'ADMIS').length;
    const ajourne = records.filter((r) => r.result === 'AJOURNE').length;
    const absent = records.filter((r) => r.result === 'ABSENT').length;
    const elimine = records.filter((r) => r.result === 'ELIMINE').length;
    const presented = total - absent;
    const passRate = presented > 0 ? Math.round((admis / presented) * 100) : 0;

    return { total, admis, ajourne, absent, elimine, passRate };
  }
}
