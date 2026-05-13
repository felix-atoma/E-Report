import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(institutionId: string, userId: string, role: Role, classId?: string, subjectId?: string) {
    const where: any = { institutionId };
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    if (role === Role.STUDENT) {
      where.status = 'PUBLISHED';
    } else if (role === Role.TEACHER) {
      const taught = await this.prisma.classSubject.findMany({
        where: { teacherId: userId },
        select: { classId: true, subjectId: true },
      });
      if (!classId && !subjectId) {
        where.OR = taught.map((t) => ({ classId: t.classId, subjectId: t.subjectId }));
      }
    }

    return this.prisma.assignment.findMany({
      where,
      include: {
        subject: { select: { id: true, nameFr: true } },
        class: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, institutionId: string) {
    const a = await this.prisma.assignment.findFirst({
      where: { id, institutionId },
      include: {
        subject: { select: { id: true, nameFr: true } },
        class: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
    });
    if (!a) throw new NotFoundException('Assignment not found');
    return a;
  }

  async create(dto: CreateAssignmentDto, institutionId: string, createdById: string) {
    return this.prisma.assignment.create({
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        createdById,
        institutionId,
      },
    });
  }

  async update(id: string, dto: Partial<CreateAssignmentDto>, institutionId: string, userId: string, role: Role) {
    const a = await this.prisma.assignment.findFirst({ where: { id, institutionId } });
    if (!a) throw new NotFoundException('Assignment not found');
    if (role !== Role.ADMIN && a.createdById !== userId) throw new ForbiddenException();
    return this.prisma.assignment.update({
      where: { id },
      data: { ...dto, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined },
    });
  }

  async publish(id: string, institutionId: string, userId: string, role: Role) {
    const a = await this.prisma.assignment.findFirst({ where: { id, institutionId } });
    if (!a) throw new NotFoundException();
    if (role !== Role.ADMIN && a.createdById !== userId) throw new ForbiddenException();
    const next = a.status === 'PUBLISHED' ? 'CLOSED' : 'PUBLISHED';
    return this.prisma.assignment.update({ where: { id }, data: { status: next } });
  }

  async remove(id: string, institutionId: string, userId: string, role: Role) {
    const a = await this.prisma.assignment.findFirst({ where: { id, institutionId } });
    if (!a) throw new NotFoundException();
    if (role !== Role.ADMIN && a.createdById !== userId) throw new ForbiddenException();
    return this.prisma.assignment.delete({ where: { id } });
  }

  // ── Submissions ─────────────────────────────────────────────────────────────

  async listSubmissions(assignmentId: string, institutionId: string) {
    const a = await this.prisma.assignment.findFirst({ where: { id: assignmentId, institutionId } });
    if (!a) throw new NotFoundException();
    return this.prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: {
        student: { include: { user: { select: { name: true } } } },
        gradedBy: { select: { id: true, name: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async submit(assignmentId: string, dto: SubmitAssignmentDto, userId: string, institutionId: string) {
    const a = await this.prisma.assignment.findFirst({ where: { id: assignmentId, institutionId } });
    if (!a) throw new NotFoundException();
    if (a.status !== 'PUBLISHED') throw new BadRequestException('Assignment is not open for submission');

    const student = await this.prisma.student.findFirst({ where: { userId } });
    if (!student) throw new ForbiddenException('No student profile');

    const isLate = a.dueDate && new Date() > a.dueDate;

    return this.prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
      create: {
        assignmentId,
        studentId: student.id,
        content: dto.content,
        attachmentUrl: dto.attachmentUrl,
        status: isLate ? 'LATE' : 'SUBMITTED',
      },
      update: {
        content: dto.content,
        attachmentUrl: dto.attachmentUrl,
        status: isLate ? 'LATE' : 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
  }

  async getMySubmission(assignmentId: string, userId: string, institutionId: string) {
    const student = await this.prisma.student.findFirst({ where: { userId } });
    if (!student) return null;
    return this.prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
    });
  }

  async grade(assignmentId: string, submissionId: string, dto: GradeSubmissionDto, gradedById: string, institutionId: string) {
    const a = await this.prisma.assignment.findFirst({ where: { id: assignmentId, institutionId } });
    if (!a) throw new NotFoundException();
    return this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { score: dto.score, feedback: dto.feedback, gradedById, gradedAt: new Date(), status: 'GRADED' },
    });
  }
}
