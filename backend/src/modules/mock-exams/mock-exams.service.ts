import { BadRequestException, Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import archiver = require('archiver');
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService, ReleveData, isPrimaryLevel, isSecondaryLevel, primarySubjectMax } from '../pdf/pdf.service';
import { CreateMockExamDto } from './dto/create-mock-exam.dto';
import { SaveMockExamGradesDto } from './dto/save-grades.dto';

/** Barème de la session : compositions mensuelles (primaire) sur 10, le reste sur 20. */
export function examScale(examType: string | null | undefined): number {
  return examType === 'COMPOSITION_MENSUELLE' ? 10 : 20;
}

/**
 * Barème d'une matière dans la session : aux compositions mensuelles, celui de la matière
 * (« Noté sur » 10 ou 20, réglé dans Matières) ; ailleurs, celui de la session (sur 20).
 */
export function subjectScale(examType: string | null | undefined, subjectMaxScore: number | null | undefined): number {
  return examType === 'COMPOSITION_MENSUELLE' ? primarySubjectMax(subjectMaxScore) : examScale(examType);
}

/** Appréciation d'une note exprimée sur `scale` (seuils définis sur 20). */
function appreciation(raw: number | null, scale = 20): string {
  if (raw == null) return '';
  const score = (raw * 20) / scale;
  if (score >= 16) return 'Très Bien';
  if (score >= 14) return 'Bien';
  if (score >= 12) return 'Assez Bien';
  if (score >= 10) return 'Passable';
  return 'Insuffisant';
}

function round2(v: number) { return Math.round(v * 100) / 100; }

@Injectable()
export class MockExamsService {
  private readonly logger = new Logger(MockExamsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: PdfService,
  ) {}

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

  /**
   * L'administrateur crée et gère toutes les sessions — examens blancs comme devoirs surveillés
   * (création, dates, type, publication, suppression). Les professeurs appliquent : ils saisissent
   * et signent les notes de leur matière. `target` : id d'une session existante, ou { examType }.
   */
  async assertCanManage(target: string | { examType?: string }, role: string, institutionId: string) {
    if (role === 'ADMIN') return;
    if (typeof target === 'string') {
      const exam = await this.prisma.mockExam.findFirst({ where: { id: target, institutionId }, select: { id: true } });
      if (!exam) throw new NotFoundException('Session introuvable');
    }
    throw new ForbiddenException("Seul l'administrateur peut créer et gérer les sessions d'examens et de devoirs surveillés");
  }

