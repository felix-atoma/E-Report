import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

const STUDENT_INCLUDE = {
  user: { select: { id: true, name: true, email: true, profileImage: true } },
  parent: { select: { id: true, name: true, email: true, whatsappNumber: true } },
};

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async findAll(institutionId: string, classId?: string) {
    return this.prisma.student.findMany({
      where: {
        institutionId,
        ...(classId ? { classes: { some: { classId } } } : {}),
      },
      include: {
        ...STUDENT_INCLUDE,
        classes: {
          include: { class: { select: { id: true, name: true, academicYear: true } } },
          orderBy: { academicYear: 'desc' },
          take: 1,
        },
      },
      orderBy: { user: { name: 'asc' } },
    });
  }

  async findOne(id: string, institutionId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, institutionId },
      include: {
        user: { select: { id: true, name: true, email: true, profileImage: true } },
        parent: {
          select: {
            id: true, name: true, email: true,
            whatsappNumber: true, whatsappVerified: true,
          },
        },
        classes: {
          include: { class: { select: { id: true, name: true, level: true, academicYear: true } } },
          orderBy: { academicYear: 'desc' },
        },
        reportCards: {
          select: {
            id: true, academicYear: true, termNumber: true, termName: true,
            status: true, overallAverage: true, classRank: true, mention: true,
          },
          orderBy: [{ academicYear: 'desc' }, { termNumber: 'desc' }],
        },
      },
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async create(dto: CreateStudentDto, institutionId: string) {
    const existing = await this.prisma.student.findUnique({
      where: { admissionNumber: dto.admissionNumber },
    });
    if (existing) throw new ConflictException('Admission number already in use');

    if (dto.parentId) {
      const parent = await this.prisma.user.findFirst({ where: { id: dto.parentId, institutionId } });
      if (!parent) throw new NotFoundException('Parent user not found');
    }

    // When email + name are provided, create a linked STUDENT user account
    let userId: string | undefined;
    if (dto.email && dto.name) {
      const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existingUser) throw new ConflictException('Email already in use by another user');

      const saltRounds = this.config.get<number>('BCRYPT_SALT_ROUNDS', 12);
      // Temporary password — student should reset via forgot-password flow
      const tempPassword = await bcrypt.hash(
        `Temp@${Math.random().toString(36).slice(2, 10)}`,
        Number(saltRounds),
      );

      const userRecord = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: tempPassword,
          role: 'STUDENT',
          institutionId,
        },
        select: { id: true },
      });
      userId = userRecord.id;
    }

    return this.prisma.student.create({
      data: {
        admissionNumber: dto.admissionNumber,
        dateOfBirth: new Date(dto.dateOfBirth),
        enrollmentDate: dto.enrollmentDate ? new Date(dto.enrollmentDate) : undefined,
        parentId: dto.parentId,
        institutionId,
        ...(userId ? { userId } : {}),
      },
      include: STUDENT_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateStudentDto, institutionId: string) {
    await this.ensureExists(id, institutionId);

    if (dto.parentId) {
      const parent = await this.prisma.user.findFirst({ where: { id: dto.parentId, institutionId } });
      if (!parent) throw new NotFoundException('Parent user not found');
    }

    return this.prisma.student.update({
      where: { id },
      data: {
        ...(dto.admissionNumber && { admissionNumber: dto.admissionNumber }),
        ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
      include: {
        user: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true, whatsappNumber: true } },
      },
    });
  }

  private async ensureExists(id: string, institutionId: string) {
    const s = await this.prisma.student.findFirst({ where: { id, institutionId } });
    if (!s) throw new NotFoundException('Student not found');
  }
}
