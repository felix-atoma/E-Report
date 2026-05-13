import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Injectable()
export class QuizzesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(institutionId: string, userId: string, role: Role, classId?: string, subjectId?: string) {
    const where: any = { institutionId };
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;
    if (role === Role.STUDENT) where.status = 'OPEN';

    return this.prisma.quiz.findMany({
      where,
      include: {
        subject: { select: { id: true, nameFr: true } },
        class: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, institutionId: string, role: Role) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id, institutionId },
      include: {
        questions: {
          include: {
            options: {
              select: {
                id: true, text: true, order: true,
                // Only reveal correct answer to admins/teachers
                isCorrect: role !== Role.STUDENT,
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  async create(dto: CreateQuizDto, institutionId: string, createdById: string) {
    return this.prisma.quiz.create({
      data: {
        ...dto,
        openAt: dto.openAt ? new Date(dto.openAt) : undefined,
        closeAt: dto.closeAt ? new Date(dto.closeAt) : undefined,
        createdById,
        institutionId,
      },
    });
  }

  async update(id: string, dto: Partial<CreateQuizDto>, institutionId: string, userId: string, role: Role) {
    const q = await this.prisma.quiz.findFirst({ where: { id, institutionId } });
    if (!q) throw new NotFoundException();
    if (role !== Role.ADMIN && q.createdById !== userId) throw new ForbiddenException();
    return this.prisma.quiz.update({
      where: { id },
      data: {
        ...dto,
        openAt: dto.openAt ? new Date(dto.openAt) : undefined,
        closeAt: dto.closeAt ? new Date(dto.closeAt) : undefined,
      },
    });
  }

  async publish(id: string, institutionId: string, userId: string, role: Role) {
    const q = await this.prisma.quiz.findFirst({ where: { id, institutionId } });
    if (!q) throw new NotFoundException();
    if (role !== Role.ADMIN && q.createdById !== userId) throw new ForbiddenException();
    const next = q.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    return this.prisma.quiz.update({ where: { id }, data: { status: next } });
  }

  async remove(id: string, institutionId: string, userId: string, role: Role) {
    const q = await this.prisma.quiz.findFirst({ where: { id, institutionId } });
    if (!q) throw new NotFoundException();
    if (role !== Role.ADMIN && q.createdById !== userId) throw new ForbiddenException();
    return this.prisma.quiz.delete({ where: { id } });
  }

  // ── Questions ────────────────────────────────────────────────────────────────

  async addQuestion(quizId: string, dto: CreateQuestionDto, institutionId: string, userId: string, role: Role) {
    const quiz = await this.prisma.quiz.findFirst({ where: { id: quizId, institutionId } });
    if (!quiz) throw new NotFoundException();
    if (role !== Role.ADMIN && quiz.createdById !== userId) throw new ForbiddenException();

    const maxOrder = await this.prisma.quizQuestion.aggregate({
      where: { quizId },
      _max: { order: true },
    });
    const order = (maxOrder._max.order ?? 0) + 1;

    return this.prisma.quizQuestion.create({
      data: {
        quizId,
        text: dto.text,
        type: dto.type,
        points: dto.points ?? 1,
        order,
        options: dto.options
          ? {
              createMany: {
                data: dto.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, order: i + 1 })),
              },
            }
          : undefined,
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });
  }

  async updateQuestion(quizId: string, questionId: string, dto: Partial<CreateQuestionDto>, institutionId: string, userId: string, role: Role) {
    const quiz = await this.prisma.quiz.findFirst({ where: { id: quizId, institutionId } });
    if (!quiz) throw new NotFoundException();
    if (role !== Role.ADMIN && quiz.createdById !== userId) throw new ForbiddenException();

    // Replace options if provided
    if (dto.options) {
      await this.prisma.quizOption.deleteMany({ where: { questionId } });
      await this.prisma.quizOption.createMany({
        data: dto.options.map((o, i) => ({ questionId, text: o.text, isCorrect: o.isCorrect, order: i + 1 })),
      });
    }

    return this.prisma.quizQuestion.update({
      where: { id: questionId },
      data: { text: dto.text, type: dto.type, points: dto.points },
      include: { options: { orderBy: { order: 'asc' } } },
    });
  }

  async removeQuestion(quizId: string, questionId: string, institutionId: string, userId: string, role: Role) {
    const quiz = await this.prisma.quiz.findFirst({ where: { id: quizId, institutionId } });
    if (!quiz) throw new NotFoundException();
    if (role !== Role.ADMIN && quiz.createdById !== userId) throw new ForbiddenException();
    return this.prisma.quizQuestion.delete({ where: { id: questionId } });
  }

  // ── Attempts ─────────────────────────────────────────────────────────────────

  async startAttempt(quizId: string, userId: string, institutionId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, institutionId },
      include: { _count: { select: { questions: true } } },
    });
    if (!quiz) throw new NotFoundException();
    if (quiz.status !== 'OPEN') throw new BadRequestException('Quiz is not open');

    const student = await this.prisma.student.findFirst({ where: { userId } });
    if (!student) throw new ForbiddenException('No student profile');

    const attempts = await this.prisma.quizAttempt.count({ where: { quizId, studentId: student.id } });
    if (attempts >= quiz.maxAttempts) throw new BadRequestException('Maximum attempts reached');

    return this.prisma.quizAttempt.create({
      data: { quizId, studentId: student.id },
    });
  }

  async submitAttempt(quizId: string, attemptId: string, dto: SubmitAttemptDto, userId: string, institutionId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, institutionId },
      include: { questions: { include: { options: true } } },
    });
    if (!quiz) throw new NotFoundException();

    const student = await this.prisma.student.findFirst({ where: { userId } });
    if (!student) throw new ForbiddenException();

    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { id: attemptId, quizId, studentId: student.id },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.submittedAt) throw new BadRequestException('Already submitted');

    const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));

    let totalScore = 0;
    let maxScore = 0;

    const answers = dto.answers.map((a) => {
      const question = questionMap.get(a.questionId);
      if (!question) return null;
      maxScore += question.points;

      let isCorrect: boolean | null = null;
      let pointsEarned = 0;

      if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
        const selectedOption = question.options.find((o) => o.id === a.selectedOptionId);
        isCorrect = selectedOption?.isCorrect ?? false;
        pointsEarned = isCorrect ? question.points : 0;
      }
      // SHORT_ANSWER: manual grading — leave isCorrect null

      totalScore += pointsEarned;
      return { questionId: a.questionId, selectedOptionId: a.selectedOptionId, textAnswer: a.textAnswer, isCorrect, pointsEarned };
    }).filter(Boolean);

    await this.prisma.$transaction([
      this.prisma.quizAnswer.createMany({
        data: answers.map((a: any) => ({ ...a, attemptId })),
        skipDuplicates: true,
      }),
      this.prisma.quizAttempt.update({
        where: { id: attemptId },
        data: { submittedAt: new Date(), score: totalScore, maxScore },
      }),
    ]);

    return this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: { include: { question: true, selectedOption: true } } },
    });
  }

  async getMyAttempts(quizId: string, userId: string, institutionId: string) {
    const student = await this.prisma.student.findFirst({ where: { userId } });
    if (!student) return [];
    return this.prisma.quizAttempt.findMany({
      where: { quizId, studentId: student.id },
      include: { answers: { include: { question: true, selectedOption: true } } },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getResults(quizId: string, institutionId: string) {
    const quiz = await this.prisma.quiz.findFirst({ where: { id: quizId, institutionId } });
    if (!quiz) throw new NotFoundException();
    return this.prisma.quizAttempt.findMany({
      where: { quizId },
      include: {
        student: { include: { user: { select: { name: true } } } },
        answers: { include: { question: { select: { id: true, text: true, points: true } } } },
      },
      orderBy: { score: 'desc' },
    });
  }
}
