import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { AssignSubjectDto } from './dto/assign-subject.dto';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(institutionId: string, userId?: string, role?: string) {
    const where: any = { institutionId, isActive: true };

    if (role === 'TEACHER' && userId) {
      where.OR = [
        { teacherId: userId },
        { subjects: { some: { teacherId: userId } } },
      ];
    }

    return this.prisma.class.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        _count: { select: { students: true, subjects: true } },
      },
      orderBy: [{ academicYear: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, institutionId: string, userId?: string, role?: string) {
    const where: any = { id, institutionId };
    if (role === 'TEACHER' && userId) {
      where.OR = [
        { teacherId: userId },
        { subjects: { some: { teacherId: userId } } },
      ];
    }

    const cls = await this.prisma.class.findFirst({
      where,
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        students: {
          include: {
            student: {
              select: { id: true, admissionNumber: true, dateOfBirth: true, sex: true, user: { select: { name: true, profileImage: true } } },
            },
          },
          orderBy: { student: { user: { name: 'asc' } } },
        },
        subjects: {
          include: {
            subject: { select: { id: true, nameFr: true, nameEn: true, code: true } },
            teacher: { select: { id: true, name: true } },
          },
          orderBy: { subject: { nameFr: 'asc' } },
        },
      },
    });
    if (!cls) {
      if (role === 'TEACHER') throw new ForbiddenException('You do not have access to this class');
      throw new NotFoundException('Class not found');
    }
    return cls;
  }

  async create(dto: CreateClassDto, institutionId: string) {
    return this.prisma.class.create({
      data: { ...dto, institutionId },
      include: { teacher: { select: { id: true, name: true, email: true } } },
    });
  }

  async update(id: string, dto: UpdateClassDto, institutionId: string) {
    await this.ensureExists(id, institutionId);
    return this.prisma.class.update({
      where: { id },
      data: dto,
      include: { teacher: { select: { id: true, name: true, email: true } } },
    });
  }

  async deactivate(id: string, institutionId: string) {
    await this.ensureExists(id, institutionId);
    return this.prisma.class.update({ where: { id }, data: { isActive: false } });
  }

  async bulkRemove(ids: string[], institutionId: string) {
    for (const id of ids) {
      try { await this.remove(id, institutionId); } catch { /* skip already-deleted or not-found */ }
    }
    return { deleted: ids.length };
  }

  async remove(id: string, institutionId: string) {
    await this.ensureExists(id, institutionId);
    await this.prisma.$transaction([
      this.prisma.subjectHoursLog.deleteMany({ where: { classId: id } }),
      this.prisma.subjectProgram.deleteMany({ where: { classId: id } }),
      this.prisma.gradeFiche.deleteMany({ where: { classId: id } }),
      this.prisma.classSubject.deleteMany({ where: { classId: id } }),
      this.prisma.classStudent.deleteMany({ where: { classId: id } }),
      this.prisma.reportCard.deleteMany({ where: { classId: id } }),
      this.prisma.class.delete({ where: { id } }),
    ]);
    return { message: 'Class deleted' };
  }

  async enrollStudent(classId: string, dto: EnrollStudentDto, institutionId: string) {
    await this.ensureExists(classId, institutionId);

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, institutionId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const existing = await this.prisma.classStudent.findUnique({
      where: { classId_studentId_academicYear: { classId, studentId: dto.studentId, academicYear: dto.academicYear } },
    });
    if (existing) throw new ConflictException('Student already enrolled in this class for this academic year');

    return this.prisma.classStudent.create({
      data: { classId, studentId: dto.studentId, academicYear: dto.academicYear, term: dto.term },
    });
  }

  async unenrollStudent(classId: string, studentId: string, institutionId: string) {
    await this.ensureExists(classId, institutionId);
    const enrollment = await this.prisma.classStudent.findFirst({
      where: { classId, studentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    await this.prisma.classStudent.delete({ where: { id: enrollment.id } });
    return { message: 'Student unenrolled' };
  }

  async assignSubject(classId: string, dto: AssignSubjectDto, institutionId: string) {
    await this.ensureExists(classId, institutionId);

    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subjectId, institutionId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const existing = await this.prisma.classSubject.findUnique({
      where: { classId_subjectId: { classId, subjectId: dto.subjectId } },
    });
    if (existing) throw new ConflictException('Subject already assigned to this class');

    return this.prisma.classSubject.create({
      data: { classId, subjectId: dto.subjectId, teacherId: dto.teacherId },
      include: { subject: { select: { id: true, nameFr: true, code: true } } },
    });
  }

  async updateSubjectTeacher(
    classId: string,
    subjectId: string,
    teacherId: string | null,
    institutionId: string,
  ) {
    await this.ensureExists(classId, institutionId);
    const cs = await this.prisma.classSubject.findUnique({
      where: { classId_subjectId: { classId, subjectId } },
    });
    if (!cs) throw new NotFoundException('Subject not assigned to this class');
    return this.prisma.classSubject.update({
      where: { id: cs.id },
      data: { teacherId: teacherId ?? null },
      include: {
        subject: { select: { id: true, nameFr: true, code: true } },
        teacher: { select: { id: true, name: true } },
      },
    });
  }

  async removeSubject(classId: string, subjectId: string, institutionId: string) {
    await this.ensureExists(classId, institutionId);
    const cs = await this.prisma.classSubject.findUnique({
      where: { classId_subjectId: { classId, subjectId } },
    });
    if (!cs) throw new NotFoundException('Subject not assigned to this class');
    await this.prisma.classSubject.delete({ where: { id: cs.id } });
    return { message: 'Subject removed from class' };
  }

  private async ensureExists(id: string, institutionId: string) {
    const cls = await this.prisma.class.findFirst({ where: { id, institutionId } });
    if (!cls) throw new NotFoundException('Class not found');
  }
}
