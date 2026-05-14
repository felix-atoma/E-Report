import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

// Lazy-load puppeteer to avoid startup cost
let puppeteer: typeof import('puppeteer') | null = null;
async function getPuppeteer() {
  if (!puppeteer) puppeteer = await import('puppeteer');
  return puppeteer;
}

const CONDUCT_LABELS: Record<string, string> = {
  TRES_BIEN: 'Très Bien',
  BIEN: 'Bien',
  PASSABLE: 'Passable',
  MEDIOCRE: 'Médiocre',
};

function formatScore(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toFixed(2).replace('.', ',');
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly outputDir: string;
  private readonly baseUrl: string;
  private readonly template: HandlebarsTemplateDelegate;

  constructor(config: ConfigService) {
    this.outputDir = path.resolve(
      process.cwd(),
      config.get<string>('UPLOADS_DIR', 'uploads'),
      'report-card-pdfs',
    );
    this.baseUrl = config.get<string>('BASE_URL', 'http://localhost:4000');
    fs.mkdirSync(this.outputDir, { recursive: true });

    const templatePath = path.join(__dirname, 'templates', 'report-card.hbs');
    const templateSrc = fs.readFileSync(templatePath, 'utf8');

    Handlebars.registerHelper('formatScore', (val: number | null) => formatScore(val));
    Handlebars.registerHelper('fmtScore', (val: number | null) => formatScore(val));
    Handlebars.registerHelper('fmtNote', (val: number | null | undefined) =>
      val == null ? '—' : Number(val).toFixed(0).replace('.', ','),
    );

    this.template = Handlebars.compile(templateSrc);
  }

  async generateReportCardPdf(reportData: ReportCardData): Promise<string> {
    const html = this.buildHtml(reportData);
    const filename = `report-${reportData.report.id}-${Date.now()}.pdf`;
    const outputPath = path.join(this.outputDir, filename);

    try {
      const pup = await getPuppeteer();
      const browser = await pup.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
      });
      await browser.close();
    } catch (err) {
      this.logger.error('Puppeteer PDF generation failed', err);
      throw err;
    }

    return `${this.baseUrl}/uploads/report-card-pdfs/${filename}`;
  }

  private buildHtml(data: ReportCardData): string {
    const { report, student, grades, institution } = data;

    const branding = (institution.brandingSettings as Record<string, unknown>) ?? {};
    const primaryColor   = (branding.primaryColor   as string) || '#1e3a8a';
    const secondaryColor = (branding.secondaryColor as string) || '#f59e0b';

    const enrichedGrades = grades.map((g) => {
      const interros = [g.noteInterro1, g.noteInterro2, g.noteInterro3, g.noteInterro4]
        .filter((v) => v != null) as number[];
      const moyInterros = interros.length > 0
        ? Math.round((interros.reduce((a, b) => a + b, 0) / interros.length) * 100) / 100
        : null;
      return {
        ...g,
        moyInterros,
        passed: (g.moyenneMatiere ?? g.score) >= (g.subject?.passMark ?? 10),
        ficheSignedAt: g.ficheSignedAt
          ? new Date(g.ficheSignedAt).toLocaleDateString('fr-FR')
          : null,
        signatureData: g.signatureData ?? null,
      };
    });

    const totalCoef   = enrichedGrades.reduce((s, g) => s + g.coefficient, 0);
    const totalPoints = enrichedGrades.reduce((s, g) => s + (g.weightedScore ?? 0), 0);

    const absences =
      report.attendanceDays != null && report.attendancePresent != null
        ? report.attendanceDays - report.attendancePresent
        : null;

    const attendanceRate =
      report.attendanceDays && report.attendancePresent
        ? Math.round((report.attendancePresent / report.attendanceDays) * 100)
        : null;

    const inst = institution as any;
    const countryLine = [inst.country, inst.countryMotto].filter(Boolean).join(' — ') || null;

    const ctx = {
      institution: { ...institution, primaryColor, secondaryColor, countryLine },
      student: {
        name: student.user?.name ?? '—',
        admissionNumber: student.admissionNumber,
        dateOfBirth: student.dateOfBirth
          ? new Date(student.dateOfBirth).toLocaleDateString('fr-FR')
          : '—',
        photo: student.user?.profileImage ?? null,
      },
      class: { name: data.className },
      report: {
        ...report,
        conductLabel: report.conductRating ? CONDUCT_LABELS[report.conductRating] : '—',
        isPassing: (report.overallAverage ?? 0) >= 10,
        absences,
        attendanceRate,
        totalCoef,
        totalPoints: Math.round(totalPoints * 100) / 100,
      },
      grades: enrichedGrades,
      generatedAt: new Date().toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
      }),
    };

    return this.template(ctx);
  }
}

export interface ReportCardData {
  report: {
    id: string;
    termName: string;
    academicYear: string;
    termNumber: number;
    overallAverage: number | null;
    classRank: number | null;
    classSize: number | null;
    classHighest: number | null;
    classLowest: number | null;
    classAverage: number | null;
    mention: string | null;
    conductRating: string | null;
    teacherComment: string | null;
    principalComment: string | null;
    attendanceDays: number | null;
    attendancePresent: number | null;
    attendanceLate: number | null;
    honorCouncil: boolean | null;
    commendations: number | null;
    warnings: number | null;
    annualAverage: number | null;
    councilDecision: string | null;
  };
  student: {
    admissionNumber: string;
    dateOfBirth: Date;
    user: { name: string; profileImage?: string | null } | null;
  };
  className: string;
  grades: Array<{
    score: number;
    moyenneMatiere: number | null;
    coefficient: number;
    weightedScore: number | null;
    noteInterro1: number | null;
    noteInterro2: number | null;
    noteInterro3: number | null;
    noteInterro4: number | null;
    noteDevoir: number | null;
    noteComposition: number | null;
    rangMatiere: number | null;
    appreciation: string | null;
    teacherComment: string | null;
    teacherName: string | null;
    ficheSignedAt: Date | null;
    signatureData: string | null;
    subject: { nameFr: string; passMark: number };
  }>;
  institution: {
    name: string;
    address: string | null;
    phone: string | null;
    motto: string | null;
    logo: string | null;
    crest: string | null;
    stamp: string | null;
    brandingSettings?: unknown;
  };
}
