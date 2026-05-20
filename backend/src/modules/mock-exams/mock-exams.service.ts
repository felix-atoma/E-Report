import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMockExamDto } from './dto/create-mock-exam.dto';
import { SaveMockExamGradesDto } from './dto/save-grades.dto';

function appreciation(score: number | null): string {
  if (score == null) return '';
  if (score >= 16) return 'Très Bien';
  if (score >= 14) return 'Bien';
  if (score >= 12) return 'Assez Bien';
  if (score >= 10) return 'Passable';
  return 'Insuffisant';
}

function round2(v: number) { return Math.round(v * 100) / 100; }

@Injectable()
export class MockExamsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List exams for a class (or all for institution) ────────────────────────
  async list(institutionId: string, classId?: string, academicYear?: string) {
    const where: any = { institutionId };
    if (classId) where.classId = classId;
    if (academicYear) where.academicYear = academicYear;

    return this.prisma.mockExam.findMany({
      where,
      orderBy: [{ examDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        class: { select: { id: true, name: true, academicYear: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { grades: true } },
      },
    });
  }

  // ─── Create a new mock exam session ─────────────────────────────────────────
  async create(dto: CreateMockExamDto, userId: string, institutionId: string) {
    const cls = await this.prisma.class.findFirst({
      where: { id: dto.classId, institutionId },
    });
    if (!cls) throw new NotFoundException('Classe introuvable');

    return this.prisma.mockExam.create({
      data: {
        institutionId,
        classId: dto.classId,
        academicYear: dto.academicYear,
        examType: dto.examType as any,
        label: dto.label,
        examDate:    dto.examDate    ? new Date(dto.examDate)    : null,
        examEndDate: dto.examEndDate ? new Date(dto.examEndDate) : null,
        createdById: userId,
      },
      include: { class: { select: { id: true, name: true } } },
    });
  }

  // ─── Get grade sheet: all students + their current grades per subject ───────
  async getGradeSheet(
    examId: string,
    institutionId: string,
    userId?: string,
    userRole?: string,
  ) {
    const exam = await this.findExamOrThrow(examId, institutionId);

    // Subjects assigned to this class
    const classSubjects = await this.prisma.classSubject.findMany({
      where: { classId: exam.classId },
      include: { subject: { select: { id: true, nameFr: true, nameEn: true, code: true } } },
      orderBy: { subject: { nameFr: 'asc' } },
    });

    // Students enrolled in class
    const classStudents = await this.prisma.classStudent.findMany({
      where: { classId: exam.classId },
      include: {
        student: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { student: { user: { name: 'asc' } } },
    });

    // Existing grades for this exam
    const existingGrades = await this.prisma.mockExamGrade.findMany({
      where: { mockExamId: examId },
    });

    const gradeMap = new Map(
      existingGrades.map((g) => [`${g.studentId}:${g.subjectId}`, g]),
    );

    // Read stored coefficients — take the first grade found per subject
    const subjectCoeffMap = new Map<string, number>();
    existingGrades.forEach((g) => {
      if (!subjectCoeffMap.has(g.subjectId)) {
        subjectCoeffMap.set(g.subjectId, g.coefficient);
      }
    });

    const subjects = classSubjects.map((cs) => ({
      id: cs.subject.id,
      nameFr: cs.subject.nameFr,
      nameEn: cs.subject.nameEn,
      code: cs.subject.code,
      coefficient: subjectCoeffMap.get(cs.subject.id) ?? 1,
    }));

    const students = classStudents.map((cs) => {
      const student = cs.student;
      const gradesForStudent = subjects.map((subj) => {
        const g = gradeMap.get(`${student.id}:${subj.id}`);
        return {
          subjectId: subj.id,
          coefficient: g?.coefficient ?? subj.coefficient,
          score: g?.score ?? null,
          appreciation: appreciation(g?.score ?? null),
        };
      });

      // Compute total and average
      const filled = gradesForStudent.filter((g) => g.score != null);
      const totalCoeff = filled.reduce((s, g) => s + g.coefficient, 0);
      const totalPoints = filled.reduce((s, g) => s + (g.score ?? 0) * g.coefficient, 0);
      const average = totalCoeff > 0 ? round2(totalPoints / totalCoeff) : null;

      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        studentName: student.user?.name ?? student.admissionNumber,
        sex: student.sex ?? null,
        grades: gradesForStudent,
        average,
        appreciation: appreciation(average),
      };
    });

    // Compute dense ranks (1, 2, 2, 3 …) — ties share the same rank
    const ranked = [...students]
      .filter((s) => s.average != null)
      .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
    const rankMap = new Map<string, number>();
    let denseRank = 1;
    ranked.forEach((s, i) => {
      if (i > 0 && s.average !== ranked[i - 1].average) denseRank = i + 1;
      rankMap.set(s.studentId, denseRank);
    });

    // Determine which subjects this teacher can edit (null = admin = all)
    let editableSubjectIds: string[] | null = null;
    if (userRole === 'TEACHER' && userId) {
      const teacherSubjects = await this.prisma.classSubject.findMany({
        where: { classId: exam.classId, teacherId: userId },
        select: { subjectId: true },
      });
      editableSubjectIds = teacherSubjects.map((cs) => cs.subjectId);
    }

    return {
      exam: {
        id: exam.id,
        label: exam.label,
        examType: exam.examType,
        examDate:    exam.examDate,
        examEndDate: exam.examEndDate,
        academicYear: exam.academicYear,
        status: exam.status,
        class: { id: exam.classId, name: (exam as any).class?.name },
      },
      subjects,
      students: students.map((s) => ({
        ...s,
        rank: rankMap.get(s.studentId) ?? null,
        classSize: ranked.length,
      })),
      editableSubjectIds,
    };
  }

  // ─── Get fiche data (institution + subjects + grades, teacher-filtered) ────
  async getFicheData(examId: string, institutionId: string, userId?: string, userRole?: string) {
    const sheet = await this.getGradeSheet(examId, institutionId, userId, userRole);
    const exam  = await this.findExamOrThrow(examId, institutionId);

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { name: true, address: true, logo: true, brandingSettings: true },
    });

    // Attach teacher name to each subject
    const classSubjectRows = await this.prisma.classSubject.findMany({
      where: { classId: exam.classId },
      include: { teacher: { select: { name: true } } },
    });
    const teacherMap = new Map(classSubjectRows.map((cs) => [cs.subjectId, cs.teacher?.name ?? null]));

    // Signing status per subject
    const signedFiches = await this.prisma.mockExamSubjectFiche.findMany({
      where: { mockExamId: examId },
    });
    const signMap = new Map(signedFiches.map((f) => [f.subjectId, f]));

    return {
      institution: {
        name: institution?.name ?? '',
        address: institution?.address ?? '',
        logo: institution?.logo ?? null,
        circonscription: (institution?.brandingSettings as any)?.circonscription ?? null,
      },
      exam: sheet.exam,
      subjects: sheet.subjects.map((s) => {
        const sign = signMap.get(s.id);
        return {
          ...s,
          teacherName: teacherMap.get(s.id) ?? null,
          isSigned: !!(sign?.signedAt),
          signedAt: sign?.signedAt ?? null,
          signedByName: sign?.signedByName ?? null,
          signedById: sign?.signedById ?? null,
        };
      }),
      students: sheet.students,
      editableSubjectIds: sheet.editableSubjectIds,
    };
  }

  // ─── Sign a subject fiche ────────────────────────────────────────────────
  async signSubjectFiche(examId: string, subjectId: string, institutionId: string, userId: string, userName: string) {
    await this.findExamOrThrow(examId, institutionId);
    return this.prisma.mockExamSubjectFiche.upsert({
      where: { mockExamId_subjectId: { mockExamId: examId, subjectId } },
      update: { signedAt: new Date(), signedById: userId, signedByName: userName },
      create: { mockExamId: examId, subjectId, signedAt: new Date(), signedById: userId, signedByName: userName },
    });
  }

  // ─── Unsign a subject fiche (admin always; teacher only if they are the signer) ──
  async unsignSubjectFiche(examId: string, subjectId: string, institutionId: string, userId?: string, userRole?: string) {
    await this.findExamOrThrow(examId, institutionId);
    if (userRole !== 'ADMIN' && userId) {
      const fiche = await this.prisma.mockExamSubjectFiche.findUnique({
        where: { mockExamId_subjectId: { mockExamId: examId, subjectId } },
      });
      if (fiche && fiche.signedById !== userId) {
        throw new ForbiddenException('Vous ne pouvez annuler que votre propre signature.');
      }
    }
    await this.prisma.mockExamSubjectFiche.deleteMany({
      where: { mockExamId: examId, subjectId },
    });
    return { message: 'Signature annulée.' };
  }

  // ─── Save grades for a single subject (fiche save) ────────────────────────
  async saveSubjectGrades(
    examId: string,
    subjectId: string,
    grades: { studentId: string; score: number | null }[],
    institutionId: string,
    coefficient = 1,
    userRole = 'TEACHER',
  ) {
    const exam = await this.findExamOrThrow(examId, institutionId);
    if (exam.status === 'PUBLISHED') {
      throw new ForbiddenException('Impossible de modifier un examen publié.');
    }
    // Block edits on a signed fiche (unless admin)
    if (userRole !== 'ADMIN') {
      const signed = await this.prisma.mockExamSubjectFiche.findUnique({
        where: { mockExamId_subjectId: { mockExamId: examId, subjectId } },
      });
      if (signed?.signedAt) {
        throw new ForbiddenException('Cette fiche est signée. Annulez la signature avant de modifier les notes.');
      }
    }
    await this.prisma.$transaction(
      grades.map((g) =>
        this.prisma.mockExamGrade.upsert({
          where: {
            mockExamId_studentId_subjectId: {
              mockExamId: examId,
              studentId: g.studentId,
              subjectId,
            },
          },
          update:  { score: g.score ?? null, coefficient },
          create:  { mockExamId: examId, studentId: g.studentId, subjectId, score: g.score ?? null, coefficient },
        }),
      ),
    );
    return { message: 'Notes sauvegardées.' };
  }

  // ─── Get palmares (proclamation des résultats) ────────────────────────────
  async getPalmares(examId: string, institutionId: string) {
    const sheet = await this.getGradeSheet(examId, institutionId);

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { name: true, address: true, phone: true, logo: true, brandingSettings: true },
    });

    const students = [...sheet.students].sort(
      (a, b) => (a.rank ?? 9999) - (b.rank ?? 9999),
    );

    const isBac = sheet.exam.examType === 'BAC1' || sheet.exam.examType === 'BAC2';
    const withGrades  = students.filter((s) => s.average != null).length;
    const admitted    = students.filter((s) => s.average != null && s.average >= 10).length;
    const admissible  = isBac
      ? students.filter((s) => s.average != null && s.average >= 9 && s.average < 10).length
      : 0;
    const ajourne     = withGrades - admitted - admissible;

    return {
      institution: {
        name: institution?.name ?? '',
        address: institution?.address ?? '',
        logo: institution?.logo ?? null,
        circonscription: (institution?.brandingSettings as any)?.circonscription ?? null,
      },
      exam: sheet.exam,
      subjects: sheet.subjects,
      students,
      summary: {
        total: students.length,
        withGrades,
        admitted,
        admissible,
        ajourne,
        isBac,
        passingRate: withGrades > 0 ? round2((admitted / withGrades) * 100) : 0,
      },
    };
  }

  // ─── Save grades for an exam ─────────────────────────────────────────────────
  async saveGrades(examId: string, dto: SaveMockExamGradesDto, institutionId: string) {
    const exam = await this.findExamOrThrow(examId, institutionId);
    if (exam.status === 'PUBLISHED') {
      throw new ForbiddenException('Impossible de modifier un examen publié.');
    }

    await this.prisma.$transaction(
      dto.grades.map((g) =>
        this.prisma.mockExamGrade.upsert({
          where: {
            mockExamId_studentId_subjectId: {
              mockExamId: examId,
              studentId: g.studentId,
              subjectId: g.subjectId,
            },
          },
          update: {
            score: g.score ?? null,
            coefficient: g.coefficient ?? 1,
          },
          create: {
            mockExamId: examId,
            studentId: g.studentId,
            subjectId: g.subjectId,
            score: g.score ?? null,
            coefficient: g.coefficient ?? 1,
          },
        }),
      ),
    );

    return { message: 'Notes sauvegardées.' };
  }

  // ─── Update exam type ────────────────────────────────────────────────────────
  async updateType(examId: string, institutionId: string, examType: string) {
    await this.findExamOrThrow(examId, institutionId);
    return this.prisma.mockExam.update({
      where: { id: examId },
      data: { examType: examType as any },
    });
  }

  // ─── Update exam dates ───────────────────────────────────────────────────────
  async updateDates(examId: string, institutionId: string, examDate?: string | null, examEndDate?: string | null) {
    await this.findExamOrThrow(examId, institutionId);
    return this.prisma.mockExam.update({
      where: { id: examId },
      data: {
        examDate:    examDate    !== undefined ? (examDate    ? new Date(examDate)    : null) : undefined,
        examEndDate: examEndDate !== undefined ? (examEndDate ? new Date(examEndDate) : null) : undefined,
      },
    });
  }

  // ─── Publish exam ────────────────────────────────────────────────────────────
  async publish(examId: string, institutionId: string) {
    await this.findExamOrThrow(examId, institutionId);
    return this.prisma.mockExam.update({
      where: { id: examId },
      data: { status: 'PUBLISHED' as any },
    });
  }

  // ─── Revert to draft ─────────────────────────────────────────────────────────
  async unpublish(examId: string, institutionId: string) {
    await this.findExamOrThrow(examId, institutionId);
    return this.prisma.mockExam.update({
      where: { id: examId },
      data: { status: 'DRAFT' as any },
    });
  }

  // ─── Delete (draft only) ──────────────────────────────────────────────────────
  async delete(examId: string, institutionId: string) {
    const exam = await this.findExamOrThrow(examId, institutionId);
    if (exam.status === 'PUBLISHED') {
      throw new ForbiddenException('Impossible de supprimer un examen publié.');
    }
    await this.prisma.mockExam.delete({ where: { id: examId } });
    return { message: 'Examen supprimé.' };
  }

  // ─── Get relevé (for printing) ───────────────────────────────────────────────
  async getReleve(examId: string, institutionId: string, studentId?: string) {
    const sheet = await this.getGradeSheet(examId, institutionId);

    // Get institution details for the header
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { name: true, address: true, phone: true, logo: true, brandingSettings: true },
    });

    const students = studentId
      ? sheet.students.filter((s) => s.studentId === studentId)
      : sheet.students;

    return {
      institution: {
        name: institution?.name ?? '',
        address: institution?.address ?? '',
        phone: institution?.phone ?? '',
        logo: institution?.logo ?? null,
        circonscription: (institution?.brandingSettings as any)?.circonscription ?? null,
      },
      exam: sheet.exam,
      subjects: sheet.subjects,
      students,
    };
  }

  // ─── Private ─────────────────────────────────────────────────────────────────
  private async findExamOrThrow(examId: string, institutionId: string) {
    const exam = await this.prisma.mockExam.findFirst({
      where: { id: examId, institutionId },
      include: { class: { select: { name: true } } },
    });
    if (!exam) throw new NotFoundException('Examen introuvable.');
    return exam;
  }
}
