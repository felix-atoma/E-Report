import {
  BorderStyle, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';
import { HTMLElement, Node, NodeType } from 'node-html-parser';
import { parseHtml } from './exam-paper-html';

/**
 * Document Word d'une épreuve : en-tête en tableau à double bordure (modèle fourni par l'école)
 *
 *   | Établissement | Intitulé (ex. Devoir du deuxième trimestre) | Année Scolaire : … | Classe : … |
 *   | Adresse       | Épreuve de <matière>                         | Heures : …         | Coeff : …  |
 *
 * puis le corps du sujet (HTML simple converti en paragraphes, listes et tableaux Word).
 */
export interface ExamPaperDocxData {
  schoolName: string;
  schoolAddress: string;
  title: string;
  subjectName: string;
  academicYear: string;
  className: string;
  duration: string;
  coefficient: string;
  content: string;
}

const FONT = 'Times New Roman';
const SIZE = 24;                 // demi-points : 12 pt

type RunStyle = { bold?: boolean; italics?: boolean; underline?: boolean; superScript?: boolean; subScript?: boolean };

/** Texte en ligne (gras, italique, exposants…) → TextRun[] ; <br> = saut de ligne */
function inlineRuns(nodes: Node[], style: RunStyle = {}, size = SIZE): TextRun[] {
  const runs: TextRun[] = [];
  for (const node of nodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const text = node.text.replace(/\s+/g, ' ');
      if (text) runs.push(new TextRun({ text, font: FONT, size, ...style, underline: style.underline ? {} : undefined }));
      continue;
    }
    if (node.nodeType !== NodeType.ELEMENT_NODE) continue;
    const el = node as HTMLElement;
    const tag = el.rawTagName.toLowerCase();
    if (tag === 'br') { runs.push(new TextRun({ break: 1, font: FONT, size })); continue; }
    const next: RunStyle = { ...style };
    if (tag === 'strong' || tag === 'b') next.bold = true;
    if (tag === 'em' || tag === 'i') next.italics = true;
    if (tag === 'u') next.underline = true;
    if (tag === 'sup') next.superScript = true;
    if (tag === 'sub') next.subScript = true;
    runs.push(...inlineRuns(el.childNodes, next, size));
  }
  return runs;
}

const cellBorders = (style: (typeof BorderStyle)[keyof typeof BorderStyle], size: number) => ({
  top: { style, size, color: '000000' },
  bottom: { style, size, color: '000000' },
  left: { style, size, color: '000000' },
  right: { style, size, color: '000000' },
});

/** <table> du sujet → tableau Word à bordures simples */
function convertTable(table: HTMLElement): Table {
  const isCell = (c: Node) => c.nodeType === NodeType.ELEMENT_NODE && ['td', 'th'].includes((c as HTMLElement).rawTagName.toLowerCase());
  const rows = table.querySelectorAll('tr').filter((tr) => tr.childNodes.some(isCell)).map((tr) =>
    new TableRow({
      children: tr.childNodes
        .filter(isCell)
        .map((c) => {
          const cell = c as HTMLElement;
          const isHead = cell.rawTagName.toLowerCase() === 'th';
          return new TableCell({
            columnSpan: Number(cell.getAttribute('colspan')) || undefined,
            rowSpan: Number(cell.getAttribute('rowspan')) || undefined,
            borders: cellBorders(BorderStyle.SINGLE, 4),
            children: [new Paragraph({ children: inlineRuns(cell.childNodes, isHead ? { bold: true } : {}) })],
          });
        }),
    }),
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

/** Corps HTML → blocs Word (titres, paragraphes, listes numérotées ou à puces, tableaux) */
function convertBlocks(nodes: Node[]): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  let loose: Node[] = [];                       // texte hors paragraphe : regroupé en un paragraphe
  const flush = () => {
    const runs = inlineRuns(loose);
    if (runs.length) out.push(new Paragraph({ children: runs, spacing: { after: 120 } }));
    loose = [];
  };
  for (const node of nodes) {
    // Retours à la ligne entre deux blocs : ignorés (sinon paragraphes vides)
    if (node.nodeType === NodeType.TEXT_NODE && !node.text.trim() && !loose.length) continue;
    if (node.nodeType !== NodeType.ELEMENT_NODE) { loose.push(node); continue; }
    const el = node as HTMLElement;
    const tag = el.rawTagName.toLowerCase();
    if (['strong', 'b', 'em', 'i', 'u', 'sup', 'sub', 'br'].includes(tag)) { loose.push(node); continue; }
    flush();
    if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
      out.push(new Paragraph({
        children: inlineRuns(el.childNodes, { bold: true, underline: tag === 'h2' }, tag === 'h2' ? 26 : SIZE),
        spacing: { before: 240, after: 120 },
        keepNext: true,
      }));
    } else if (tag === 'p') {
      out.push(new Paragraph({ children: inlineRuns(el.childNodes), spacing: { after: 120 } }));
    } else if (tag === 'ol' || tag === 'ul') {
      el.childNodes
        .filter((c) => c.nodeType === NodeType.ELEMENT_NODE && (c as HTMLElement).rawTagName.toLowerCase() === 'li')
        .forEach((li, i) => {
          const marker = tag === 'ol' ? `${i + 1}. ` : '• ';
          out.push(new Paragraph({
            children: [new TextRun({ text: marker, font: FONT, size: SIZE }), ...inlineRuns((li as HTMLElement).childNodes)],
            indent: { left: 567, hanging: 340 },
            spacing: { after: 80 },
          }));
        });
    } else if (tag === 'table') {
      out.push(convertTable(el));
      out.push(new Paragraph({ children: [] }));
    } else {
      out.push(...convertBlocks(el.childNodes));
    }
  }
  flush();
  return out;
}

/** En-tête : tableau 2 × 4 à double bordure, comme le modèle de l'école */
function headerTable(d: ExamPaperDocxData): Table {
  const cell = (text: string, width: number) => new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: cellBorders(BorderStyle.DOUBLE, 6),
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: SIZE })] })],
  });
  const widths = [28, 34, 21, 17];
  const row1 = [d.schoolName, d.title, `Année Scolaire : ${d.academicYear}`, `Classe : ${d.className}`];
  const row2 = [d.schoolAddress, d.subjectName ? `Épreuve de ${d.subjectName}` : 'Épreuve', `Heures : ${d.duration}`, `Coeff : ${d.coefficient}`];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: row1.map((t, i) => cell(t, widths[i])) }),
      new TableRow({ children: row2.map((t, i) => cell(t, widths[i])) }),
    ],
  });
}

export async function buildExamPaperDocx(d: ExamPaperDocxData): Promise<Buffer> {
  const body = convertBlocks(parseHtml(d.content || '').childNodes);
  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    sections: [{
      properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
      children: [
        headerTable(d),
        new Paragraph({ children: [], spacing: { after: 200 } }),
        ...(body.length ? body : [new Paragraph({ children: [new TextRun({ text: '', font: FONT })] })]),
      ],
    }],
  });
  return Packer.toBuffer(doc);
}