  // ─── Create a new mock exam session ─────────────────────────────────────────
  async create(dto: CreateMockExamDto, userId: string, institutionId: string) {
    const cls = await this.prisma.class.findFirst({
      where: { id: dto.classId, institutionId },
    });
    if (!cls) throw new NotFoundException('Classe introuvable');
    // Les compositions mensuelles sont propres au primaire (notes sur 10)
    if (dto.examType === ('COMPOSITION_MENSUELLE' as any) && !isPrimaryLevel(cls.level)) {
      throw new BadRequestException('Les compositions mensuelles concernent uniquement les classes du CI au CM2');
    }
    // Les devoirs surveillés sont propres au secondaire (6ème → Terminale)
    if (dto.examType === ('DEVOIR_SURVEILLE' as any) && !isSecondaryLevel(cls.level)) {
      throw new BadRequestException('Les devoirs surveillés concernent uniquement les classes de la 6ème à la Terminale');
    }

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
      include: { subject: { select: { id: true, nameFr: true, nameEn: true, code: true, maxScore: true } } },
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
      // Barème de la matière pour cette session (/10 ou /20 aux compositions mensuelles)
      maxScore: subjectScale(exam.examType, cs.subject.maxScore),
    }));

    const scale = examScale(exam.examType);
    const students = classStudents.map((cs) => {
      const student = cs.student;
      const gradesForStudent = subjects.map((subj) => {
        const g = gradeMap.get(`${student.id}:${subj.id}`);
        return {
          subjectId: subj.id,
          coefficient: g?.coefficient ?? subj.coefficient,
          maxScore: subj.maxScore,
          score: g?.score ?? null,
          appreciation: appreciation(g?.score ?? null, subj.maxScore),
        };
      });

      // Total et moyenne : points obtenus sur points possibles, ramenés au barème de la session.
      // Toutes les matières sur 20 → moyenne pondérée classique ; compositions mensuelles → total des
      // notes (chacune sur 10 ou 20) ÷ total des barèmes × 10.
      const filled = gradesForStudent.filter((g) => g.score != null);
      const totalMax = filled.reduce((s, g) => s + g.maxScore * g.coefficient, 0);
      const totalPoints = filled.reduce((s, g) => s + (g.score ?? 0) * g.coefficient, 0);
      const average = totalMax > 0 ? round2((totalPoints / totalMax) * scale) : null;

      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        studentName: student.user?.name ?? student.admissionNumber,
        sex: student.sex ?? null,
        grades: gradesForStudent,
        average,
        appreciation: appreciation(average, scale),
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
        scale,
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
    await this.assertWithinScale(exam.examType, grades.map((g) => ({ subjectId, score: g.score })));
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

  /** Refuse une note négative ou au-dessus du barème de sa matière (/10 ou /20). */
  private async assertWithinScale(examType: string, grades: { subjectId: string; score?: number | null }[]) {
    const ids = [...new Set(grades.map((g) => g.subjectId))];
    const subjects = await this.prisma.subject.findMany({
      where: { id: { in: ids } },
      select: { id: true, nameFr: true, maxScore: true },
    });
    const byId = new Map(subjects.map((s) => [s.id, s]));
    for (const g of grades) {
      if (g.score == null) continue;
      const subj = byId.get(g.subjectId);
      const max = subjectScale(examType, subj?.maxScore);
      if (g.score < 0 || g.score > max) {
        throw new BadRequestException(`Note invalide en ${subj?.nameFr ?? 'cette matière'} : elle doit être comprise entre 0 et ${max}.`);
      }
    }
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
    const pass = examScale(sheet.exam.examType) / 2; // 10/20, ou 5/10 pour les compositions mensuelles
    const admitted    = students.filter((s) => s.average != null && s.average >= pass).length;
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
    await this.assertWithinScale(exam.examType, dto.grades);

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

  // ─── Relevés en PDF (même charte que les bulletins) ──────────────────────────

  private static readonly TYPE_LABELS: Record<string, string> = {
    BLANC: 'Examen blanc', CEPE: 'CEPE blanc', BEPC: 'BEPC blanc',
    BAC1: 'BAC 1re partie blanc', BAC2: 'BAC 2e partie blanc', DEVOIR_SURVEILLE: 'Devoir surveillé',
    COMPOSITION_MENSUELLE: 'Composition mensuelle',
  };

  /** Données prêtes pour le gabarit PDF, pour un élève ou pour toute la classe. */
  private async buildReleveData(examId: string, institutionId: string, studentId?: string): Promise<ReleveData[]> {
    const sheet = await this.getGradeSheet(examId, institutionId);
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: {
        name: true, country: true, countryMotto: true, address: true, phone: true, email: true,
        website: true, motto: true, logo: true, crest: true, stamp: true, brandingSettings: true,
      },
    });
    if (!institution) throw new NotFoundException('Établissement introuvable');

    const students = studentId ? sheet.students.filter((s) => s.studentId === studentId) : sheet.students;
    if (!students.length) throw new NotFoundException('Élève introuvable dans cette session');

    // Photo et date de naissance : absentes de la feuille de notes
    const details = await this.prisma.student.findMany({
      where: { id: { in: students.map((s) => s.studentId) } },
      select: { id: true, dateOfBirth: true, user: { select: { profileImage: true } } },
    });
    const detailById = new Map(details.map((d) => [d.id, d]));
    const subjectName = new Map(sheet.subjects.map((s: any) => [s.id, s.nameFr]));

    return students.map((s) => ({
      institution,
      exam: {
        label: sheet.exam.label,
        examType: sheet.exam.examType,
        scale: examScale(sheet.exam.examType),
        typeLabel: MockExamsService.TYPE_LABELS[sheet.exam.examType] ?? sheet.exam.examType,
        className: sheet.exam.class?.name ?? '',
        academicYear: sheet.exam.academicYear,
        examDate: sheet.exam.examDate,
        examEndDate: sheet.exam.examEndDate,
      },
      student: {
        name: s.studentName,
        admissionNumber: s.admissionNumber,
        sex: s.sex,
        dateOfBirth: detailById.get(s.studentId)?.dateOfBirth ?? null,
        photo: detailById.get(s.studentId)?.user?.profileImage ?? null,
      },
      rows: s.grades.map((g) => ({
        subject: subjectName.get(g.subjectId) ?? '—',
        score: g.score,
        coefficient: g.coefficient,
        max: g.maxScore,
        appreciation: g.appreciation,
      })),
      average: s.average,
      appreciation: s.appreciation,
      rank: s.rank,
      classSize: s.classSize,
    }));
  }

  private releveFilename(d: ReleveData) {
    const safe = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `releve-${safe(d.student.name)}-${safe(d.exam.label)}.pdf`;
  }

  async relevePdf(examId: string, institutionId: string, studentId: string) {
    const [data] = await this.buildReleveData(examId, institutionId, studentId);
    const buffer = await this.pdf.generateRelevePdfBuffer(data);
    return { buffer, filename: this.releveFilename(data) };
  }

  /** Tous les relevés de la session dans un ZIP (un PDF par élève), comme l'export des bulletins. */
  async releveZip(examId: string, institutionId: string): Promise<{ buffer: Buffer; filename: string }> {
    const all = await this.buildReleveData(examId, institutionId);
    const zip = archiver('zip', { zlib: { level: 6 } });
    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve, reject) => {
      zip.on('data', (c: Buffer) => chunks.push(c));
      zip.on('end', () => resolve(Buffer.concat(chunks)));
      zip.on('error', reject);
    });
    // Séquentiel : un seul navigateur Puppeteer, mémoire maîtrisée
    for (const d of all) {
      try {
        zip.append(await this.pdf.generateRelevePdfBuffer(d), { name: this.releveFilename(d) });
      } catch (err: any) {
        this.logger.error(`Relevé ZIP: élève ${d.student.admissionNumber} ignoré — ${err?.message ?? err}`);
      }
    }
    await zip.finalize();
    const buffer = await done;
    const exam = all[0].exam;
    const safe = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
    return { buffer, filename: `releves-${safe(exam.className)}-${safe(exam.label)}.zip` };
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
