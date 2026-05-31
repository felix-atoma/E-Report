import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertAlumniDto } from './dto/upsert-alumni.dto';

@Injectable()
export class AlumniService {
  constructor(private readonly prisma: PrismaService) {}

  async list(institutionId: string, params?: { year?: number; search?: string }) {
    const where: any = { institutionId };
    if (params?.year) where.graduationYear = params.year;
    if (params?.search) {
      where.student = {
        OR: [
          { admissionNumber: { contains: params.search, mode: 'insensitive' } },
          { user: { name: { contains: params.search, mode: 'insensitive' } } },
        ],
      };
    }
    return this.prisma.alumniRecord.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            admissionNumber: true,
            sex: true,
            photo: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: [{ graduationYear: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async upsert(dto: UpsertAlumniDto, institutionId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, institutionId },
    });
    if (!student) throw new BadRequestException('Student not found in this institution');

    const { studentId, ...rest } = dto;
    return this.prisma.alumniRecord.upsert({
      where: { studentId },
      create: { studentId, institutionId, ...rest },
      update: { ...rest },
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

  async findByStudent(studentId: string, institutionId: string) {
    const record = await this.prisma.alumniRecord.findFirst({
      where: { studentId, institutionId },
      include: {
        student: {
          select: {
            id: true,
            admissionNumber: true,
            sex: true,
            dateOfBirth: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });
    if (!record) throw new NotFoundException('Alumni record not found');
    return record;
  }

  async remove(studentId: string, institutionId: string) {
    const record = await this.prisma.alumniRecord.findFirst({ where: { studentId, institutionId } });
    if (!record) throw new NotFoundException('Alumni record not found');
    return this.prisma.alumniRecord.delete({ where: { studentId } });
  }
}
