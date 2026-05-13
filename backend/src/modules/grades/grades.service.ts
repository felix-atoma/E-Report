import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { BulkGradesDto } from './dto/bulk-grades.dto';
import { SaveClassGradesDto } from './dto/save-class-grades.dto';

type AppreciationLang = 'fr' | 'en' | 'de' | 'es' | 'ar';

const APPRECIATION_LABELS: Record<AppreciationLang, [string, string, string, string, string]> = {
  fr: ['Très Bien',  'Bien',  'Assez Bien',   'Passable',    'Insuffisant'],
  en: ['Very Good',  'Good',  'Fairly Good',  'Satisfactory','Insufficient'],
  de: ['Sehr gut',   'Gut',   'Befriedigend', 'Ausreichend', 'Ungenügend'],
  es: ['Muy bien',   'Bien',  'Bastante bien','Suficiente',  'Insuficiente'],
  ar: ['ممتاز',      'جيد جداً', 'جيد',       'مقبول',       'ضعيف'],
};

function detectAppreciationLang(subjectName: string): AppreciationLang {
  const n = subjectName.toLowerCase();
  if (n.includes('anglais')  || n.includes('english')) return 'en';
  if (n.includes('allemand') || n.includes('deutsch'))  return 'de';
  if (n.includes('espagnol') || n.includes('español'))  return 'es';
  if (n.includes('arabe')    || n.includes('arabic'))   return 'ar';
  return 'fr';
}

function computeAppreciation(moy: number | null, subjectName?: string): string | null {
  if (moy === null) return null;
  const lang = subjectName ? detectAppreciationLang(subjectName) : 'fr';
  const [vg, g, fg, p, f] = APPRECIATION_LABELS[lang];
  if (moy >= 16) return vg;
  if (moy >= 14) return g;
  if (moy >= 12) return fg;
  if (moy >= 10) return p;
  return f;
}

