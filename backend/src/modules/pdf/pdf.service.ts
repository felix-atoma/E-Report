import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import * as QRCode from 'qrcode';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

let _browser: import('puppeteer').Browser | null = null;

async function getBrowser() {
  if (_browser) {
    try { await _browser.version(); return _browser; } catch { _browser = null; }
  }
  const pup = (await import('puppeteer')).default;
  _browser = await pup.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
    ],
  });
  return _browser;
}

const CONDUCT_LABELS: Record<string, string> = {
  TRES_BIEN: 'Très Bien',
  BIEN: 'Bien',
  PASSABLE: 'Passable',
  MEDIOCRE: 'Médiocre',
};

/**
 * Filigrane : nom de l'école en majuscules, coupé en 2 lignes équilibrées s'il est long,
 * avec une taille de police calculée pour remplir ~680 unités de large sans déformer le texte.
 */
export function buildWatermark(name: string | null | undefined) {
  const text = (name ?? '').trim().toUpperCase();
  if (!text) return null;
  let lines = [text];
  if (text.length > 24 && text.includes(' ')) {
    const words = text.split(/\s+/);
    let best = { diff: Infinity, i: 1 };
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ').length;
      const b = words.slice(i).join(' ').length;
      if (Math.abs(a - b) < best.diff) best = { diff: Math.abs(a - b), i };
    }
    lines = [words.slice(0, best.i).join(' '), words.slice(best.i).join(' ')];
  }
  const longest = Math.max(...lines.map((l) => l.length));
  // Arial Black majuscule ≈ 0,72 em par caractère
  const fontSize = Math.round(Math.min(120, Math.max(34, 680 / (longest * 0.72))));
  const lineHeight = Math.round(fontSize * 1.1);
  const height = lineHeight * lines.length + Math.round(fontSize * 0.3);
  return {
    height,
    fontSize,
    lines: lines.map((t, i) => ({
      text: t,
      y: Math.round(fontSize * 0.95) + i * lineHeight,
      // N'impose la largeur que si la ligne est presque pleine (évite d'étirer les noms courts)
      fit: t.length * fontSize * 0.72 > 600,
    })),
  };
}

function formatScore(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toFixed(2).replace('.', ',');
}

/** Nombre de pages d'un PDF (objets « /Type /Page », hors « /Pages »). */
export function countPdfPages(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
}

