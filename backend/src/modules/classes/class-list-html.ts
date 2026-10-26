/**
 * Liste de classe (A4) en HTML, pour le PDF téléchargé par les enseignants — même présentation que la
 * page « Liste de classe » à imprimer.
 */
const esc = (v: unknown) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtDate = (d?: Date | string | null) => (d ? new Date(d).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '');

export interface ClassListData {
  institution: { name: string; address?: string | null; logo?: string | null; crest?: string | null };
  className: string;
  academicYear: string;
  teacherName?: string | null;
  students: Array<{ name: string; admissionNumber?: string | null; sex?: string | null; dateOfBirth?: Date | string | null }>;
  extra: number;          // colonnes vides
  extraTitle?: string;    // titre au-dessus des colonnes vides
}

export function classListHtml(d: ClassListData): string {
  const boys = d.students.filter((s) => s.sex === 'M').length;
  const girls = d.students.filter((s) => s.sex === 'F').length;
  const blanks = (tag: 'th' | 'td') => Array.from({ length: d.extra }, () => `<${tag} class="blank"></${tag}>`).join('');
  const logo = d.institution.logo || d.institution.crest;
  const rows = d.students.map((s, i) => `<tr>
      <td class="num">${i + 1}</td><td class="name">${esc(s.name)}</td><td>${esc(s.admissionNumber)}</td>
      <td class="sex">${esc(s.sex)}</td><td>${fmtDate(s.dateOfBirth)}</td>${blanks('td')}</tr>`).join('');
  const printed = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Liste de classe</title><style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: 700; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .head { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #002347; padding-bottom: 6px; }
  .head img { width: 56px; height: 56px; object-fit: contain; }
  .school { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #002347; }
  .line { font-size: 12px; font-weight: 600; }
  h1 { text-align: center; font-size: 22px; font-weight: 900; letter-spacing: 2px; margin: 10px 0 8px; color: #002347; }
  .meta { display: flex; justify-content: space-between; gap: 12px; margin: 3px 0; font-size: 14px; }
  .meta b { font-weight: 900; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th, td { border: 1.3px solid #000; padding: 4px 6px; text-align: center; }
  th { background: #e8eef6; font-weight: 900; font-size: 12px; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  .num { width: 34px; } .name { text-align: left; font-weight: 900; } .sex { width: 44px; } .blank { min-width: 36px; }
  .group { text-transform: uppercase; letter-spacing: .5px; }
  .ghost { background: transparent; border-top-color: transparent; border-left-color: transparent; }
  .foot { display: flex; justify-content: space-between; margin-top: 14px; font-size: 12px; font-weight: 600; }
  .empty { padding: 18px; font-style: italic; font-weight: 600; }
  </style></head><body>
  <div class="head">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div>
    <div class="school">${esc(d.institution.name)}</div>${d.institution.address ? `<div class="line">${esc(d.institution.address)}</div>` : ''}
  </div></div>
  <h1>LISTE DE CLASSE</h1>
  <div class="meta"><span><b>Classe :</b> ${esc(d.className)}</span><span><b>Année scolaire :</b> ${esc(d.academicYear)}</span><span><b>Titulaire :</b> ${esc(d.teacherName ?? '……………………')}</span></div>
  <div class="meta"><span><b>Effectif :</b> ${d.students.length}</span><span><b>Garçons :</b> ${boys}</span><span><b>Filles :</b> ${girls}</span></div>
  <table><thead>
    ${d.extra > 0 && d.extraTitle ? `<tr><th colspan="5" class="ghost"></th><th colspan="${d.extra}" class="group">${esc(d.extraTitle)}</th></tr>` : ''}
    <tr><th class="num">N°</th><th class="name">Nom et prénoms</th><th>Matricule</th><th class="sex">Sexe</th><th>Date de naissance</th>${blanks('th')}</tr>
  </thead><tbody>${rows || `<tr><td colspan="${5 + d.extra}" class="empty">Aucun élève inscrit dans cette classe pour ${esc(d.academicYear)}.</td></tr>`}</tbody></table>
  <div class="foot"><span>Imprimé le ${printed}</span><span>Signature : ……………………………</span></div>
  </body></html>`;
}
