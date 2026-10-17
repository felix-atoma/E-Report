import { formatSessionDays } from '../../common/utils/session-dates.util';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import * as QRCode from 'qrcode';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { scoreToFrench } from './number-to-french';

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

/**
 * Image Cloudinary redimensionnée pour le PDF : logo et photo sont souvent des photos de téléphone de
 * plusieurs Mo, intégrées telles quelles par Chrome (PDF de 6 Mo, téléchargement interrompu). Une
 * largeur de 400 px suffit largement à l'impression. Les autres adresses sont laissées telles quelles.
 */
export function pdfImage(url: string | null | undefined, width = 400): string | null {
  if (!url) return null;
  const m = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/.exec(url);
  if (!m) return url;
  // Déjà transformée (ex. w_300,…) : on ne touche pas
  if (/^[a-z]{1,3}_[^/]*\//.test(m[2]) && !/^v\d+\//.test(m[2])) return url;
  return `${m[1]}w_${width},c_limit,q_auto,f_jpg/${m[2]}`;
}

/**
 * Rentrée suivante, pour aider les parents à se préparer (bulletins du primaire) : début de la période
 * suivante (dates réglées par l'admin dans Paramètres), ou rentrée de l'année suivante après la
 * dernière période. Rien si la date n'est pas réglée — on n'invente pas de date.
 */
export function nextTermStart(
  academicSettings: unknown,
  academicYear: string,
  termType: string | null | undefined,
  termNumber: number,
): { label: string; dateLabel: string } | null {
  const settings = (academicSettings ?? {}) as Record<string, any>;
  const dates: Array<{ termNumber: number; start?: string }> = Array.isArray(settings.termDates) ? settings.termDates : [];
  const type = termType ?? 'TRIMESTRE';
  if ((settings.termType ?? 'TRIMESTRE') !== type) return null;   // dates réglées pour un autre système
  const total = type === 'TRIMESTRE' ? 3 : type === 'SEMESTRE' ? 2 : Math.max(dates.length, termNumber);
  const word = type === 'SEMESTRE' ? 'semestre' : type === 'TRIMESTRE' ? 'trimestre' : 'période';
  const fmt = (iso: string) => {
    const d = new Date(`${iso}T12:00:00Z`);
    return isNaN(d.getTime()) ? null
      : (() => {
        const t = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
        return t.charAt(0).toUpperCase() + t.slice(1);   // « Lundi 4 janvier 2027 »
      })();
  };

  if (termNumber < total) {
    const next = dates.find((t) => Number(t.termNumber) === termNumber + 1);
    const dateLabel = next?.start ? fmt(next.start) : null;
    return dateLabel ? { label: `Rentrée du ${termNumber + 1}e ${word}`, dateLabel } : null;
  }
  const start = typeof settings.nextSchoolYearStart === 'string' ? settings.nextSchoolYearStart : '';
  const dateLabel = start ? fmt(start) : null;
  const y = parseInt((academicYear ?? '').split('-')[1], 10);
  return dateLabel ? { label: isNaN(y) ? 'Rentrée scolaire' : `Rentrée scolaire ${y}-${y + 1}`, dateLabel } : null;
}

/** N° de série de secours (bulletin sans code de sécurité) — même format que la page web. */
function fallbackSerial(report: { academicYear?: string; termNumber?: number; id?: string }): string {
  const ay = (report.academicYear ?? '').replace('-', '').slice(-4);
  const id = (report.id ?? '').replace(/-/g, '').toUpperCase().slice(0, 8);
  return `${ay}T${report.termNumber ?? 1}-${id.slice(0, 4)}-${id.slice(4, 8)}`;
}

const SYSTEM_FONTS = new Set([
  'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Georgia', 'Garamond',
  'Palatino Linotype', 'Palatino', 'Trebuchet MS', 'Verdana', 'Geneva',
  'Courier New', 'Courier', 'Impact', 'Comic Sans MS',
]);

/**
 * Thème du bulletin depuis les réglages de l'établissement — mêmes valeurs par défaut que la
 * page d'impression web (PrintReportCardPage.jsx), pour un rendu identique.
 */
function bulletinTheme(branding: Record<string, unknown>, primary: string, secondary: string) {
  const fontName = String(branding.bulletinFontFamily || 'Arial').trim();
  const str = (k: string, d: string) => String(branding[k] || d).replace(/[;{}<>]/g, '');
  return {
    primary, secondary,
    fontFamily: `'${fontName.replace(/['";{}<>]/g, '')}', sans-serif`,
    fontSize: str('bulletinFontSize', '10px'),
    h1Size: str('bulletinH1Size', '1.3em'), h1Weight: str('bulletinH1Weight', '900'),
    h2Size: str('bulletinH2Size', '1.1em'), h2Weight: str('bulletinH2Weight', '900'),
    h3Size: str('bulletinH3Size', '0.8em'), h3Weight: str('bulletinH3Weight', '800'),
    googleFontUrl: SYSTEM_FONTS.has(fontName) ? null
      : `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;700&display=swap`,
  };
}

/** Nombre de pages d'un PDF (objets « /Type /Page », hors « /Pages »). */
export function countPdfPages(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
}

/**
 * Cachet de l'établissement imprimé sur le bulletin ? Réglage de l'école (brandingSettings.stampMode) :
 * « MANUAL » par défaut (case vide, cachet humide après impression) ou « DIGITAL » (image du cachet),
 * l'image n'apparaissant alors que sur un bulletin publié.
 */
export function digitalStampFor(branding: unknown, stamp: string | null | undefined, status: string | null | undefined): boolean {
  return (branding as Record<string, unknown> | null)?.stampMode === 'DIGITAL' && !!stamp && status === 'PUBLISHED';
}

/** Primaire (CI → CM2) : notes sur 10, sans coefficients. Les moyennes restent stockées sur 20. */
export function isPrimaryLevel(level: string | null | undefined): boolean {
  return /^\s*(CI|CP\s*[12]?|CE\s*[12]|CM\s*[12])\s*$/i.test(level ?? '');
}

/**
 * Primaire : chaque matière garde son barème (« Noté sur » 10 ou 20, réglé dans Matières).
 * La moyenne d'une matière est stockée sur 20 ; la note affichée est ramenée à son barème.
 */
export function primarySubjectMax(maxScore: number | null | undefined): number {
  return maxScore != null && maxScore <= 10 ? 10 : 20;
}

/**
 * Primaire : l'anglais est une discipline notée à part — encadré à côté du tableau des notes,
 * sans compter dans le total des points, la moyenne ni le rang.
 */
export function isPrimaryEnglish(subject: { nameFr?: string | null; category?: string | null } | null | undefined): boolean {
  // Catégorie « Section anglaise » choisie dans Matières (English Grammar, Reading Comprehension,
  // Dictation…), ou nom contenant « anglais » / « english »
  return subject?.category === 'ANGLAIS' || /anglais|english/i.test(subject?.nameFr ?? '');
}

/** Total de la partie anglaise du primaire (affiché dans son encadré quand elle a plusieurs matières). */
export function englishTotals(grades: Parameters<typeof primaryTotals>[0]) {
  let total = 0;
  let max = 0;
  let count = 0;
  for (const g of grades) {
    if (!isPrimaryEnglish(g.subject)) continue;
    count++;
    const moy20 = g.moyenneMatiere ?? g.score;
    if (moy20 == null) continue;
    const m = primarySubjectMax(g.subject?.maxScore);
    total += (moy20 * m) / 20;
    max += m;
  }
  return { total: formatScore(Math.round(total * 100) / 100), max, multiple: count > 1 && max > 0 };
}

/**
 * Totaux du primaire, à la togolaise : somme des notes (chacune sur son barème) sur la somme des
 * barèmes ; moyenne sur 10 = total ÷ maximum × 10. Les matières non notées sont ignorées.
 */
export function primaryTotals(grades: Array<{ moyenneMatiere?: number | null; score?: number | null; subject?: { maxScore?: number | null; nameFr?: string | null; category?: string | null } | null }>) {
  let total = 0;
  let max = 0;
  for (const g of grades) {
    const moy20 = g.moyenneMatiere ?? g.score;
    if (moy20 == null) continue;
    // L'anglais est noté à part au primaire : hors total, moyenne et rang
    if (isPrimaryEnglish(g.subject)) continue;
    const m = primarySubjectMax(g.subject?.maxScore);
    total += (moy20 * m) / 20;
    max += m;
  }
  return {
    total: Math.round(total * 100) / 100,
    max,
    /** Moyenne générale sur 20 (stockée), soit total ÷ maximum × 20 */
    average20: max > 0 ? Math.round(((total / max) * 20) * 100) / 100 : null,
  };
}

/** Textes du relevé de notes : français, ou anglais pour les compositions d'anglais. */
const RELEVE_LABELS_FR = {
  title: 'Relevé de notes', name: 'Nom et prénoms', admission: 'N° Matricule', sex: 'Sexe', male: 'Masculin', female: 'Féminin',
  dob: 'Date de naissance', className: 'Classe', year: 'Année scolaire', session: 'Session', date: 'Date',
  average: 'Moyenne', rank: 'Rang', subjects: 'Matières', mark: 'Note', coef: 'Coef.', points: 'Points',
  appreciation: 'Appréciation', totals: 'TOTAUX', resultCm: 'Résultat de la composition', resultDs: 'Résultat du devoir',
  result: 'Résultat', passed: 'MOYENNE ATTEINTE', belowAverage: 'SOUS LA MOYENNE', scaleTitle: 'Barème des appréciations',
  results: 'Résultats', gradedSubjects: 'Matières notées', teacherCm: 'Le Maître / La Maîtresse', subjectTeachers: 'Professeur(s) de matière',
  teacher: 'Le Professeur Principal', nameSign: '(Nom et signature)', head: "Le Directeur de l'École",
  stampSign: '(Cachet et signature)', doneOn: 'Fait le', parents: 'Visa des Parents', readApproved: '(Lu et approuvé)',
  seenOn: 'Vu le :', generated: 'Généré le', verifyAlt: 'Code de vérification',
  scale20: '18 à 20 : Excellent · 16 à 17,99 : Très Bien · 14 à 15,99 : Bien · 12 à 13,99 : Assez Bien · 10 à 11,99 : Passable · 8 à 9,99 : Insuffisant · 0 à 7,99 : Très Insuffisant',
  scale10: '9 à 10 : Excellent · 8 à 8,99 : Très Bien · 7 à 7,99 : Bien · 6 à 6,99 : Assez Bien · 5 à 5,99 : Passable · 4 à 4,99 : Insuffisant · 0 à 3,99 : Très Insuffisant',
  scalePercent: '90 à 100 % : Excellent · 80 à 89 % : Très Bien · 70 à 79 % : Bien · 60 à 69 % : Assez Bien · 50 à 59 % : Passable · 40 à 49 % : Insuffisant · 0 à 39 % : Très Insuffisant',
};
const RELEVE_LABELS_EN: typeof RELEVE_LABELS_FR = {
  title: 'Report sheet', name: 'Full name', admission: 'Admission No.', sex: 'Sex', male: 'Male', female: 'Female',
  dob: 'Date of birth', className: 'Class', year: 'School year', session: 'Test', date: 'Date',
  average: 'Average', rank: 'Position', subjects: 'Subjects', mark: 'Mark', coef: 'Coef.', points: 'Points',
  appreciation: 'Remark', totals: 'TOTAL', resultCm: 'Test result', resultDs: 'Test result',
  result: 'Result', passed: 'PASSED', belowAverage: 'BELOW AVERAGE', scaleTitle: 'Grading scale',
  results: 'Results', gradedSubjects: 'Subjects marked', teacherCm: 'Class Teacher', subjectTeachers: 'Subject Teacher(s)',
  teacher: 'Class Teacher', nameSign: '(Name and signature)', head: 'Head Teacher',
  stampSign: '(Stamp and signature)', doneOn: 'Date', parents: "Parent's signature", readApproved: '(Read and approved)',
  seenOn: 'Seen on:', generated: 'Generated on', verifyAlt: 'Verification code',
  scale20: '18–20: Excellent · 16–17.99: Very Good · 14–15.99: Good · 12–13.99: Fairly Good · 10–11.99: Satisfactory · 8–9.99: Insufficient · 0–7.99: Very Poor',
  scale10: '9–10: Excellent · 8–8.99: Very Good · 7–7.99: Good · 6–6.99: Fairly Good · 5–5.99: Satisfactory · 4–4.99: Insufficient · 0–3.99: Very Poor',
  scalePercent: '90–100%: Excellent · 80–89%: Very Good · 70–79%: Good · 60–69%: Fairly Good · 50–59%: Satisfactory · 40–49%: Insufficient · 0–39%: Very Poor',
};

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th, 21st … */
export function englishOrdinal(n: number): string {
  const s = n % 100;
  if (s >= 11 && s <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

/** Classes du secondaire : 6ème → Terminale (devoirs surveillés). */
export function isSecondaryLevel(level: string | null | undefined): boolean {
  return /^\s*([3-6]\s*(e|è|eme|ème)|2\s*nde|seconde|1\s*(re|ere|ère)|premi[eè]re|tle|terminale)\s*$/i.test(level ?? '');
}

/** Relevé des devoirs surveillés en grands caractères (lisibilité pour les malvoyants). */
const RELEVE_LARGE_CSS = [
  'body{font-size:15.5px;color:#000}',
  '.hd-contacts li{font-size:15px;color:#000}',
  '.info{font-size:16.5px;margin:0 0 4px}.info td{padding:1px 10px 1px 0}.info .lbl{font-weight:800;color:#000}.info .val{font-weight:800}.info .val--strong{font-size:18px}',
  '.grades{font-size:16.5px}.grades th,.grades td{padding:3px 7px;border-width:1.5px}',
  '.grades thead th{font-size:13.5px;color:#000}.grades thead th small{color:#000;font-weight:700}',
  '.grades .c-num,.grades .c-mat,.grades .c-pts,.grades .c-appr,.grades td{font-weight:800;color:#000}',
  '.grades .c-note{font-size:19.5px;font-weight:900}.grades .c-appr.lvl-good{color:#166534}.grades .c-appr.lvl-pass{color:#9a3412}.grades .c-appr.lvl-fail{color:#b91c1c}',
  '.grades tfoot td{font-size:18px;font-weight:900}',
  '.bottom-left{padding:6px 10px;gap:6px}.result-box{padding:5px}.result-box .lbl{font-size:13.5px;color:#000}.result-box .val{font-size:24px}',
  '.scale,.scale-title{font-size:12.5px;color:#000;font-weight:700}',
  '.res-title{font-size:15px}.res{font-size:16px}.res td{padding:3px 10px;font-weight:700;color:#000}.res tr.grand td{font-size:19px}',
  '.sig-box{padding:4px 10px 6px}.sig-title{font-size:13.5px}.sig-hint{font-size:11.5px;color:#000;margin-bottom:12px}.sig-name{font-size:12.5px;color:#000;font-weight:700}',
  '.footer{font-size:11.5px;color:#000}',
].join('');

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly outputDir: string;
  private readonly baseUrl: string;
  private readonly verifyUrl: string;
  private template: HandlebarsTemplateDelegate;
  private templatePath = path.join(__dirname, 'templates', 'report-card.hbs');
  private templateMtime = 0;
  private readonly releveTemplate: HandlebarsTemplateDelegate;

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
    // Adresse de vérification imprimée en pied de bulletin (même lien que la version web)
    const frontend = (config.get<string>('FRONTEND_URL') ?? '').split(',')[0].trim();
    this.verifyUrl = `${(frontend || 'http://localhost:5173').replace(/\/+$/, '')}/verify`;
    fs.mkdirSync(this.outputDir, { recursive: true });

    Handlebars.registerHelper('formatScore', (val: number | null) => formatScore(val));
    Handlebars.registerHelper('fmtScore', (val: number | null) => formatScore(val));
    Handlebars.registerHelper('inc', (val: number) => Number(val) + 1);
    Handlebars.registerHelper('fmtNote', (val: number | null | undefined) =>
      val == null ? '—' : Number(val).toFixed(0).replace('.', ','),
    );

    this.template = this.loadTemplate();
    this.releveTemplate = Handlebars.compile(
      fs.readFileSync(path.join(__dirname, 'templates', 'releve.hbs'), 'utf8'),
    );
  }

  /**
   * Modèle du bulletin, relu dès que le fichier change : une modification du modèle s'applique aux
   * PDF suivants sans redémarrer le serveur (sinon l'ancien modèle restait en mémoire).
   */
  private loadTemplate(): HandlebarsTemplateDelegate {
    const mtime = fs.statSync(this.templatePath).mtimeMs;
    if (!this.template || mtime !== this.templateMtime) {
      this.template = Handlebars.compile(fs.readFileSync(this.templatePath, 'utf8'));
      this.templateMtime = mtime;
    }
    return this.template;
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
  /** half : demi-feuille A4 (A5 paysage, 210 × 148,5 mm) — relevés imprimés deux par feuille. */
  /** fill : étire le tableau des notes pour remplir toute la hauteur de la page — relevé des DS. */
  private async renderOnePagePdf(html: string, half = false, fill = false): Promise<Buffer> {
    const MM = 96 / 25.4;                       // px par mm à 96 dpi
    const sheet = half ? { w: 210, h: 148.5 } : { w: 210, h: 297 };
    // Remplissage : le gabarit imprime sans marge (@page margin:0) — on mesure donc sur la feuille entière,
    // avec une marge intérieure de 6 mm pour que l'imprimante ne coupe pas le cadre.
    const margin = half ? { top: 6, bottom: 6, left: 8, right: 8 }
      : fill ? { top: 0, bottom: 0, left: 0, right: 0 } : { top: 15, bottom: 15, left: 12, right: 12 };
    const printableW = Math.floor((sheet.w - margin.left - margin.right) * MM);
    const printableH = Math.floor((sheet.h - margin.top - margin.bottom) * MM);
    // Demi-feuille : le gabarit déclare une page A4 (@page) que Chrome réduirait en plus pour la faire
    // tenir sur la demi-feuille — on la remplace par le vrai format
    // Espacements resserrés pour que le texte (agrandi pour la lisibilité) reste grand une fois tenu sur la demi-feuille
    if (half) html = html.replace('</head>', '<style>@page { size: 210mm 148.5mm; margin: 6mm 8mm; }'
      + '.hd{padding:3px 8px 2px}.hd-logo{width:62px;height:62px}.hd-qr{width:54px;height:54px}.hd-photo{width:58px;height:70px}'
      + '.info{margin:0 0 3px}.info td{padding:1px 10px 1px 0}.grades th,.grades td{padding:2px 6px}'
      + '.bottom-left{padding:4px 8px;gap:4px}.result-box{padding:3px}.result-box .val{font-size:18px}.res td{padding:2px 8px}'
      + '.sig-box{padding:3px 8px 4px}.sig-hint{margin-bottom:10px}.top-bar{padding-top:4px;padding-bottom:4px}</style></head>');

    if (fill) html = html.replace('</head>', '<style>@media print{.page{padding:6mm 7mm !important}}</style></head>');

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

      // Remplir la page : la hauteur restante est répartie sur les lignes du tableau des notes.
      // (Un zoom agrandirait aussi le texte, mais Chrome ne l'imprime pas comme il le mesure à l'écran.)
      // Marge de sécurité de 1,5 % : la mise en page imprimée est un peu plus haute que celle mesurée.
      if (fill) {
        await page.evaluate((maxH: number) => {
          const el = document.querySelector('.page') as HTMLElement | null;
          const rows = Array.from(document.querySelectorAll('.grades tbody tr')) as HTMLElement[];
          if (!el || !rows.length) return;
          const gap = maxH - el.getBoundingClientRect().height;
          if (gap <= 2) return;
          const extra = gap / rows.length;
          rows.forEach((tr) => { tr.style.height = `${tr.getBoundingClientRect().height + extra}px`; });
          if (el.getBoundingClientRect().height > maxH) rows.forEach((tr) => { tr.style.height = ''; });
        }, printableH * 0.985);
      }

      // Hauteur réelle du bulletin (.page), pas celle du document : celui-ci fait toujours au moins
      // la hauteur de la fenêtre, ce qui faisait croire à un dépassement pour chaque bulletin.
      const contentH: number = await page.evaluate(() => {
        const el = document.querySelector('.page') ?? document.body;
        return Math.ceil(el.getBoundingClientRect().height);
      });
      // On ne réduit que si le bulletin dépasse vraiment une page (marge de sécurité de 2 % dans ce cas)
      let scale = contentH > printableH ? (printableH / contentH) * 0.98 : 1;
      scale = Math.max(half ? 0.35 : 0.5, Math.floor(scale * 100) / 100);

      let buf = Buffer.alloc(0);
      for (let attempt = 0; attempt < 6; attempt++) {
        buf = Buffer.from(await page.pdf({
          width: `${sheet.w}mm`,
          height: `${sheet.h}mm`,
          printBackground: true,
          scale,
          margin: {
            top: `${margin.top}mm`, bottom: `${margin.bottom}mm`,
            left: `${margin.left}mm`, right: `${margin.right}mm`,
          },
        }));
        if (countPdfPages(buf) <= 1 || scale <= (half ? 0.35 : 0.5)) break;
        scale = Math.max(half ? 0.35 : 0.5, Math.round(scale * 0.94 * 100) / 100);
      }
      if (scale < 1) this.logger.debug(`Bulletin ajusté à une page (échelle ${scale})`);
      return buf;
    } finally {
      await page.close();
    }
  }

  /**
   * Bulletin : le modèle reproduit exactement la page d'impression web (feuille A4 de 210 × 297 mm,
   * mise à l'échelle par le script du modèle quand le contenu dépasse). On imprime donc sans marge
   * ni réduction Puppeteer : la feuille HTML est déjà la page A4.
   */
  private async renderA4SheetPdf(html: string): Promise<Buffer> {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.emulateMediaType('print');
      await page.setViewport({ width: 794, height: 1123 }); // A4 à 96 dpi
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      // Images distantes (logo, photo, signatures) et police Google éventuelle : plafond de 15 s
      await page.evaluate(() => Promise.race([
        Promise.all([
          ...Array.from(document.images).map((img) =>
            img.complete ? Promise.resolve() : new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            })),
          (document as any).fonts?.ready ?? Promise.resolve(),
        ]),
        new Promise((resolve) => setTimeout(resolve, 15000)),
      ]));
      // Ajustement à une page, une fois images et police en place (même calcul que la page web)
      await page.evaluate(() => (window as any).__fitBulletin?.());
      return Buffer.from(await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
        pageRanges: '1',
      }));
    } finally {
      await page.close();
    }
  }

  /**
   * Relevé de notes d'un examen blanc ou d'un devoir surveillé : même charte, même filigrane
   * et même mise sur une page que le bulletin.
   */
  /** half : relevé au format demi-feuille (A5 paysage), pour l'impression deux par feuille. */
  async generateRelevePdfBuffer(data: ReleveData, half = false): Promise<Buffer> {
    const { institution, exam, student } = data;
    const branding = (institution.brandingSettings as Record<string, unknown>) ?? {};
    const inst = institution as any;
    // Devoir surveillé et composition mensuelle : pas d'« admis / ajourné » (ce ne sont pas des examens)
    // Compositions du primaire (mensuelle, anglais) : chaque matière sur son barème (10 ou 20)
    const isCm = exam.examType === 'COMPOSITION_MENSUELLE' || exam.examType === 'COMPOSITION_ANGLAIS';
    // Composition d'anglais : moyenne en pourcentage
    const isPercent = exam.examType === 'COMPOSITION_ANGLAIS';
    // Composition d'anglais : relevé entièrement en anglais (textes, dates, décimales avec un point)
    const en = isPercent;
    const num = (v: number | null | undefined) => (en ? formatScore(v).replace(',', '.') : formatScore(v));
    const isDs = exam.examType === 'DEVOIR_SURVEILLE' || isCm;
    const isBac = exam.examType === 'BAC1' || exam.examType === 'BAC2';
    const female = student.sex === 'F';
    const scale = exam.scale ?? 20;          // 10 pour les compositions mensuelles (primaire)
    const pass = scale / 2;

    const rows = data.rows.map((r) => {
      const max = r.max ?? scale;                // barème de la matière
      const on20 = r.score == null ? null : (r.score * 20) / max;
      return {
        ...r,
        max,
        scoreLabel: num(r.score),
        pointsLabel: r.score != null ? num(r.score * r.coefficient) : '—',
        passed: on20 == null || on20 >= 10,
        levelClass: on20 == null ? '' : on20 >= 14 ? 'lvl-good' : on20 >= 10 ? 'lvl-pass' : 'lvl-fail',
      };
    });
    const graded = rows.filter((r) => r.score != null);
    const totalCoef = graded.reduce((s, r) => s + r.coefficient, 0);
    const totalPoints = graded.reduce((s, r) => s + (r.score as number) * r.coefficient, 0);
    // Points possibles (compositions mensuelles : chaque matière sur 10 ou 20)
    const totalMax = graded.reduce((s, r) => s + r.max * r.coefficient, 0);

    const L = en ? RELEVE_LABELS_EN : RELEVE_LABELS_FR;

    // Examen : admis / admissible (BAC ≥ 9) / ajourné — Devoir surveillé : moyenne atteinte ou non
    const avg = data.average;
    const result = avg == null ? { text: '—', cls: '' }
      : isDs ? (avg >= pass ? { text: L.passed, cls: 'pass' } : { text: L.belowAverage, cls: 'fail' })
      : avg >= pass ? { text: female ? 'ADMISE' : 'ADMIS', cls: 'pass' }
      : isBac && avg >= 9 ? { text: 'ADMISSIBLE', cls: 'admissible' }
      : { text: female ? 'AJOURNÉE' : 'AJOURNÉ', cls: 'fail' };

    const fmtDate = (d?: Date | string | null) => (d ? new Date(d).toLocaleDateString(en ? 'en-GB' : 'fr-FR') : null);
    const dates = formatSessionDays(exam.examDate, exam.examEndDate, en ? 'en' : 'fr') ?? '—';
    const rankLabel = data.rank == null ? null
      : en ? englishOrdinal(data.rank)
      : (data.rank === 1 ? (female ? '1ère' : '1er') : `${data.rank}e`);

    // QR code : ouvre la page de vérification avec le code du relevé
    let qrDataUri: string | null = null;
    if (data.verifyCode) {
      try {
        qrDataUri = await QRCode.toDataURL(`${this.verifyUrl}?code=${encodeURIComponent(data.verifyCode)}`, {
          margin: 0, width: 220, errorCorrectionLevel: 'M',
        });
      } catch (err) {
        this.logger.warn(`QR generation failed: ${err}`);
      }
    }

    const html = this.releveTemplate({
      institution: {
        ...institution,
        primaryColor: (branding.primaryColor as string) || '#1e3a8a',
        secondaryColor: (branding.secondaryColor as string) || '#f59e0b',
        countryLine: [inst.country, inst.countryMotto].filter(Boolean).join(' — ') || null,
        circonscription: (branding.circonscription as string) || null,
        headerLogo: pdfImage(inst.logo || inst.crest),
      },
      exam: { ...exam, dates, typeLabel: exam.typeLabel },
      student: {
        ...student,
        photo: pdfImage((student as any).photo),
        sexLabel: student.sex === 'F' ? L.female : student.sex === 'M' ? L.male : '—',
        // Facultatives : la ligne et le cadre disparaissent quand l'école ne les fournit pas
        dateOfBirth: fmtDate(student.dateOfBirth),
      },
      rows,
      gradedCount: graded.length,
      totalCoef,
      totalPointsLabel: num(Math.round(totalPoints * 100) / 100),
      totalMax,
      averageLabel: avg != null ? num(avg) : null,
      isPassing: (avg ?? 0) >= pass,
      scale,
      isPrimaryScale: scale === 10,
      isPercentScale: isPercent,
      isCm,
      // Titulaire dans « Le Maître », professeurs de matière dans leur propre cadre. Composition d'anglais :
      // pas de cadre titulaire, seulement les professeurs (d'anglais) qui ont signé leurs fiches.
      showClassTeacher: !en,
      classSignatures: en ? [] : (data.teacherSignatures ?? []).filter((t) => t.classTeacher),
      subjectSignatures: en
        ? (data.teacherSignatures ?? []).filter((t) => t.fromSession !== false)
        : (data.teacherSignatures ?? []).filter((t) => !t.classTeacher),
      qrDataUri,
      verifyCode: data.verifyCode ?? null,
      verifyUrl: this.verifyUrl,
      // « 12,50 / 20 », « 6,25 / 10 » ou « 72,50 % » (composition d'anglais)
      avgSuffix: isPercent ? ' %' : ` / ${scale}`,
      appreciation: data.appreciation,
      rankLabel,
      classSize: data.classSize,
      result,
      isDs,
      L,
      lang: en ? 'en' : 'fr',
      watermark: buildWatermark(institution.name),
      generatedAt: new Date().toLocaleDateString(en ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
    });
    // Devoir surveillé (page entière) : gros caractères et tout en gras, pour les personnes qui voient mal.
    // Le contenu est agrandi pour remplir la page A4 ; s'il dépassait, renderOnePagePdf le ramènerait à une page.
    const large = !half && exam.examType === 'DEVOIR_SURVEILLE';
    return this.renderOnePagePdf(large ? html.replace('</head>', `<style>${RELEVE_LARGE_CSS}</style></head>`) : html, half, large);
  }

  async generateReportCardPdfBuffer(reportData: ReportCardData): Promise<Buffer> {
    const html = await this.buildHtml(reportData);
    try {
      return await this.renderA4SheetPdf(html);
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
      fs.writeFileSync(outputPath, await this.renderA4SheetPdf(html));
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
        // Primaire : la moyenne de chaque matière est la moitié de son barème (10 / 20 une fois ramenée sur 20)
        passed: moy == null || moy >= (isPrimary ? 10 : (g.subject?.passMark ?? 10)),
        // Couleur de l'appréciation selon le niveau (vert ≥ 14, orange ≥ 10, rouge < 10)
        levelClass: moy == null ? '' : moy >= 14 ? 'lvl-good' : moy >= 10 ? 'lvl-pass' : 'lvl-fail',
        rangLabel: g.rangMatiere ? (g.rangMatiere === 1 ? '1er' : `${g.rangMatiere}e`) : null,
        moyLabel: formatScore(moy),
        // Primaire : note ramenée au barème de la matière (/10 ou /20) ; secondaire : sur 20
        noteMax: primarySubjectMax(g.subject?.maxScore),
        noteLabel: isPrimary
          ? (moy == null ? '—' : formatScore((moy * primarySubjectMax(g.subject?.maxScore)) / 20))
          : fmtScaled(moy),
        ficheSignedAt: g.ficheSignedAt
          ? new Date(g.ficheSignedAt).toLocaleDateString('fr-FR')
          : null,
        // Fiche validée par l'administration (sans signature manuscrite) : coche ✓ comme sur la page web
        adminVerified: g.signatureData === 'ADMIN_VERIFIED',
        signatureData: g.signatureData && g.signatureData !== 'ADMIN_VERIFIED' ? g.signatureData : null,
      };
    })
      // Même ordre que la page d'impression : coefficients les plus forts en premier
      .sort((a, b) => (b.coefficient ?? 0) - (a.coefficient ?? 0));

    const totalCoef   = enrichedGrades.reduce((s, g) => s + g.coefficient, 0);
    const totalPoints = enrichedGrades.reduce((s, g) => s + (g.weightedScore ?? 0), 0);

    // Primaire : somme des notes (chaque matière sur son barème) sur la somme des barèmes,
    // moyenne sur 10 = total ÷ maximum × 10 (ex. 132,50 / 180 → 7,36 / 10)
    const pt = primaryTotals(enrichedGrades);
    const primaryTotal = pt.total;
    const primaryTotalMax = pt.max;
    // Moyenne affichée : au primaire, toujours celle des totaux imprimés (cohérente avec la page)
    const displayAverage = isPrimary ? (pt.average20 ?? report.overallAverage) : report.overallAverage;

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
        headerLogo: pdfImage(inst.logo || inst.crest),
      },
      student: {
        name: student.user?.name ?? '—',
        sexLabel,
        admissionNumber: student.admissionNumber,
        // Facultatives : la ligne et le cadre disparaissent quand l'école ne les fournit pas
        dateOfBirth: student.dateOfBirth
          ? new Date(student.dateOfBirth).toLocaleDateString('fr-FR')
          : null,
        photo: pdfImage(student.user?.profileImage),
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
        overallAverage: fmtScaled(displayAverage),
        annualAverage: report.annualAverage != null ? fmtScaled(report.annualAverage) : null,
        primaryTotal: formatScore(Math.round(primaryTotal * 100) / 100),
        primaryTotalMax,
      },
      report: {
        ...report,
        conductLabel: report.conductRating ? CONDUCT_LABELS[report.conductRating] : '—',
        isPassing: (displayAverage ?? 0) >= 10,
        rankLabel,
        averageLabel: displayAverage != null ? fmtScaled(displayAverage) : null,
        hasDistinctions: !!(report.honorCouncil || report.commendations || report.warnings),
        annualIsPassing: report.annualAverage != null ? report.annualAverage >= 10 : null,
        absences,
        attendanceRate,
        lateHours,
        hasAttendance,
        hasAbsent: report.attendanceAbsent != null,
        hasExcused: report.attendanceExcused != null,
        totalCoef,
        totalPoints: Math.round(totalPoints * 100) / 100,
      },
      // Primaire : l'anglais sort du tableau (hors total) et passe dans l'encadré à côté
      grades: isPrimary ? enrichedGrades.filter((g) => !isPrimaryEnglish(g.subject)) : enrichedGrades,
      primaryEnglish: isPrimary ? enrichedGrades.filter((g) => isPrimaryEnglish(g.subject)) : [],
      englishTotals: isPrimary ? englishTotals(enrichedGrades) : null,
      generatedAt: new Date().toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
      }),
      qrDataUri,
      watermark: buildWatermark(institution.name),
      // ── Données propres au modèle « page d'impression » ──
      theme: bulletinTheme(branding, primaryColor, secondaryColor),
      termLabel: report.termName || `Trimestre ${report.termNumber}`,
      serial: securityCode ?? fallbackSerial(report),
      classTeacherName: data.classTeacherName ?? '',
      classTeacherSignature: data.classTeacherSignature ?? null,
      // Cachet numérique : seulement si l'école l'a choisi, et seulement sur un bulletin publié
      // (jamais sur un brouillon). Sinon, case vide à tamponner à la main.
      digitalStamp: digitalStampFor(branding, inst.stamp, report.status) ? pdfImage(inst.stamp) : null,
      // Rappel des périodes précédentes (2e et 3e trimestres) ; au dernier : moyenne annuelle + décision
      recap: data.termRecap && (data.termRecap.previous.length || data.termRecap.isLastTerm)
        ? {
          previous: data.termRecap.previous.map((p) => ({
            label: p.label,
            value: p.average != null ? fmtScaled(p.average) : '—',
            failing: p.average != null && p.average < data.termRecap!.promotionThreshold,
          })),
          isLastTerm: data.termRecap.isLastTerm,
          annualFailing: data.termRecap.annualAverage != null && data.termRecap.annualAverage < data.termRecap.promotionThreshold,
          decision: data.termRecap.councilDecision ?? '—',
        }
        : null,
      verifyUrl: this.verifyUrl,
      // Moyenne générale en toutes lettres (sur l'échelle du bulletin : /10 au primaire, /20 sinon)
      // En lettres à partir du chiffre imprimé (même arrondi) : 5,83 → « Cinq virgule quatre-vingt-trois »
      averageWords: displayAverage != null ? scoreToFrench(Number(fmtScaled(displayAverage).replace(',', '.'))) : '',
      averageDenomWords: isPrimary ? 'dix' : 'vingt',
      // Primaire : date de la rentrée suivante, pour que les parents se préparent
      nextTerm: isPrimary
        ? nextTermStart((institution as any).academicSettings, report.academicYear, report.termType, report.termNumber)
        : null,
      averageFailing: displayAverage != null && displayAverage < 10,
      annualFailing: report.annualAverage != null && report.annualAverage < 10,
      totalPointsLabel: formatScore(Math.round(totalPoints * 100) / 100),
      lateLabel: lateHours != null ? `${lateHours} h`
        : report.attendanceLate != null ? String(report.attendanceLate) : '—',
    };

    return this.loadTemplate()(ctx);
  }
}

