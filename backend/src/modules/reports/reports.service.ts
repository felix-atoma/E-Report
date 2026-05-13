import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { Role } from '../../common/enums/role.enum';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { TitulaireEntryDto } from './dto/titulaire-entry.dto';

function computeMention(avg: number): string {
  if (avg >= 18) return 'Excellent';
  if (avg >= 16) return 'Très Bien';
  if (avg >= 14) return 'Bien';
  if (avg >= 12) return 'Assez Bien';
  if (avg >= 10) return 'Passable';
  return 'Insuffisant';
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly pdf: PdfService,
  ) {}

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

    return this.prisma.reportCard.findMany({
      where,
      include: {
        student: { include: { user: { select: { name: true } } } },
        class: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ academicYear: 'desc' }, { termNumber: 'desc' }, { student: { admissionNumber: 'asc' } }],
    });
  }

  async findOne(id: string, institutionId: string) {
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
            subjects: { include: { subject: { select: { id: true, nameFr: true, code: true, passMark: true } } } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        grades: {
          include: { subject: { select: { id: true, nameFr: true, nameEn: true, code: true, passMark: true } } },
          orderBy: { subject: { nameFr: 'asc' } },
        },
      },
    });
    if (!report) throw new NotFoundException('Report card not found');
    return report;
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

  async publish(id: string, institutionId: string, _userId: string, role: Role) {
    const report = await this.prisma.reportCard.findFirst({
      where: { id, class: { institutionId } },
      include: {
        grades: {
          include: { subject: { select: { nameFr: true, passMark: true } } },
        },
        student: {
          include: {
            user: { select: { name: true } },
            parent: { select: { id: true } },
          },
        },
        class: { select: { name: true } },
      },
    });
    if (!report) throw new NotFoundException('Report card not found');
    if (role !== Role.ADMIN) throw new ForbiddenException('Only admins can publish reports');
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
    if (grades.length > 0) {
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

    const published = await this.prisma.reportCard.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        overallAverage,
        classRank: rankMap.get(id),
        classSize,
        classHighest,
        classLowest,
        classAverage,
        mention,
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
          include: { subject: { select: { nameFr: true, passMark: true } } },
          orderBy: { subject: { nameFr: 'asc' } },
        },
        student: {
          include: {
            user: { select: { name: true, profileImage: true } },
            parent: { select: { id: true } },
          },
        },
        class: { select: { name: true } },
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
      select: { name: true, country: true, countryMotto: true, address: true, phone: true, motto: true, logo: true, crest: true, stamp: true, brandingSettings: true },
    });
    if (!institution) return;

    const pdfUrl = await this.pdf.generateReportCardPdf({
      report: {
        id: published.id,
        termName: published.termName,
        academicYear: published.academicYear,
        termNumber: published.termNumber,
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
        honorCouncil: (published as any).honorCouncil ?? null,
        commendations: (published as any).commendations ?? null,
        warnings: (published as any).warnings ?? null,
      },
      student: {
        admissionNumber: reportWithGrades.student.admissionNumber,
        dateOfBirth: reportWithGrades.student.dateOfBirth,
        user: reportWithGrades.student.user,
      },
      className: reportWithGrades.class.name,
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
        subject: { nameFr: g.subject.nameFr, passMark: g.subject.passMark },
      })),
      institution,
    });

    await this.prisma.reportCard.update({
      where: { id: published.id },
      data: { pdfUrl },
    });

    this.logger.log(`PDF generated for report ${published.id}: ${pdfUrl}`);
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

  async regeneratePdf(id: string, institutionId: string) {
    const report = await this.prisma.reportCard.findFirst({
      where: { id, class: { institutionId }, status: 'PUBLISHED' },
      include: {
        grades: {
          include: { subject: { select: { nameFr: true, passMark: true } } },
          orderBy: { subject: { nameFr: 'asc' } },
        },
        student: {
          include: {
            user: { select: { name: true, profileImage: true } },
          },
        },
        class: { select: { name: true } },
      },
    });
    if (!report) throw new NotFoundException('Published report card not found');

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
