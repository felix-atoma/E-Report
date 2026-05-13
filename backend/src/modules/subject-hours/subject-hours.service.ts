import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertSubjectHoursDto } from './dto/upsert-subject-hours.dto';

@Injectable()
export class SubjectHoursService {
  constructor(private readonly prisma: PrismaService) {}

  async findBySubject(subjectId: string, institutionId: string) {
    const subject = await this.prisma.subject.findFirst({ where: { id: subjectId, institutionId } });
    if (!subject) throw new NotFoundException('Subject not found');

    return this.prisma.subjectHoursLog.findMany({
      where: { subjectId },
      include: {
        class: { select: { id: true, name: true, academicYear: true } },
      },
      orderBy: [{ academicYear: 'desc' }, { termNumber: 'asc' }],
    });
  }

  async upsert(subjectId: string, dto: UpsertSubjectHoursDto, institutionId: string) {
    const subject = await this.prisma.subject.findFirst({ where: { id: subjectId, institutionId } });
    if (!subject) throw new NotFoundException('Subject not found');

    return this.prisma.subjectHoursLog.upsert({
      where: {
        subjectId_classId_academicYear_termNumber: {
          subjectId,
          classId: dto.classId,
          academicYear: dto.academicYear,
          termNumber: dto.termNumber,
        },
      },
      create: {
        subjectId,
        classId:          dto.classId,
        academicYear:     dto.academicYear,
        termNumber:       dto.termNumber,
        termName:         dto.termName,
        heuresPrevues:    dto.heuresPrevues,
        heuresEffectuees: dto.heuresEffectuees,
        absences:         dto.absences,
        retards:          dto.retards,
        notes:            dto.notes,
      },
      update: {
        termName:         dto.termName,
        heuresPrevues:    dto.heuresPrevues,
        heuresEffectuees: dto.heuresEffectuees,
        absences:         dto.absences,
        retards:          dto.retards,
        notes:            dto.notes,
      },
    });
  }
}