export interface ReportCardData {
  report: {
    id: string;
    termName: string;
    academicYear: string;
    termNumber: number;
    termType?: string | null;
    /** DRAFT | REVIEW | PUBLISHED — le cachet numérique n'est imprimé que sur un bulletin publié */
    status?: string | null;
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
    dateOfBirth: Date | null;
    sex?: string | null;
    user: { name: string; profileImage?: string | null } | null;
  };
  className: string;
  /** Titulaire de la classe (professeur principal / maître) — nom sous sa signature. */
  classTeacherName?: string | null;
  /** Signature du titulaire — la même image que sur ses fiches de notes. */
  classTeacherSignature?: string | null;
  /** Moyennes des périodes précédentes ; au dernier trimestre, moyenne annuelle et décision du conseil. */
  termRecap?: {
    previous: { termNumber: number; label: string; average: number | null }[];
    isLastTerm: boolean;
    annualAverage: number | null;
    councilDecision: string | null;
    promotionThreshold: number;
  } | null;
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
    subject: { nameFr: string; passMark: number; maxScore?: number | null; category?: string | null };
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
    academicSettings?: unknown;
  };
}

/** Données d'un relevé de notes (examen blanc ou devoir surveillé) pour un élève. */
export interface ReleveData {
  /** Signatures des enseignants (titulaire puis professeurs de matière) — cadre « Le Maître » */
  teacherSignatures?: Array<{ name: string; image: string; classTeacher?: boolean; fromSession?: boolean }>;
  /** Code de vérification du relevé (imprimé et encodé dans le QR code) */
  verifyCode?: string;
  institution: {
    name: string; country?: string | null; countryMotto?: string | null; address?: string | null;
    phone?: string | null; email?: string | null; website?: string | null; motto?: string | null;
    logo?: string | null; crest?: string | null; stamp?: string | null; brandingSettings?: unknown;
  };
  exam: {
    label: string; examType: string; typeLabel: string; className: string; academicYear: string;
    /** Barème des notes : 20 (par défaut) ou 10 (compositions mensuelles du primaire). */
    scale?: number;
    examDate?: Date | string | null; examEndDate?: Date | string | null;
  };
  student: {
    name: string; admissionNumber: string; sex?: string | null;
    dateOfBirth?: Date | string | null; photo?: string | null;
  };
  /** max : barème de la matière (/10 ou /20 aux compositions mensuelles ; sinon celui de la session) */
  rows: Array<{ subject: string; score: number | null; coefficient: number; max?: number; appreciation: string }>;
  average: number | null;
  appreciation: string;
  rank: number | null;
  classSize: number | null;
}