/** Primaire (CI → CM2) : notes sur 10, sans coefficients. Les moyennes restent stockées sur 20. */
export function isPrimaryLevel(level: string | null | undefined): boolean {
  return /^\s*(CI|CP\s*[12]?|CE\s*[12]|CM\s*[12])\s*$/i.test(level ?? '');
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly outputDir: string;
  private readonly baseUrl: string;
  private readonly template: HandlebarsTemplateDelegate;

  constructor(
    config: ConfigService,
    private readonly cloudinary: CloudinaryService,
  ) {
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
    Handlebars.registerHelper('inc', (val: number) => Number(val) + 1);
    Handlebars.registerHelper('fmtNote', (val: number | null | undefined) =>
      val == null ? '—' : Number(val).toFixed(0).replace('.', ','),
    );

    this.template = Handlebars.compile(templateSrc);
  }

  async generateFromHtml(html: string): Promise<Buffer> {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const buf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '15mm', right: '15mm' },
    });
    await page.close();
    return Buffer.from(buf);
  }

  /**
   * Bulletin sur UNE seule page A4 : on mesure la hauteur rendue et, si elle dépasse la zone
   * imprimable, on réduit l'échelle juste assez ; puis on vérifie le nombre de pages du PDF et
   * on réduit encore un peu si besoin. Un bulletin court garde sa taille normale (échelle 1).
   */
  private async renderOnePagePdf(html: string): Promise<Buffer> {
    const MM = 96 / 25.4;                       // px par mm à 96 dpi
    const margin = { top: 15, bottom: 15, left: 12, right: 12 };
    const printableW = Math.floor((210 - margin.left - margin.right) * MM);
    const printableH = Math.floor((297 - margin.top - margin.bottom) * MM);

    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.emulateMediaType('print');
      await page.setViewport({ width: printableW, height: printableH });
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      // Logo, photo et signatures sont des images distantes (Cloudinary) : on attend qu'elles soient
      // chargées (ou en erreur), sinon le PDF est capturé sans elles. Plafond de 15 s.
      await page.evaluate(() => Promise.race([
        Promise.all(Array.from(document.images).map((img) =>
          img.complete ? Promise.resolve() : new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
          }))),
        new Promise((resolve) => setTimeout(resolve, 15000)),
      ]));

      // Hauteur réelle du bulletin (.page), pas celle du document : celui-ci fait toujours au moins
      // la hauteur de la fenêtre, ce qui faisait croire à un dépassement pour chaque bulletin.
      const contentH: number = await page.evaluate(() => {
        const el = document.querySelector('.page') ?? document.body;
        return Math.ceil(el.getBoundingClientRect().height);
      });
      // On ne réduit que si le bulletin dépasse vraiment une page (marge de sécurité de 2 % dans ce cas)
      let scale = contentH > printableH ? (printableH / contentH) * 0.98 : 1;
      scale = Math.max(0.5, Math.floor(scale * 100) / 100);

      let buf = Buffer.alloc(0);
      for (let attempt = 0; attempt < 6; attempt++) {
        buf = Buffer.from(await page.pdf({
          format: 'A4',
          printBackground: true,
          scale,
          margin: {
            top: `${margin.top}mm`, bottom: `${margin.bottom}mm`,
            left: `${margin.left}mm`, right: `${margin.right}mm`,
          },
        }));
        if (countPdfPages(buf) <= 1 || scale <= 0.5) break;
        scale = Math.max(0.5, Math.round(scale * 0.94 * 100) / 100);
      }
      if (scale < 1) this.logger.debug(`Bulletin ajusté à une page (échelle ${scale})`);
      return buf;
    } finally {
      await page.close();
    }
  }

  async generateReportCardPdfBuffer(reportData: ReportCardData): Promise<Buffer> {
    const html = await this.buildHtml(reportData);
    try {
      return await this.renderOnePagePdf(html);
    } catch (err) {
      this.logger.error('Puppeteer PDF buffer generation failed', err);
      throw err;
    }
  }

  async generateReportCardPdf(reportData: ReportCardData): Promise<string> {
    const html = await this.buildHtml(reportData);
    const filename = `report-${reportData.report.id}-${Date.now()}.pdf`;
    const outputPath = path.join(this.outputDir, filename);

    try {
      fs.writeFileSync(outputPath, await this.renderOnePagePdf(html));
    } catch (err) {
      this.logger.error('Puppeteer PDF generation failed', err);
      throw err;
    }

    if (this.cloudinary.enabled) {
      try {
        const url = await this.cloudinary.uploadFile(outputPath, 'novabulletin/pdfs', 'raw');
        try { fs.unlinkSync(outputPath); } catch {}
        return url;
      } catch (err) {
        this.logger.error('Cloudinary PDF upload failed, falling back to local URL', err);
      }
    }

    return `${this.baseUrl}/uploads/report-card-pdfs/${filename}`;
  }

  private async buildHtml(data: ReportCardData): Promise<string> {
    const { report, student, grades, institution } = data;
    const isPrimary = isPrimaryLevel(data.classLevel);
    // Toutes les moyennes sont stockées sur 20 ; au primaire on les affiche sur 10.
    const denom = isPrimary ? 10 : 20;
    const toScale = (v: number | null | undefined) => (v == null ? null : isPrimary ? v / 2 : v);
    const fmtScaled = (v: number | null | undefined) => formatScore(toScale(v));

    const branding = (institution.brandingSettings as Record<string, unknown>) ?? {};
    const primaryColor   = (branding.primaryColor   as string) || '#1e3a8a';
    const secondaryColor = (branding.secondaryColor as string) || '#f59e0b';

    const enrichedGrades = grades.map((g) => {
      const interros = [g.noteInterro1, g.noteInterro2, g.noteInterro3, g.noteInterro4]
        .filter((v) => v != null) as number[];
      const moyInterros = interros.length > 0
        ? Math.round((interros.reduce((a, b) => a + b, 0) / interros.length) * 100) / 100
        : null;
      const moy = g.moyenneMatiere ?? g.score;
      return {
        ...g,
        moyInterros,
        passed: moy >= (g.subject?.passMark ?? 10),
        // Couleur de l'appréciation selon le niveau (vert ≥ 14, orange ≥ 10, rouge < 10)
        levelClass: moy == null ? '' : moy >= 14 ? 'lvl-good' : moy >= 10 ? 'lvl-pass' : 'lvl-fail',
        rangLabel: g.rangMatiere ? (g.rangMatiere === 1 ? '1er' : `${g.rangMatiere}e`) : null,
        noteLabel: fmtScaled(moy), // note de la matière sur l'échelle du bulletin (/10 au primaire)
        ficheSignedAt: g.ficheSignedAt
          ? new Date(g.ficheSignedAt).toLocaleDateString('fr-FR')
          : null,
        signatureData: g.signatureData ?? null,
      };
    });

    const totalCoef   = enrichedGrades.reduce((s, g) => s + g.coefficient, 0);
    const totalPoints = enrichedGrades.reduce((s, g) => s + (g.weightedScore ?? 0), 0);

    // Primaire : total des notes sur 10 de chaque matière notée (ex. 78,50 / 100 pour 10 matières)
    const graded = enrichedGrades.filter((g) => (g.moyenneMatiere ?? g.score) != null);
    const primaryTotal = graded.reduce((s, g) => s + ((g.moyenneMatiere ?? g.score) as number) / 2, 0);
    const primaryTotalMax = graded.length * 10;

    const absences =
      report.attendanceDays != null && report.attendancePresent != null
        ? report.attendanceDays - report.attendancePresent
        : null;

    const attendanceRate =
      report.attendanceDays && report.attendancePresent
        ? Math.round((report.attendancePresent / report.attendanceDays) * 100)
        : null;

    // Retards affichés en heures, virgule décimale (ex. 1,5 h)
    const lateHours =
      report.attendanceLateMinutes != null
        ? (Math.round((report.attendanceLateMinutes / 60) * 10) / 10).toString().replace('.', ',')
        : null;
    const hasAttendance =
      !!report.attendanceDays || report.attendanceAbsent != null ||
      report.attendanceExcused != null || report.attendanceLateMinutes != null;

    const inst = institution as any;
    const countryLine = [inst.country, inst.countryMotto].filter(Boolean).join(' — ') || null;
    const circonscription = (branding.circonscription as string) || null;

    // En-tête : rang à la française (1er / 1ère / 2e), moyenne avec virgule
    const isFemale = student.sex === 'F';
    const rankLabel = report.classRank != null
      ? (report.classRank === 1 ? (isFemale ? '1ère' : '1er') : `${report.classRank}e`)
      : null;
    const sexLabel = student.sex === 'F' ? 'Féminin' : student.sex === 'M' ? 'Masculin' : '—';

    let qrDataUri: string | null = null;
    const securityCode = (report as any).securityCode;
    if (securityCode) {
      try {
        qrDataUri = await QRCode.toDataURL(String(securityCode), {
          margin: 0,
          width: 220,
          errorCorrectionLevel: 'M',
        });
      } catch (err) {
        this.logger.warn(`QR generation failed: ${err}`);
      }
    }

    const ctx = {
      institution: {
        ...institution, primaryColor, secondaryColor, countryLine, circonscription,
        headerLogo: inst.logo || inst.crest || null,
      },
      student: {
        name: student.user?.name ?? '—',
        sexLabel,
        admissionNumber: student.admissionNumber,
        dateOfBirth: student.dateOfBirth
          ? new Date(student.dateOfBirth).toLocaleDateString('fr-FR')
          : '—',
        photo: student.user?.profileImage ?? null,
      },
      class: { name: data.className },
      isPrimary,
      // Valeurs prêtes à imprimer, sur l'échelle du bulletin (/10 au primaire, /20 sinon)
      scale: {
        denom,
        passLabel: isPrimary ? '5' : '10',
        classHighest: fmtScaled(report.classHighest),
        classLowest: fmtScaled(report.classLowest),
        classAverage: fmtScaled(report.classAverage),
        overallAverage: fmtScaled(report.overallAverage),
        annualAverage: report.annualAverage != null ? fmtScaled(report.annualAverage) : null,
        primaryTotal: formatScore(Math.round(primaryTotal * 100) / 100),
        primaryTotalMax,
      },
      report: {
        ...report,
        conductLabel: report.conductRating ? CONDUCT_LABELS[report.conductRating] : '—',
        isPassing: (report.overallAverage ?? 0) >= 10,
        rankLabel,
        averageLabel: report.overallAverage != null ? fmtScaled(report.overallAverage) : null,
        hasDistinctions: !!(report.honorCouncil || report.commendations || report.warnings),
        annualIsPassing: report.annualAverage != null ? report.annualAverage >= 10 : null,
        absences,
        attendanceRate,
        lateHours,
        hasAttendance,
        totalCoef,
        totalPoints: Math.round(totalPoints * 100) / 100,
      },
      grades: enrichedGrades,
      generatedAt: new Date().toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
      }),
      qrDataUri,
      watermark: buildWatermark(institution.name),
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
    attendanceAbsent: number | null;
    attendanceAbsentHours: number | null;
    attendanceExcused?: number | null;
    attendanceLateMinutes?: number | null;
    honorCouncil: boolean | null;
    commendations: number | null;
    warnings: number | null;
    annualAverage: number | null;
    councilDecision: string | null;
    securityCode?: string | null;
  };
  student: {
    admissionNumber: string;
    dateOfBirth: Date;
    sex?: string | null;
    user: { name: string; profileImage?: string | null } | null;
  };
  className: string;
  /** Niveau de la classe (CI, CP1…CM2, 6ème…) — détermine le modèle primaire ou secondaire. */
  classLevel?: string | null;
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