function computeMoyenneMatiere(
  interro1: number | null,
  interro2: number | null,
  interro3: number | null,
  interro4: number | null,
  devoir: number | null,
  composition: number | null,
): number | null {
  // Average of all filled interrogations (equally weighted among themselves)
  const interros = [interro1, interro2, interro3, interro4].filter((v) => v !== null && v !== undefined) as number[];
  const moyInterros = interros.length > 0 ? interros.reduce((a, b) => a + b, 0) / interros.length : null;

  // Togolese formula: interros×1 + devoir×2 + compo×3  →  divide by total weight
  let weightedSum = 0;
  let totalWeight = 0;

  if (moyInterros !== null)                     { weightedSum += moyInterros * 1; totalWeight += 1; }
  if (devoir !== null && devoir !== undefined)  { weightedSum += devoir * 2;      totalWeight += 2; }
  if (composition !== null && composition !== undefined) { weightedSum += composition * 3; totalWeight += 3; }

  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Existing: grades by report card ────────────────────────────────────

  async findByReport(reportId: string, requestingUserId: string, requestingRole: Role) {
    const report = await this.prisma.reportCard.findUnique({
      where: { id: reportId },
      include: { class: true },
    });
    if (!report) throw new NotFoundException('Report card not found');
    await this.assertReportAccess(report, requestingUserId, requestingRole);

    return this.prisma.grade.findMany({
      where: { reportCardId: reportId },
      include: {
        subject: { select: { id: true, nameFr: true, nameEn: true, code: true, passMark: true } },
      },
      orderBy: { subject: { nameFr: 'asc' } },
    });
  }

  async bulkUpsert(reportId: string, dto: BulkGradesDto, requestingUserId: string, requestingRole: Role) {
    const report = await this.prisma.reportCard.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report card not found');
    if (report.status === 'PUBLISHED') throw new ForbiddenException('Cannot edit grades on a published report');
    await this.assertReportAccess(report, requestingUserId, requestingRole);

    await this.prisma.$transaction(
      dto.grades.map((g) =>
        this.prisma.grade.upsert({
          where: { reportCardId_subjectId: { reportCardId: reportId, subjectId: g.subjectId } },
          create: {
            reportCardId: reportId,
            subjectId: g.subjectId,
            score: g.score,
            moyenneMatiere: g.score,
            coefficient: g.coefficient,
            weightedScore: g.score * g.coefficient,
            teacherComment: g.teacherComment,
          },
          update: {
            score: g.score,
            moyenneMatiere: g.score,
            coefficient: g.coefficient,
            weightedScore: g.score * g.coefficient,
            teacherComment: g.teacherComment,
          },
        }),
      ),
    );

    return this.findByReport(reportId, requestingUserId, requestingRole);
  }

  // ─── NEW: fiche de notes — class × subject grade entry ──────────────────

  async getForClassSubject(
    classId: string,
    subjectId: string,
    academicYear: string,
    termNumber: number,
    requestingUserId: string,
    requestingRole: Role,
  ) {
    await this.assertClassAccess(classId, requestingUserId, requestingRole);

    // Get all students enrolled in this class for this year
    const enrollments = await this.prisma.classStudent.findMany({
      where: { classId, academicYear },
      include: {
        student: {
          select: {
            id: true,
            admissionNumber: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { student: { admissionNumber: 'asc' } },
    });

    // Get subject info
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, nameFr: true, code: true, passMark: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    // Get the teacher assigned to this class/subject for name pre-fill
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { classId_subjectId: { classId, subjectId } },
      include: { teacher: { select: { id: true, name: true } } },
    });
    const defaultTeacherName = classSubject?.teacher?.name ?? null;

    // Get fiche signature status
    const fiche = await this.prisma.gradeFiche.findUnique({
      where: { classId_subjectId_academicYear_termNumber: { classId, subjectId, academicYear, termNumber } },
    });

    // For each student, find existing grade (via their report card for this term)
    const results = await Promise.all(
      enrollments.map(async (en) => {
        const reportCard = await this.prisma.reportCard.findUnique({
          where: {
            studentId_academicYear_termNumber: {
              studentId: en.student.id,
              academicYear,
              termNumber,
            },
          },
        });

        const grade = reportCard
          ? await this.prisma.grade.findUnique({
              where: {
                reportCardId_subjectId: { reportCardId: reportCard.id, subjectId },
              },
            })
          : null;

        return {
          studentId: en.student.id,
          admissionNumber: en.student.admissionNumber,
          studentName: en.student.user?.name ?? en.student.admissionNumber,
          reportCardId: reportCard?.id ?? null,
          noteInterro1: grade?.noteInterro1 ?? null,
          noteInterro2: grade?.noteInterro2 ?? null,
          noteInterro3: grade?.noteInterro3 ?? null,
          noteInterro4: grade?.noteInterro4 ?? null,
          noteDevoir: grade?.noteDevoir ?? null,
          noteComposition: grade?.noteComposition ?? null,
          moyenneMatiere: grade?.moyenneMatiere ?? null,
          coefficient: grade?.coefficient ?? 1,
          rangMatiere: grade?.rangMatiere ?? null,
          appreciation: grade?.appreciation ?? null,
          teacherComment: grade?.teacherComment ?? null,
          teacherName: grade?.teacherName ?? defaultTeacherName,
        };
      }),
    );

    return {
      classId,
      subjectId,
      subject,
      teacher: classSubject?.teacher ?? null,
      academicYear,
      termNumber,
      students: results,
      fiche: fiche
        ? {
            signedAt: fiche.signedAt,
            signedByName: fiche.signedByName,
            isSigned: !!fiche.signedAt,
            signatureData: fiche.signatureData ?? null,
          }
        : { signedAt: null, signedByName: null, isSigned: false, signatureData: null },
    };
  }

  async saveForClassSubject(
    classId: string,
    subjectId: string,
    dto: SaveClassGradesDto,
    requestingUserId: string,
    requestingRole: Role,
  ) {
    await this.assertClassAccess(classId, requestingUserId, requestingRole);

    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new NotFoundException('Subject not found');

    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');

    // Block editing a signed fiche (unless admin)
    if (requestingRole !== Role.ADMIN) {
      const existingFiche = await this.prisma.gradeFiche.findUnique({
        where: { classId_subjectId_academicYear_termNumber: { classId, subjectId, academicYear: dto.academicYear, termNumber: dto.termNumber } },
      });
      if (existingFiche?.signedAt) {
        throw new BadRequestException('Cette fiche est signée et verrouillée. Annulez la signature avant de modifier les notes.');
      }
    }

    // Process each student row
    const rows = await Promise.all(
      dto.grades.map(async (row) => {
        // Ensure report card exists for this student/class/term
        let reportCard = await this.prisma.reportCard.findUnique({
          where: {
            studentId_academicYear_termNumber: {
              studentId: row.studentId,
              academicYear: dto.academicYear,
              termNumber: dto.termNumber,
            },
          },
        });

        if (!reportCard) {
          reportCard = await this.prisma.reportCard.create({
            data: {
              studentId: row.studentId,
              classId,
              academicYear: dto.academicYear,
              termType: 'TRIMESTRE',
              termNumber: dto.termNumber,
              termName: dto.termName,
              createdById: requestingUserId,
            },
          });
        }

        const moy = computeMoyenneMatiere(
          row.noteInterro1 ?? null,
          row.noteInterro2 ?? null,
          row.noteInterro3 ?? null,
          row.noteInterro4 ?? null,
          row.noteDevoir ?? null,
          row.noteComposition ?? null,
        );

        const coef = row.coefficient ?? 1;

        const gradeData = {
          noteInterro1: row.noteInterro1,
          noteInterro2: row.noteInterro2,
          noteInterro3: row.noteInterro3,
          noteInterro4: row.noteInterro4,
          noteDevoir: row.noteDevoir,
          noteComposition: row.noteComposition,
          moyenneMatiere: moy,
          coefficient: coef,
          weightedScore: moy !== null ? moy * coef : 0,
          score: moy ?? 0,
          appreciation: computeAppreciation(moy, subject.nameFr),
          teacherComment: row.teacherComment,
          teacherName: row.teacherName,
        };

        await (this.prisma.grade as any).upsert({
          where: { reportCardId_subjectId: { reportCardId: reportCard.id, subjectId } },
          create: { reportCardId: reportCard.id, subjectId, ...gradeData },
          update: gradeData,
        });

        return { studentId: row.studentId, reportCardId: reportCard.id, moyenneMatiere: moy };
      }),
    );

    // Recompute rangMatiere: rank students by moyenneMatiere desc
    const withMoy = rows.filter((r) => r.moyenneMatiere !== null)
      .sort((a, b) => (b.moyenneMatiere ?? 0) - (a.moyenneMatiere ?? 0));

    let rank = 1;
    for (let i = 0; i < withMoy.length; i++) {
      if (i > 0 && withMoy[i].moyenneMatiere !== withMoy[i - 1].moyenneMatiere) rank = i + 1;
      const grade = await this.prisma.grade.findFirst({
        where: { reportCard: { id: withMoy[i].reportCardId }, subjectId },
      });
      if (grade) {
        await this.prisma.grade.update({ where: { id: grade.id }, data: { rangMatiere: rank } });
      }
    }

    // Return the updated fiche
    return this.getForClassSubject(classId, subjectId, dto.academicYear, dto.termNumber, requestingUserId, requestingRole);
  }

  // ─── List all fiche statuses for a class/term ────────────────────────────

  async listFiches(classId: string, academicYear: string, termNumber: number, userId: string, role: Role) {
    // ADMIN/TEACHER get the full class-access check.
    // STUDENT/PARENT/BURSAR can read fiche signatures for bulletin display (read-only).
    if (role === Role.ADMIN || role === Role.TEACHER) {
      await this.assertClassAccess(classId, userId, role);
    }

    const classSubjects = await this.prisma.classSubject.findMany({
      where: { classId },
      include: { subject: { select: { id: true, nameFr: true, code: true } } },
    });

    const fiches = await this.prisma.gradeFiche.findMany({
      where: { classId, academicYear, termNumber },
    });

    const ficheMap = new Map(fiches.map((f) => [f.subjectId, f]));

    return classSubjects.map((cs) => {
      const fiche = ficheMap.get(cs.subjectId);
      return {
        subjectId: cs.subjectId,
        subject: cs.subject,
        isSigned: !!fiche?.signedAt,
        signedAt: fiche?.signedAt ?? null,
        signedByName: fiche?.signedByName ?? null,
        signatureData: fiche?.signatureData ?? null,
      };
    });
  }

  // ─── Fiche signature ────────────────────────────────────────────────────

  async signFiche(
    classId: string,
    subjectId: string,
    academicYear: string,
    termNumber: number,
    userId: string,
    role: Role,
    signatureData?: string,
  ) {
    await this.assertClassAccess(classId, userId, role);

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    if (!user) throw new NotFoundException('User not found');

    // Check at least one grade exists for this fiche
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { students: { where: { academicYear } } },
    });
    if (!cls) throw new NotFoundException('Class not found');

    if (!signatureData) {
      if (role === Role.ADMIN) {
        signatureData = 'ADMIN_VERIFIED';
      } else {
        throw new BadRequestException('Une signature manuscrite est requise pour valider la fiche.');
      }
    }

    return this.prisma.gradeFiche.upsert({
      where: { classId_subjectId_academicYear_termNumber: { classId, subjectId, academicYear, termNumber } },
      create: {
        classId,
        subjectId,
        academicYear,
        termNumber,
        termName: `Trimestre ${termNumber}`,
        signedAt: new Date(),
        signedByName: user.name,
        signedById: userId,
        signatureData,
      },
      update: {
        signedAt: new Date(),
        signedByName: user.name,
        signedById: userId,
        signatureData,
      },
    });
  }

  async unsignFiche(
    classId: string,
    subjectId: string,
    academicYear: string,
    termNumber: number,
    userId: string,
    role: Role,
  ) {
    await this.assertClassAccess(classId, userId, role);

    const fiche = await this.prisma.gradeFiche.findUnique({
      where: { classId_subjectId_academicYear_termNumber: { classId, subjectId, academicYear, termNumber } },
    });
    if (!fiche || !fiche.signedAt) return { message: 'Fiche was not signed' };

    // Only the signer or admin can retract
    if (role !== Role.ADMIN && fiche.signedById !== userId) {
      throw new ForbiddenException('Seul le signataire peut annuler la signature');
    }

    return this.prisma.gradeFiche.update({
      where: { id: fiche.id },
      data: { signedAt: null, signedByName: null, signedById: null },
    });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private async assertReportAccess(report: { createdById: string; classId: string }, userId: string, role: Role) {
    if (role === Role.ADMIN) return;
    if (role === Role.TEACHER) {
      if (report.createdById === userId) return;
      const cls = await this.prisma.class.findFirst({ where: { id: report.classId, teacherId: userId } });
      if (cls) return;
      throw new ForbiddenException('You do not have access to this report');
    }
    throw new ForbiddenException('Access denied');
  }

  private async assertClassAccess(classId: string, userId: string, role: Role) {
    if (role === Role.ADMIN) return;
    if (role === Role.TEACHER) {
      const cls = await this.prisma.class.findFirst({
        where: { id: classId, OR: [{ teacherId: userId }, { subjects: { some: { teacherId: userId } } }] },
      });
      if (cls) return;
      throw new ForbiddenException('You do not teach in this class');
    }
    throw new ForbiddenException('Access denied');
  }
}
