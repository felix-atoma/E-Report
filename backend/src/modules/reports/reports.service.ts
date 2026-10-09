import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import archiver = require('archiver');
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService, isPrimaryLevel, primaryTotals, nextTermStart, primarySubjectMax } from '../pdf/pdf.service';
import { AttendanceService, resolveTermRange } from '../attendance/attendance.service';
import { suggestConduct, ConductSuggestion } from './conduct-suggestion';
import {
  annualSettings, annualAverage as computeAnnualAverage, proposedDecision, expectedTermCount as termCountFor, rankWithTies,
} from './annual';
import { AiService } from '../ai/ai.service';

const CONDUCT_LABELS_FR: Record<string, string> = {
  TRES_BIEN: 'Très bien', BIEN: 'Bien', PASSABLE: 'Passable', MEDIOCRE: 'Médiocre',
};
import { Role } from '../../common/enums/role.enum';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { TitulaireEntryDto } from './dto/titulaire-entry.dto';
import { BulkZipDto } from './dto/bulk-zip.dto';

function computeMention(avg: number): string {
  if (avg >= 18) return 'Excellent';
  if (avg >= 16) return 'Très Bien';
  if (avg >= 14) return 'Bien';
  if (avg >= 12) return 'Assez Bien';
  if (avg >= 10) return 'Passable';
  return 'Insuffisant';
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateSecurityCode(academicYear: string, termNumber: number): string {
  const parts = academicYear.split('-');
  const sy = (parts[0] ?? '').slice(-2);
  const ey = (parts[1] ?? String(Number(parts[0] ?? '2024') + 1)).slice(-2);
  const rand = (n: number) =>
    Array.from({ length: n }, () =>
      CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
    ).join('');
  return `${sy}${ey}T${termNumber}-${rand(4)}-${rand(4)}`;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly pdf: PdfService,
    private readonly attendance: AttendanceService,
    private readonly ai: AiService,
  ) {}

  async palmares(
    institutionId: string,
    filters: { classId?: string; academicYear?: string; termName?: string },
  ) {
    const where: any = {
      class: { institutionId },
      status: 'PUBLISHED',
    };
    if (filters.classId) where.classId = filters.classId;
    if (filters.academicYear) where.academicYear = filters.academicYear;
    if (filters.termName) where.termName = filters.termName;

    return this.prisma.reportCard.findMany({
      where,
      include: {
        student: { include: { user: { select: { name: true } } } },
        class: { select: { id: true, name: true } },
      },
      orderBy: [{ classRank: 'asc' }, { overallAverage: 'desc' }],
    });
  }

  async findAll(
    institutionId: string,
    userId: string,
    role: Role,
    filters: { classId?: string; studentId?: string; academicYear?: string; termNumber?: number },
  ) {
    const where: any = { class: { institutionId } };

    if (role === Role.TEACHER) {
      where.OR = [
        { createdById: userId },
        { class: { teacherId: userId } },
        { class: { subjects: { some: { teacherId: userId } } } },
      ];
    }
    if (role === Role.STUDENT) {
      const student = await this.prisma.student.findFirst({ where: { userId } });
      if (student) where.studentId = student.id;
    }
    if (role === Role.PARENT) {
      const children = await this.prisma.student.findMany({ where: { parentId: userId }, select: { id: true } });
      where.studentId = { in: children.map((c) => c.id) };
    }

    if (filters.classId) where.classId = filters.classId;
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.academicYear) where.academicYear = filters.academicYear;
    if (filters.termNumber) where.termNumber = filters.termNumber;

    const reports = await this.prisma.reportCard.findMany({
      where,
      include: {
        student: { include: { user: { select: { name: true } } } },
        class: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ academicYear: 'desc' }, { termNumber: 'desc' }, { student: { admissionNumber: 'asc' } }],
    });

    // Page du titulaire (une classe, un trimestre) : conduite proposée pour chaque élève
    if ((role === Role.TEACHER || role === Role.ADMIN) && filters.classId && filters.termNumber && reports.length) {
      const suggestions = await this.conductSuggestions(institutionId, reports);
      return reports.map((r) => ({ ...r, conductSuggestion: suggestions.get(r.id) ?? null }));
    }
    return reports;
  }

  /**
   * Conduite proposée par bulletin : absences non justifiées, retards et dossier disciplinaire
   * de la période du bulletin. Proposition seulement : le titulaire décide.
   */
  private async conductSuggestions(
    institutionId: string,
    reports: Array<{ id: string; studentId: string; academicYear: string; termType: any; termNumber: number;
      attendanceAbsent?: number | null; attendanceLateMinutes?: number | null; warnings?: number | null }>,
  ): Promise<Map<string, ConductSuggestion>> {
    const out = new Map<string, ConductSuggestion>();
    if (!reports.length) return out;
    const inst = await this.prisma.institution.findUnique({ where: { id: institutionId }, select: { academicSettings: true } });
    // Période de chaque bulletin, puis dossier disciplinaire des élèves concernés sur l'ensemble
    const ranges = new Map(reports.map((r) => [r.id,
      resolveTermRange(inst?.academicSettings, r.academicYear, String(r.termType ?? 'TRIMESTRE'), r.termNumber)]));
    const starts = [...ranges.values()].filter(Boolean).map((x) => x!.start.getTime());
    const ends = [...ranges.values()].filter(Boolean).map((x) => x!.end.getTime());
    const records = starts.length
      ? await this.prisma.disciplinaryRecord.findMany({
        where: {
          institutionId,
          studentId: { in: [...new Set(reports.map((r) => r.studentId))] },
          date: { gte: new Date(Math.min(...starts)), lte: new Date(Math.max(...ends) + 86_400_000) },
        },
        select: { studentId: true, type: true, date: true },
      })
      : [];
    for (const r of reports) {
      const range = ranges.get(r.id);
      const discipline = range
        ? records.filter((d) => d.studentId === r.studentId && d.date >= range.start && d.date.getTime() < range.end.getTime() + 86_400_000)
        : [];
      out.set(r.id, suggestConduct({
        absentDays: r.attendanceAbsent,
        lateMinutes: r.attendanceLateMinutes,
        warnings: r.warnings,
        discipline,
      }));
    }
    return out;
  }

  async findOne(id: string, institutionId: string, userId?: string, role?: Role) {
    const report = await this.prisma.reportCard.findFirst({
      where: { id, class: { institutionId } },
      include: {
        student: {
          include: {
            user: { select: { name: true, profileImage: true } },
            parent: { select: { id: true, name: true } },
          },
        },
        class: {
          select: {
            id: true, name: true, level: true, series: true,
            teacher: { select: { id: true, name: true } },
            subjects: { include: { subject: { select: { id: true, nameFr: true, code: true, passMark: true } } }, orderBy: { subject: { nameFr: 'asc' } } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        grades: {
          include: { subject: { select: { id: true, nameFr: true, nameEn: true, code: true, passMark: true, maxScore: true } } },
          orderBy: { coefficient: 'desc' },
        },
      },
    });
    if (!report) throw new NotFoundException('Report card not found');

    if (role === Role.TEACHER && userId) {
      const hasAccess = await this.prisma.class.findFirst({
        where: {
          id: report.classId,
          OR: [
            { teacherId: userId },
            { subjects: { some: { teacherId: userId } } },
          ],
        },
      });
      if (!hasAccess && report.createdById !== userId) {
        throw new ForbiddenException('You do not have access to this report');
      }
    }

    // Signature du titulaire (celle de ses fiches de notes) pour le bas du bulletin
    const classTeacherSignature = await this.titulaireSignature(
      report.class?.teacher?.id, report.classId, report.academicYear, report.termNumber,
    );
    // Primaire : date de la rentrée suivante (dates réglées dans Paramètres)
    let nextTerm: { label: string; dateLabel: string } | null = null;
    if (isPrimaryLevel(report.class?.level)) {
      const inst = await this.prisma.institution.findUnique({ where: { id: institutionId }, select: { academicSettings: true } });
      nextTerm = nextTermStart(inst?.academicSettings, report.academicYear, report.termType, report.termNumber);
    }
    const conductSuggestion = role === Role.TEACHER || role === Role.ADMIN
      ? (await this.conductSuggestions(institutionId, [report as any])).get(report.id) ?? null
      : null;
    return { ...report, classTeacherSignature, nextTerm, conductSuggestion };
  }

  /**
   * Signature du titulaire affichée sur le bulletin : la même que celle qu'il appose sur ses fiches
   * de notes. On prend de préférence sa fiche signée de cette classe et de ce trimestre, sinon sa
   * fiche signée la plus récente. Les validations administratives (« ADMIN_VERIFIED ») ne comptent pas.
   */
  private async titulaireSignature(
    teacherId: string | null | undefined, classId: string, academicYear: string, termNumber: number,
  ): Promise<string | null> {
    if (!teacherId) return null;
    const where = { signedById: teacherId, signedAt: { not: null }, signatureData: { not: null } };
    const exclude = { NOT: { signatureData: 'ADMIN_VERIFIED' } };
    const sameTerm = await this.prisma.gradeFiche.findFirst({
      where: { ...where, ...exclude, classId, academicYear, termNumber },
      orderBy: { signedAt: 'desc' },
      select: { signatureData: true },
    });
    if (sameTerm?.signatureData) return sameTerm.signatureData;
    const latest = await this.prisma.gradeFiche.findFirst({
      where: { ...where, ...exclude },
      orderBy: { signedAt: 'desc' },
      select: { signatureData: true },
    });
    return latest?.signatureData ?? null;
  }

  async create(dto: CreateReportDto, institutionId: string, createdById: string) {
    const cls = await this.prisma.class.findFirst({
      where: { id: dto.classId, institutionId },
      include: { students: { select: { studentId: true } } },
    });
    if (!cls) throw new NotFoundException('Class not found');

    const termName =
      dto.termName ||
      (dto.termType === 'SEMESTRE'
        ? `Semestre ${dto.termNumber}`
        : `Trimestre ${dto.termNumber}`);

    const created = await this.prisma.$transaction(
      cls.students.map((cs) =>
        this.prisma.reportCard.upsert({
          where: {
            studentId_academicYear_termNumber: {
              studentId: cs.studentId,
              academicYear: dto.academicYear,
              termNumber: dto.termNumber,
            },
          },
          create: {
            studentId: cs.studentId,
            classId: dto.classId,
            academicYear: dto.academicYear,
            termType: dto.termType as any,
            termNumber: dto.termNumber,
            termName,
            createdById,
            securityCode: generateSecurityCode(dto.academicYear, dto.termNumber),
          },
          update: {},
        }),
      ),
    );

    return { count: created.length, classId: dto.classId, termNumber: dto.termNumber };
  }

  async update(id: string, dto: UpdateReportDto, institutionId: string, userId: string, role: Role) {
    await this.ensureEditable(id, institutionId, userId, role);
    return this.prisma.reportCard.update({ where: { id }, data: dto });
  }

  async submit(id: string, institutionId: string, userId: string, role: Role) {
    const report = await this.ensureEditable(id, institutionId, userId, role);
    if (report.status !== 'DRAFT') throw new BadRequestException('Only DRAFT reports can be submitted');
    return this.prisma.reportCard.update({ where: { id }, data: { status: 'REVIEW' } });
  }

  /** Seul le professeur titulaire de la classe relit et publie ses bulletins (l'admin garde ce droit). */
  private async assertTitulaireOrAdmin(classId: string, institutionId: string, userId: string, role: Role) {
    if (role === Role.ADMIN) return;
    const cls = await this.prisma.class.findFirst({
      where: { id: classId, institutionId },
      select: { teacherId: true },
    });
    if (!cls) throw new NotFoundException('Class not found');
    if (role !== Role.TEACHER || !userId || cls.teacherId !== userId) {
      throw new ForbiddenException('Seul le professeur titulaire de cette classe peut relire et publier ses bulletins');
    }
  }

  async publish(id: string, institutionId: string, userId: string, role: Role) {
    const report = await this.prisma.reportCard.findFirst({
      where: { id, class: { institutionId } },
      include: {
        grades: {
          include: { subject: { select: { nameFr: true, passMark: true, maxScore: true } } },
        },
        student: {
          include: {
            user: { select: { name: true } },
            parent: { select: { id: true } },
          },
        },
        class: { select: { name: true, level: true, teacher: { select: { id: true, name: true } } } },
      },
    });
    if (!report) throw new NotFoundException('Report card not found');
    // Publication : le professeur titulaire de la classe (ou l'administrateur)
    await this.assertTitulaireOrAdmin(report.classId, institutionId, userId, role);
    if (report.status !== 'REVIEW') throw new BadRequestException('Only REVIEW reports can be published');

    // Verify all teacher fiches are signed
    const classSubjects = await this.prisma.classSubject.findMany({
      where: { classId: report.classId },
    });
    const fiches = await this.prisma.gradeFiche.findMany({
      where: {
        classId: report.classId,
        academicYear: report.academicYear,
        termNumber: report.termNumber,
      },
    });
    const signedSubjectIds = new Set(
      fiches.filter((f) => f.signedAt).map((f) => f.subjectId),
    );
    const unsigned = classSubjects.filter((cs) => !signedSubjectIds.has(cs.subjectId));
    if (unsigned.length > 0) {
      throw new BadRequestException(
        `${unsigned.length} fiche(s) de notes non signée(s). Tous les professeurs doivent signer leur fiche avant la publication.`,
      );
    }

    // Compute overall average
    const grades = report.grades;
    let overallAverage: number | null = null;
    if (isPrimaryLevel(report.class.level)) {
      // Primaire : total des points (chaque matière sur 10 ou sur 20) ÷ total des barèmes
      overallAverage = primaryTotals(grades).average20;
    } else if (grades.length > 0) {
      const totalWeighted = grades.reduce((sum, g) => sum + (g.weightedScore ?? 0), 0);
      const totalCoef = grades.reduce((sum, g) => sum + g.coefficient, 0);
      overallAverage = totalCoef > 0 ? Math.round((totalWeighted / totalCoef) * 100) / 100 : null;
    }

    // Recompute class ranks for this class/year/term
    const siblings = await this.prisma.reportCard.findMany({
      where: {
        classId: report.classId,
        academicYear: report.academicYear,
        termNumber: report.termNumber,
        status: 'PUBLISHED',
      },
      select: { id: true, overallAverage: true },
    });

    const allAverages = [
      ...siblings.map((r) => ({ id: r.id, avg: r.overallAverage ?? 0 })),
      { id, avg: overallAverage ?? 0 },
    ].sort((a, b) => b.avg - a.avg);

    const classSize = allAverages.length;
    const rankMap = new Map<string, number>();
    allAverages.forEach((r, i) => rankMap.set(r.id, i + 1));

    const classHighest = Math.round(Math.max(...allAverages.map((r) => r.avg)) * 100) / 100;
    const classLowest  = Math.round(Math.min(...allAverages.map((r) => r.avg)) * 100) / 100;
    const classAverage = Math.round(
      (allAverages.reduce((sum, r) => sum + r.avg, 0) / allAverages.length) * 100,
    ) / 100;

    await this.prisma.$transaction(
      allAverages.map((r) =>
        this.prisma.reportCard.update({
          where: { id: r.id },
          data: { classRank: rankMap.get(r.id), classSize, classHighest, classLowest, classAverage },
        }),
      ),
    );

    const mention = overallAverage !== null ? computeMention(overallAverage) : null;

    // Compute annual average on the last term
    const expectedTermCount =
      report.termType === 'SEMESTRE' ? 2 : report.termType === 'TRIMESTRE' ? 3 : null;
    const isLastTerm = expectedTermCount !== null && report.termNumber === expectedTermCount;

    let annualAverage: number | null = null;
    let councilDecision: string | null = null;

    if (isLastTerm && overallAverage !== null) {
      const [priorTerms, inst] = await Promise.all([
        this.prisma.reportCard.findMany({
          where: {
            studentId: report.studentId,
            academicYear: report.academicYear,
            status: 'PUBLISHED',
            id: { not: id },
          },
          select: { termNumber: true, overallAverage: true },
        }),
        this.prisma.institution.findUnique({ where: { id: institutionId }, select: { academicSettings: true } }),
      ]);
      // Règles de l'école (poids des périodes, seuil de passage) ; une période sans moyenne est ignorée
      const settings = annualSettings(inst?.academicSettings);
      annualAverage = computeAnnualAverage(
        [...priorTerms, { termNumber: report.termNumber, overallAverage }],
        expectedTermCount!,
        settings.weighting,
      );
      // Une décision saisie par l'admin ou le titulaire n'est pas écrasée
      councilDecision = (report as any).councilDecisionManual
        ? (report as any).councilDecision
        : proposedDecision(annualAverage, settings.promotionThreshold);
    }

    // Absences (jours) et retards (minutes) calculés depuis les saisies des professeurs.
    // Sans aucune saisie sur le trimestre, on garde les valeurs entrées par le titulaire.
    const termAttendance = await this.attendance.computeTermAttendance(
      report.classId, report.academicYear, report.termType, report.termNumber, institutionId, [report.studentId],
    );
    const att = termAttendance.get(report.studentId);
    const attendanceData = att
      ? {
          attendanceAbsent: att.absentDays,
          attendanceExcused: att.excusedDays,
          attendanceLate: att.lateCount,
          attendanceLateMinutes: att.lateMinutes,
        }
      : {};

    const published = await this.prisma.reportCard.update({
      where: { id },
      data: {
        ...attendanceData,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        // Backfill a security code at publish time if one wasn't already
        // set at creation - covers reports created before this field existed,
        // or via any path that skipped generating one.
        securityCode: report.securityCode ?? generateSecurityCode(report.academicYear, report.termNumber),
        overallAverage,
        classRank: rankMap.get(id),
        classSize,
        classHighest,
        classLowest,
        classAverage,
        mention,
        annualAverage,
        councilDecision,
      },
      include: {
        student: {
          include: {
            user: { select: { name: true } },
            parent: { select: { id: true } },
          },
        },
      },
    });

    // Reload report with full grade detail for PDF
    const reportWithFullGrades = await this.prisma.reportCard.findFirst({
      where: { id },
      include: {
        grades: {
          include: { subject: { select: { nameFr: true, passMark: true, maxScore: true } } },
          orderBy: { coefficient: 'desc' },
        },
        student: {
          include: {
            user: { select: { name: true, profileImage: true } },
            parent: { select: { id: true } },
          },
        },
        class: { select: { name: true, level: true, teacher: { select: { id: true, name: true } } } },
      },
    });

    // Attach fiche signature data to each grade for PDF rendering
    const ficheMap = new Map(fiches.map((f) => [f.subjectId, f]));
    if (reportWithFullGrades) {
      reportWithFullGrades.grades = reportWithFullGrades.grades.map((g: any) => ({
        ...g,
        ficheSignedAt: ficheMap.get(g.subjectId)?.signedAt ?? null,
        signatureData: ficheMap.get(g.subjectId)?.signatureData ?? null,
      }));
    }

    // Generate PDF in the background — don't block the response
    this.generateAndSavePdf(published, reportWithFullGrades ?? report, institutionId).catch((err) =>
      this.logger.error(`PDF generation failed for report ${id}`, err),
    );

    this.events.emit('report.published', { report: published, institutionId });

    return published;
  }

  // ─── PDF generation (called after publish) ───────────────────────────────

  private async generateAndSavePdf(published: any, reportWithGrades: any, institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { name: true, country: true, countryMotto: true, address: true, phone: true, email: true, website: true, motto: true, logo: true, crest: true, stamp: true, brandingSettings: true, academicSettings: true },
    });
    if (!institution) return;

    const pdfUrl = await this.pdf.generateReportCardPdf({
      report: {
        id: published.id,
        termName: published.termName,
        academicYear: published.academicYear,
        termNumber: published.termNumber, termType: (published as any).termType,
        overallAverage: published.overallAverage,
        classRank: published.classRank,
        classSize: published.classSize,
        classHighest: (published as any).classHighest ?? null,
        classLowest: (published as any).classLowest ?? null,
        classAverage: (published as any).classAverage ?? null,
        mention: published.mention,
        conductRating: published.conductRating,
        teacherComment: published.teacherComment,
        principalComment: published.principalComment,
        attendanceDays: published.attendanceDays,
        attendancePresent: published.attendancePresent,
        attendanceLate: (published as any).attendanceLate ?? null,
        attendanceAbsent: (published as any).attendanceAbsent ?? null,
        attendanceAbsentHours: (published as any).attendanceAbsentHours ?? null,
        attendanceExcused: (published as any).attendanceExcused ?? null,
        attendanceLateMinutes: (published as any).attendanceLateMinutes ?? null,
        honorCouncil: (published as any).honorCouncil ?? null,
        commendations: (published as any).commendations ?? null,
        warnings: (published as any).warnings ?? null,
        annualAverage: (published as any).annualAverage ?? null,
        councilDecision: (published as any).councilDecision ?? null,
        securityCode: (published as any).securityCode ?? null,
        status: published.status,
      },
      student: {
        admissionNumber: reportWithGrades.student.admissionNumber,
        dateOfBirth: reportWithGrades.student.dateOfBirth,
        sex: reportWithGrades.student.sex ?? null,
        user: reportWithGrades.student.user,
      },
      className: reportWithGrades.class.name,
      classLevel: reportWithGrades.class.level ?? null,
      classTeacherName: reportWithGrades.class.teacher?.name ?? null,
      classTeacherSignature: await this.titulaireSignature(reportWithGrades.class.teacher?.id, published.classId, published.academicYear, published.termNumber),
      grades: reportWithGrades.grades.map((g: any) => ({
        score: g.score,
        moyenneMatiere: g.moyenneMatiere,
        coefficient: g.coefficient,
        weightedScore: g.weightedScore,
        noteInterro1: g.noteInterro1,
        noteInterro2: g.noteInterro2,
        noteInterro3: g.noteInterro3,
        noteInterro4: g.noteInterro4,
        noteDevoir: g.noteDevoir,
        noteComposition: g.noteComposition,
        rangMatiere: g.rangMatiere,
        appreciation: g.appreciation,
        teacherComment: g.teacherComment,
        teacherName: g.teacherName,
        ficheSignedAt: g.ficheSignedAt ?? null,
        signatureData: g.signatureData ?? null,
        subject: { nameFr: g.subject.nameFr, passMark: g.subject.passMark, maxScore: g.subject.maxScore },
      })),
      institution,
    });

    await this.prisma.reportCard.update({
      where: { id: published.id },
      data: { pdfUrl },
    });

    this.logger.log(`PDF generated for report ${published.id}: ${pdfUrl}`);
  }

  async verifyByCode(securityCode: string) {
    const report = await this.prisma.reportCard.findFirst({
      where: { securityCode, status: 'PUBLISHED' },
      select: {
        id: true,
        securityCode: true,
        academicYear: true,
        termName: true,
        termNumber: true,
        overallAverage: true,
        mention: true,
        classRank: true,
        classSize: true,
        publishedAt: true,
        student: {
          select: {
            admissionNumber: true,
            user: { select: { name: true } },
          },
        },
        class: { select: { name: true, level: true, teacher: { select: { id: true, name: true } } } },
      },
    });
    if (!report) {
      return { valid: false, message: 'Code invalide ou bulletin non publié' };
    }
    return {
      valid: true,
      studentName: report.student?.user?.name ?? report.student?.admissionNumber ?? '—',
      admissionNumber: report.student?.admissionNumber,
      className: report.class?.name,
      academicYear: report.academicYear,
      termName: report.termName,
      overallAverage: report.overallAverage,
      mention: report.mention,
      classRank: report.classRank,
      classSize: report.classSize,
      publishedAt: report.publishedAt,
      securityCode: report.securityCode,
    };
  }

  async bulkTitulaireUpsert(dto: TitulaireEntryDto, institutionId: string, userId: string, role: Role) {
    const cls = await this.prisma.class.findFirst({
      where: { id: dto.classId, institutionId },
    });
    if (!cls) throw new NotFoundException('Class not found');

    if (role !== Role.ADMIN && cls.teacherId !== userId) {
      throw new ForbiddenException('Only the homeroom teacher or admin can update titulaire fields');
    }

    const termName =
      dto.termName ||
      (dto.termType === 'SEMESTRE'
        ? `Semestre ${dto.termNumber}`
        : `Trimestre ${dto.termNumber}`);

    const results = await this.prisma.$transaction(
      dto.entries.map((entry) => {
        const {
          studentId, attendanceDays, attendancePresent, attendanceLate,
          attendanceAbsent, attendanceExcluded, warnings, commendations,
          honorCouncil, conductRating, teacherComment,
        } = entry;

        const fields = {
          attendanceDays, attendancePresent, attendanceLate,
          attendanceAbsent, attendanceExcluded, warnings, commendations,
          honorCouncil, conductRating: conductRating as any, teacherComment,
        };

        return this.prisma.reportCard.upsert({
          where: {
            studentId_academicYear_termNumber: {
              studentId,
              academicYear: dto.academicYear,
              termNumber: dto.termNumber,
            },
          },
          create: {
            studentId,
            classId: dto.classId,
            academicYear: dto.academicYear,
            termType: dto.termType as any,
            termNumber: dto.termNumber,
            termName,
            createdById: userId,
            ...fields,
          },
          update: fields,
        });
      }),
    );

    return { count: results.length };
  }

  /** Bulletins publiés avant l'ajout du code de sécurité : on en génère un (nécessaire au QR code). */
  private async ensureSecurityCode(report: { id: string; academicYear: string; termNumber: number; securityCode?: string | null }) {
    if (report.securityCode) return;
    const securityCode = generateSecurityCode(report.academicYear, report.termNumber);
    await this.prisma.reportCard.update({ where: { id: report.id }, data: { securityCode } });
    report.securityCode = securityCode;
  }

  async regeneratePdf(id: string, institutionId: string) {
    const report = await this.prisma.reportCard.findFirst({
      where: { id, class: { institutionId }, status: 'PUBLISHED' },
      include: {
        grades: {
          include: { subject: { select: { nameFr: true, passMark: true, maxScore: true } } },
          orderBy: { coefficient: 'desc' },
        },
        student: {
          include: {
            user: { select: { name: true, profileImage: true } },
          },
        },
        class: { select: { name: true, level: true, teacher: { select: { id: true, name: true } } } },
      },
    });
    if (!report) throw new NotFoundException('Published report card not found');
    await this.ensureSecurityCode(report);

    const fiches = await this.prisma.gradeFiche.findMany({
      where: { classId: report.classId, academicYear: report.academicYear, termNumber: report.termNumber },
    });
    const ficheMap = new Map(fiches.map((f) => [f.subjectId, f]));
    const gradesWithFiche = report.grades.map((g: any) => ({
      ...g,
      ficheSignedAt: ficheMap.get(g.subjectId)?.signedAt ?? null,
      signatureData: ficheMap.get(g.subjectId)?.signatureData ?? null,
    }));

    await this.generateAndSavePdf(report, { ...report, grades: gradesWithFiche }, institutionId);

    const updated = await this.prisma.reportCard.findUnique({ where: { id }, select: { pdfUrl: true } });
    return { pdfUrl: updated?.pdfUrl };
  }

  /**
   * Régénère le PDF stocké (pdfUrl) de tous les bulletins publiés — après un changement de modèle.
   * Séquentiel pour ne pas saturer Puppeteer. Les anciens fichiers sont conservés : les liens déjà
   * envoyés par WhatsApp/e-mail continuent de fonctionner (avec l'ancien modèle).
   */
  async regeneratePublishedPdfs(
    options: {
      institutionId?: string;
      /** Seulement les bulletins sans PDF stocké (reprise après interruption). */
      onlyMissing?: boolean;
      onProgress?: (done: number, total: number, failed: number) => void;
    } = {},
  ): Promise<{ total: number; regenerated: number; failed: number }> {
    const reports = await this.prisma.reportCard.findMany({
      where: {
        status: 'PUBLISHED',
        ...(options.institutionId ? { class: { institutionId: options.institutionId } } : {}),
        ...(options.onlyMissing ? { pdfUrl: null } : {}),
      },
      select: { id: true, pdfUrl: true, class: { select: { institutionId: true } } },
      orderBy: { publishedAt: 'desc' },
    });

    let regenerated = 0;
    let failed = 0;
    for (const [i, r] of reports.entries()) {
      try {
        const { pdfUrl } = await this.regeneratePdf(r.id, r.class.institutionId);
        // Échec d'envoi vers Cloudinary → le service retombe sur un lien local (localhost) que les
        // parents ne peuvent pas ouvrir : on garde alors l'ancien lien.
        if (!pdfUrl || /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(pdfUrl)) {
          await this.prisma.reportCard.update({ where: { id: r.id }, data: { pdfUrl: r.pdfUrl } });
          throw new Error(`upload failed, kept previous link (got ${pdfUrl ?? 'no url'})`);
        }
        regenerated++;
      } catch (err: any) {
        failed++;
        this.logger.warn(`regeneratePublishedPdfs: report ${r.id} failed — ${err?.message ?? err}`);
      }
      options.onProgress?.(i + 1, reports.length, failed);
    }
    return { total: reports.length, regenerated, failed };
  }

  async getAnnualReport(
    studentId: string, academicYear: string, institutionId: string,
    viewer?: { id: string; role: string },
  ) {
    // Parents et élèves : uniquement leur enfant / eux-mêmes (avant : n'importe quel élève de l'école)
    const ownership =
      viewer?.role === Role.PARENT ? { parentId: viewer.id } :
      viewer?.role === Role.STUDENT ? { userId: viewer.id } : {};
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, institutionId, ...ownership },
      include: { user: { select: { name: true, profileImage: true } } },
    });
    if (!student) throw new NotFoundException('Student not found');

    const reports = await this.prisma.reportCard.findMany({
      where: { studentId, academicYear, status: 'PUBLISHED', class: { institutionId } },
      include: {
        class: { select: { id: true, name: true, level: true, teacher: { select: { id: true, name: true } } } },
        grades: { include: { subject: { select: { nameFr: true, passMark: true, maxScore: true } } } },
      },
      orderBy: { termNumber: 'asc' },
    });

    if (!reports.length) throw new NotFoundException('No published reports found for this year');

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { name: true, country: true, countryMotto: true, address: true, phone: true, email: true, website: true, motto: true, logo: true, crest: true, stamp: true, brandingSettings: true, academicSettings: true },
    });

    const lastTerm = reports[reports.length - 1];
    const settings = annualSettings(institution?.academicSettings);
    // Colonnes = toutes les périodes de l'année (T1, T2, T3), placées par numéro : un trimestre non
    // publié laisse sa colonne vide (avant, sans T1 les notes du T3 disparaissaient).
    const termCount = termCountFor(lastTerm.termType, reports.map((r) => r.termNumber));
    const isPrimary = isPrimaryLevel(lastTerm.class?.level);

    const subjectMap = new Map<string, { nameFr: string; coefficient: number; passMark: number; max: number; termAverages: (number | null)[] }>();
    for (const report of reports) {
      const idx = report.termNumber - 1;
      for (const g of report.grades) {
        if (!subjectMap.has(g.subjectId)) {
          subjectMap.set(g.subjectId, {
            nameFr: g.subject.nameFr,
            coefficient: g.coefficient,
            passMark: g.subject.passMark,
            // Barème de la matière : au primaire 10 ou 20 selon la matière, sinon 20
            max: isPrimary ? primarySubjectMax(g.subject.maxScore) : 20,
            termAverages: Array(termCount).fill(null),
          });
        }
        const entry = subjectMap.get(g.subjectId)!;
        entry.coefficient = g.coefficient; // use latest coef
        if (idx >= 0 && idx < termCount) entry.termAverages[idx] = g.moyenneMatiere ?? g.score ?? null;
      }
    }

    const subjects = Array.from(subjectMap.values()).map((s) => ({
      ...s,
      annualAverage: computeAnnualAverage(
        s.termAverages.map((avg, i) => ({ termNumber: i + 1, overallAverage: avg })), termCount, settings.weighting,
      ),
    })).sort((a, b) => b.coefficient - a.coefficient);

    // Moyenne annuelle recalculée à chaque affichage (une correction du T1 ou du T2 est prise en compte)
    const annualAvg = computeAnnualAverage(reports, termCount, settings.weighting);
    const isComplete = Array.from({ length: termCount }, (_, i) => i + 1).every((n) => reports.some((r) => r.termNumber === n));

    // Rang annuel dans la classe du dernier bulletin, mêmes règles pour tous les élèves
    const classReports = await this.prisma.reportCard.findMany({
      where: { classId: lastTerm.classId, academicYear, status: 'PUBLISHED' },
      select: { studentId: true, termNumber: true, overallAverage: true },
    });
    const byStudent = new Map<string, { termNumber: number; overallAverage: number | null }[]>();
    for (const r of classReports) byStudent.set(r.studentId, [...(byStudent.get(r.studentId) ?? []), r]);
    const classAnnual = [...byStudent.entries()].map(([id, terms]) => ({ id, average: computeAnnualAverage(terms, termCount, settings.weighting) }));
    const ranks = rankWithTies(classAnnual);
    const classAverages = classAnnual.map((c) => c.average).filter((v): v is number => v != null);
    const round2 = (v: number) => Math.round(v * 100) / 100;

    const proposed = proposedDecision(annualAvg, settings.promotionThreshold);
    const manual = !!(lastTerm as any).councilDecisionManual;

    return {
      student: {
        id: student.id,
        name: student.user?.name ?? student.admissionNumber,
        admissionNumber: student.admissionNumber,
        dateOfBirth: student.dateOfBirth,
        sex: student.sex ?? null,
        profileImage: student.user?.profileImage ?? null,
      },
      class: lastTerm.class,
      institution,
      academicYear,
      termSystem: lastTerm.termType,
      terms: reports.map((r) => ({
        termNumber: r.termNumber, termType: (r as any).termType,
        termName: r.termName,
        overallAverage: r.overallAverage,
        classRank: r.classRank,
        classSize: r.classSize,
        classHighest: r.classHighest,
        classLowest: r.classLowest,
        classAverage: r.classAverage,
        mention: r.mention,
        conductRating: r.conductRating,
        attendanceAbsentHours: r.attendanceAbsentHours,
        attendanceLate: r.attendanceLate,
        warnings: r.warnings,
        commendations: r.commendations,
        honorCouncil: r.honorCouncil,
        teacherComment: r.teacherComment,
        principalComment: r.principalComment,
      })),
      subjects,
      isPrimary,
      termCount,
      isComplete,
      weighting: settings.weighting,
      annualAverage: annualAvg,
      annualRank: ranks.get(studentId) ?? null,
      annualClassSize: ranks.size,
      annualClassHighest: classAverages.length ? round2(Math.max(...classAverages)) : null,
      annualClassLowest: classAverages.length ? round2(Math.min(...classAverages)) : null,
      annualClassAverage: classAverages.length ? round2(classAverages.reduce((a, b) => a + b, 0) / classAverages.length) : null,
      // Décision : celle saisie par l'admin / le titulaire, sinon celle proposée selon le seuil de l'école
      councilDecision: manual ? lastTerm.councilDecision : proposed,
      councilDecisionManual: manual,
      proposedDecision: proposed,
      promotionThreshold: settings.promotionThreshold,
      mention: annualAvg != null ? computeMention(annualAvg) : null,
      canEditDecision: viewer?.role === Role.ADMIN || (viewer?.role === Role.TEACHER && lastTerm.class?.teacher?.id === viewer.id),
    };
  }

  /**
   * Décision du conseil de classe saisie par l'admin ou le titulaire (enregistrée sur le dernier
   * bulletin publié de l'année). `decision` vide = revenir à la décision proposée selon le seuil.
   */
  async setCouncilDecision(
    studentId: string, academicYear: string, decision: string | null | undefined,
    institutionId: string, userId: string, role: Role,
  ) {
    const last = await this.prisma.reportCard.findFirst({
      where: { studentId, academicYear, status: 'PUBLISHED', class: { institutionId } },
      orderBy: { termNumber: 'desc' },
      select: { id: true, classId: true },
    });
    if (!last) throw new NotFoundException('No published reports found for this year');
    await this.assertTitulaireOrAdmin(last.classId, institutionId, userId, role);

    const text = decision?.trim();
    if (text) {
      await this.prisma.reportCard.update({
        where: { id: last.id },
        data: { councilDecision: text.slice(0, 200), councilDecisionManual: true },
      });
    } else {
      // Retour à la proposition automatique
      const annual = await this.getAnnualReport(studentId, academicYear, institutionId);
      await this.prisma.reportCard.update({
        where: { id: last.id },
        data: { councilDecision: annual.proposedDecision, councilDecisionManual: false },
      });
    }
    return this.getAnnualReport(studentId, academicYear, institutionId, { id: userId, role });
  }

  async bulkPublish(
    classId: string,
    academicYear: string,
    termNumber: number,
    institutionId: string,
    userId: string,
    role: Role,
  ): Promise<{ published: number; skipped: number }> {
    await this.assertTitulaireOrAdmin(classId, institutionId, userId, role);
    const candidates = await this.prisma.reportCard.findMany({
      where: { classId, academicYear, termNumber, status: 'REVIEW', class: { institutionId } },
      select: { id: true },
    });

    if (!candidates.length) {
      return { published: 0, skipped: 0 };
    }

    let published = 0;
    let skipped = 0;

    for (const { id } of candidates) {
      try {
        // Droits déjà vérifiés pour toute la classe ci-dessus
        await this.publish(id, institutionId, userId, Role.ADMIN);
        published++;
      } catch (err) {
        this.logger.warn(`bulkPublish: skipped report ${id} — ${err?.message}`);
        skipped++;
      }
    }

    return { published, skipped };
  }

  // ─── Préparation automatique des bulletins d'une classe ──────────────────

  /**
   * État de la classe pour un trimestre : fiches de notes signées (par matière) et bulletins
   * par statut. Sert au bandeau de la page du titulaire.
   */
  async classStatus(classId: string, academicYear: string, termNumber: number, institutionId: string) {
    const cls = await this.prisma.class.findFirst({
      where: { id: classId, institutionId },
      select: { id: true, teacherId: true, subjects: { select: { subjectId: true, subject: { select: { nameFr: true } } } } },
    });
    if (!cls) throw new NotFoundException('Class not found');

    const fiches = await this.prisma.gradeFiche.findMany({
      where: { classId, academicYear, termNumber, signedAt: { not: null } },
      select: { subjectId: true },
    });
    const signed = new Set(fiches.map((f) => f.subjectId));
    const unsignedSubjects = cls.subjects.filter((s) => !signed.has(s.subjectId)).map((s) => s.subject.nameFr);

    const byStatus = await this.prisma.reportCard.groupBy({
      by: ['status'],
      where: { classId, academicYear, termNumber },
      _count: true,
    });
    const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;

    return {
      subjects: cls.subjects.length,
      signedSubjects: cls.subjects.length - unsignedSubjects.length,
      unsignedSubjects,
      allSigned: cls.subjects.length > 0 && unsignedSubjects.length === 0,
      reports: { draft: count('DRAFT'), review: count('REVIEW'), published: count('PUBLISHED') },
    };
  }

  /**
   * Dès que toutes les fiches de notes d'une classe sont signées pour le trimestre, les bulletins
   * sont générés automatiquement : un bulletin par élève inscrit (créé s'il manque) passe
   * « à relire » (REVIEW). Le titulaire les relit, ajoute ses observations et les publie.
   */
  @OnEvent('fiche.signed')
  async prepareClassBulletins(payload: { classId: string; academicYear: string; termNumber: number; institutionId: string }) {
    const { classId, academicYear, termNumber, institutionId } = payload;
    try {
      const status = await this.classStatus(classId, academicYear, termNumber, institutionId);
      if (!status.allSigned) return { prepared: 0 };

      const enrolled = await this.prisma.classStudent.findMany({
        where: { classId, academicYear },
        select: { studentId: true },
      });
      const existing = await this.prisma.reportCard.findMany({
        where: { classId, academicYear, termNumber },
        select: { studentId: true, termName: true, termType: true },
      });
      const have = new Set(existing.map((r) => r.studentId));
      const termName = existing[0]?.termName ?? `${termNumber === 1 ? '1er' : `${termNumber}e`} Trimestre`;
      const termType = existing[0]?.termType ?? 'TRIMESTRE';

      const missing = enrolled.filter((e) => !have.has(e.studentId));
      if (missing.length) {
        await this.prisma.reportCard.createMany({
          data: missing.map((e) => ({
            studentId: e.studentId, classId, academicYear, termNumber, termName, termType,
            securityCode: generateSecurityCode(academicYear, termNumber),
          })),
          skipDuplicates: true,
        });
      }

      const { count } = await this.prisma.reportCard.updateMany({
        where: { classId, academicYear, termNumber, status: 'DRAFT' },
        data: { status: 'REVIEW' },
      });
      this.logger.log(`Class ${classId} T${termNumber}: all fiches signed — ${count} bulletin(s) ready for review`);
      return { prepared: count };
    } catch (err: any) {
      this.logger.error(`prepareClassBulletins failed for class ${classId}: ${err?.message ?? err}`);
      return { prepared: 0 };
    }
  }

  /** Une signature retirée : les bulletins non publiés de la classe repassent en brouillon. */
  @OnEvent('fiche.unsigned')
  async revertClassBulletins(payload: { classId: string; academicYear: string; termNumber: number }) {
    const { classId, academicYear, termNumber } = payload;
    await this.prisma.reportCard.updateMany({
      where: { classId, academicYear, termNumber, status: 'REVIEW' },
      data: { status: 'DRAFT' },
    });
  }

  // ─── Observation du titulaire générée par l'IA ───────────────────────────

  async generateTitulaireComment(reportId: string, institutionId: string, userId: string, role: Role) {
    const report = await this.prisma.reportCard.findFirst({
      where: { id: reportId, class: { institutionId } },
      include: {
        student: { select: { sex: true, admissionNumber: true, user: { select: { name: true } } } },
        class: { select: { name: true, level: true, teacher: { select: { id: true, name: true } } } },
        grades: { include: { subject: { select: { nameFr: true, maxScore: true } } }, orderBy: { coefficient: 'desc' } },
      },
    });
    if (!report) throw new NotFoundException('Report card not found');
    await this.assertTitulaireOrAdmin(report.classId, institutionId, userId, role);
    if (report.status === 'PUBLISHED') throw new BadRequestException('Ce bulletin est déjà publié');

    const graded = report.grades
      .map((g) => ({ subject: g.subject.nameFr, score: (g.moyenneMatiere ?? g.score) as number, coefficient: g.coefficient, maxScore: g.subject.maxScore }))
      .filter((g) => g.score != null);
    if (!graded.length) throw new BadRequestException("Aucune note n'est encore saisie pour cet élève");

    // Moyenne : celle du bulletin si déjà calculée, sinon moyenne pondérée des matières
    const totalCoef = graded.reduce((s, g) => s + g.coefficient, 0);
    const avg = isPrimaryLevel(report.class.level)
      // Primaire : total des points ÷ total des barèmes (chaque matière sur 10 ou sur 20)
      ? (primaryTotals(report.grades).average20 ?? 0)
      : report.overallAverage
        ?? (totalCoef > 0 ? graded.reduce((s, g) => s + g.score * g.coefficient, 0) / totalCoef : 0);

    if (!this.ai.isEnabled) {
      throw new ServiceUnavailableException("L'assistant IA n'est pas configuré sur cette plateforme.");
    }
    const comment = await this.ai.generateReportComment({
      studentName: report.student.user?.name ?? report.student.admissionNumber,
      sex: (report.student.sex as 'M' | 'F' | null) ?? null,
      className: report.class.name,
      termName: report.termName,
      isPrimary: isPrimaryLevel(report.class.level),
      avg,
      mention: report.mention ?? computeMention(avg),
      rank: report.classRank,
      classSize: report.classSize,
      classAverage: report.classAverage,
      conduct: report.conductRating ? CONDUCT_LABELS_FR[report.conductRating] ?? null : null,
      absentDays: report.attendanceAbsent,
      lateHours: report.attendanceLateMinutes != null
        ? String(Math.round((report.attendanceLateMinutes / 60) * 10) / 10).replace('.', ',')
        : null,
      grades: graded,
    }).catch((err: Error) => {
      // Message lisible côté titulaire (sinon « Internal server error »)
      throw new ServiceUnavailableException(err?.message ?? "Impossible de générer l'observation.");
    });
    return { comment };
  }

  async bulkZip(dto: BulkZipDto, institutionId: string): Promise<Buffer> {
    const reports = await this.prisma.reportCard.findMany({
      where: {
        status: 'PUBLISHED',
        academicYear: dto.academicYear,
        termNumber: dto.termNumber,
        class: { institutionId },
        ...(dto.classId ? { classId: dto.classId } : {}),
      },
      include: {
        student: { include: { user: { select: { name: true, profileImage: true } } } },
        class: { select: { name: true, level: true, teacher: { select: { id: true, name: true } } } },
        grades: { include: { subject: { select: { nameFr: true, passMark: true, maxScore: true } } } },
      },
      orderBy: [{ class: { name: 'asc' } }, { student: { admissionNumber: 'asc' } }],
    });

    if (!reports.length) throw new NotFoundException('Aucun bulletin publié trouvé pour ces critères');

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { name: true, country: true, countryMotto: true, address: true, phone: true, email: true, website: true, motto: true, logo: true, crest: true, stamp: true, brandingSettings: true, academicSettings: true },
    });
    if (!institution) throw new NotFoundException('Institution introuvable');

    // Fetch all grade fiches once per class
    const classCombos = [...new Set(reports.map((r) => `${r.classId}|${r.academicYear}|${r.termNumber}`))];
    const fichesByCombo = new Map<string, Map<string, any>>();
    for (const combo of classCombos) {
      const [cId, ay, tn] = combo.split('|');
      const fiches = await this.prisma.gradeFiche.findMany({
        where: { classId: cId, academicYear: ay, termNumber: Number(tn) },
      });
      fichesByCombo.set(combo, new Map(fiches.map((f) => [f.subjectId, f])));
    }

    // Build ZIP in memory
    return new Promise((resolve, reject) => {
      const zip = archiver('zip', { zlib: { level: 6 } });
      const chunks: Buffer[] = [];
      zip.on('data', (c: Buffer) => chunks.push(c));
      zip.on('end', () => resolve(Buffer.concat(chunks)));
      zip.on('error', reject);

      const addNext = async (idx: number) => {
        if (idx >= reports.length) { zip.finalize(); return; }
        const r = reports[idx];
        try {
          const ficheKey = `${r.classId}|${r.academicYear}|${r.termNumber}`;
          const ficheMap = fichesByCombo.get(ficheKey) ?? new Map();
          const buf = await this.pdf.generateReportCardPdfBuffer({
            report: {
              id: r.id, termName: (r as any).termName, academicYear: r.academicYear, termNumber: r.termNumber, termType: (r as any).termType,
              overallAverage: (r as any).overallAverage, classRank: (r as any).classRank, classSize: (r as any).classSize,
              classHighest: (r as any).classHighest ?? null, classLowest: (r as any).classLowest ?? null,
              classAverage: (r as any).classAverage ?? null, mention: (r as any).mention,
              conductRating: (r as any).conductRating, teacherComment: (r as any).teacherComment,
              principalComment: (r as any).principalComment, attendanceDays: (r as any).attendanceDays,
              attendancePresent: (r as any).attendancePresent, attendanceLate: (r as any).attendanceLate ?? null,
              attendanceAbsent: (r as any).attendanceAbsent ?? null, attendanceAbsentHours: (r as any).attendanceAbsentHours ?? null,
              attendanceExcused: (r as any).attendanceExcused ?? null, attendanceLateMinutes: (r as any).attendanceLateMinutes ?? null,
              honorCouncil: (r as any).honorCouncil ?? null, commendations: (r as any).commendations ?? null,
              warnings: (r as any).warnings ?? null, annualAverage: (r as any).annualAverage ?? null,
              councilDecision: (r as any).councilDecision ?? null,
              securityCode: (r as any).securityCode ?? null,
              status: (r as any).status,
            },
            student: { admissionNumber: r.student.admissionNumber, dateOfBirth: (r.student as any).dateOfBirth, sex: (r.student as any).sex ?? null, user: r.student.user },
            className: r.class.name,
            classLevel: (r.class as any).level ?? null,
            classTeacherName: (r.class as any).teacher?.name ?? null,
            classTeacherSignature: await this.titulaireSignature((r.class as any).teacher?.id, r.classId, r.academicYear, r.termNumber),
            grades: r.grades.map((g: any) => ({
              score: g.score, moyenneMatiere: g.moyenneMatiere, coefficient: g.coefficient, weightedScore: g.weightedScore,
              noteInterro1: g.noteInterro1, noteInterro2: g.noteInterro2, noteInterro3: g.noteInterro3, noteInterro4: g.noteInterro4,
              noteDevoir: g.noteDevoir, noteComposition: g.noteComposition, rangMatiere: g.rangMatiere,
              appreciation: g.appreciation, teacherComment: g.teacherComment, teacherName: g.teacherName,
              ficheSignedAt: ficheMap.get(g.subjectId)?.signedAt ?? null,
              signatureData: ficheMap.get(g.subjectId)?.signatureData ?? null,
              subject: { nameFr: g.subject.nameFr, passMark: g.subject.passMark, maxScore: g.subject.maxScore },
            })),
            institution,
          });
          const safeName = (r.student.user?.name ?? r.student.admissionNumber).replace(/[^a-zA-Z0-9\s\-\u00C0-\u00FF]/g, '').trim();
          const folder = dto.classId ? '' : `${r.class.name}/`;
          zip.append(buf, { name: `${folder}${safeName}.pdf` });
        } catch (err) {
          this.logger.error(`ZIP: skipping report ${r.id}`, err);
        }
        await addNext(idx + 1);
      };

      addNext(0).catch(reject);
    });
  }

  async downloadPdf(id: string, institutionId: string, userId: string, role: Role): Promise<{ buffer: Buffer; filename: string }> {
    const report = await this.prisma.reportCard.findFirst({
      where: { id, class: { institutionId }, status: 'PUBLISHED' },
      include: {
        grades: {
          include: { subject: { select: { nameFr: true, passMark: true, maxScore: true } } },
          orderBy: { coefficient: 'desc' },
        },
        student: { include: { user: { select: { name: true, profileImage: true } } } },
        class: { select: { name: true, level: true, teacher: { select: { id: true, name: true } } } },
      },
    });
    if (!report) throw new NotFoundException('Published report card not found');
    await this.ensureSecurityCode(report);

    if (role === Role.PARENT) {
      const child = await this.prisma.student.findFirst({ where: { id: report.studentId, parentId: userId } });
      if (!child) throw new ForbiddenException('You do not have access to this report');
    }
    if (role === Role.STUDENT) {
      const student = await this.prisma.student.findFirst({ where: { id: report.studentId, userId } });
      if (!student) throw new ForbiddenException('You do not have access to this report');
    }

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { name: true, country: true, countryMotto: true, address: true, phone: true, email: true, website: true, motto: true, logo: true, crest: true, stamp: true, brandingSettings: true, academicSettings: true },
    });
    if (!institution) throw new NotFoundException('Institution not found');

    const fiches = await this.prisma.gradeFiche.findMany({
      where: { classId: report.classId, academicYear: report.academicYear, termNumber: report.termNumber },
    });
    const ficheMap = new Map(fiches.map((f) => [f.subjectId, f]));

    const r = report as any;
    const buffer = await this.pdf.generateReportCardPdfBuffer({
      report: {
        id: r.id, termName: r.termName, academicYear: r.academicYear, termNumber: r.termNumber, termType: (r as any).termType,
        overallAverage: r.overallAverage, classRank: r.classRank, classSize: r.classSize,
        classHighest: r.classHighest ?? null, classLowest: r.classLowest ?? null, classAverage: r.classAverage ?? null,
        mention: r.mention, conductRating: r.conductRating, teacherComment: r.teacherComment,
        principalComment: r.principalComment, attendanceDays: r.attendanceDays, attendancePresent: r.attendancePresent,
        attendanceLate: r.attendanceLate ?? null, attendanceAbsent: r.attendanceAbsent ?? null,
        attendanceAbsentHours: r.attendanceAbsentHours ?? null, honorCouncil: r.honorCouncil ?? null,
        attendanceExcused: r.attendanceExcused ?? null, attendanceLateMinutes: r.attendanceLateMinutes ?? null,
        commendations: r.commendations ?? null, warnings: r.warnings ?? null,
        annualAverage: r.annualAverage ?? null, councilDecision: r.councilDecision ?? null,
        securityCode: r.securityCode ?? null,
        status: r.status,
      },
      student: { admissionNumber: r.student.admissionNumber, dateOfBirth: r.student.dateOfBirth, sex: r.student.sex ?? null, user: r.student.user },
      className: r.class.name,
      classLevel: r.class.level ?? null,
      classTeacherName: r.class.teacher?.name ?? null,
      classTeacherSignature: await this.titulaireSignature(r.class.teacher?.id, r.classId, r.academicYear, r.termNumber),
      grades: r.grades.map((g: any) => ({
        score: g.score, moyenneMatiere: g.moyenneMatiere, coefficient: g.coefficient, weightedScore: g.weightedScore,
        noteInterro1: g.noteInterro1, noteInterro2: g.noteInterro2, noteInterro3: g.noteInterro3, noteInterro4: g.noteInterro4,
        noteDevoir: g.noteDevoir, noteComposition: g.noteComposition, rangMatiere: g.rangMatiere,
        appreciation: g.appreciation, teacherComment: g.teacherComment, teacherName: g.teacherName,
        ficheSignedAt: ficheMap.get(g.subjectId)?.signedAt ?? null,
        signatureData: ficheMap.get(g.subjectId)?.signatureData ?? null,
        subject: { nameFr: g.subject.nameFr, passMark: g.subject.passMark, maxScore: g.subject.maxScore },
      })),
      institution,
    });

    const studentName = (r.student.user?.name ?? r.student.admissionNumber).replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `bulletin-${studentName}-T${r.termNumber}-${r.academicYear}.pdf`;
    return { buffer, filename };
  }

  private async ensureEditable(id: string, institutionId: string, userId: string, role: Role) {
    const report = await this.prisma.reportCard.findFirst({
      where: { id, class: { institutionId } },
    });
    if (!report) throw new NotFoundException('Report card not found');
    if (report.status === 'PUBLISHED') throw new ForbiddenException('Cannot edit a published report');

    if (role !== Role.ADMIN) {
      const cls = await this.prisma.class.findFirst({ where: { id: report.classId, teacherId: userId } });
      if (!cls && report.createdById !== userId) {
        throw new ForbiddenException('You do not have access to this report');
      }
    }
    return report;
  }
}
