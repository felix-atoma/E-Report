import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { gradesService } from '../../../services/gradesService';
import { institutionsService } from '../../../services/institutionsService';
import { classesService } from '../../../services/classesService';
import PrintFormatPicker from '../../../components/common/PrintFormatPicker/PrintFormatPicker';
import './FicheDeNotesPrintPage.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

function isBlank(v) {
  return v === null || v === undefined || String(v).trim() === '';
}

function fmt(v) {
  if (isBlank(v)) return '—';
  return Number(v).toFixed(2).replace('.', ',');
}

function computeMoyInterros(row) {
  const vals = [row.noteInterro1, row.noteInterro2, row.noteInterro3, row.noteInterro4]
    .filter((v) => !isBlank(v)).map(Number);
  return vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;
}

function computeMoy(row) {
  const moyI = computeMoyInterros(row);
  let ws = 0, wt = 0;
  if (moyI !== null)              { ws += moyI * 1;                          wt += 1; }
  if (!isBlank(row.noteDevoir))   { ws += Number(row.noteDevoir) * 2;        wt += 2; }
  if (!isBlank(row.noteComposition)) { ws += Number(row.noteComposition) * 3; wt += 3; }
  if (wt === 0) return null;
  return Math.round((ws / wt) * 100) / 100;
}

function computeRanks(rows) {
  const ranked = rows
    .map((r, i) => ({ i, moy: r.moyenneMatiere }))
    .filter((r) => r.moy !== null)
    .sort((a, b) => b.moy - a.moy);
  const out = new Array(rows.length).fill(null);
  let rank = 1;
  for (let k = 0; k < ranked.length; k++) {
    if (k > 0 && ranked[k].moy !== ranked[k - 1].moy) rank = k + 1;
    out[ranked[k].i] = rank;
  }
  return out;
}

const APPR_LABELS = {
  fr: ['Très Bien', 'Bien', 'Assez Bien', 'Passable', 'Insuffisant'],
  en: ['Very Good', 'Good', 'Fairly Good', 'Satisfactory', 'Insufficient'],
};
function apprLabel(moy, subjectName) {
  if (moy === null) return '';
  const lang = (subjectName ?? '').toLowerCase().includes('anglais') || (subjectName ?? '').toLowerCase().includes('english') ? 'en' : 'fr';
  const [vg, g, fg, p, f] = APPR_LABELS[lang];
  if (moy >= 16) return vg;
  if (moy >= 14) return g;
  if (moy >= 12) return fg;
  if (moy >= 10) return p;
  return f;
}
function apprCls(moy) {
  if (moy === null) return '';
  if (moy >= 14) return 'fdnp__appr--good';
  if (moy >= 10) return 'fdnp__appr--pass';
  return 'fdnp__appr--fail';
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function ScoreCell({ v }) {
  if (isBlank(v)) return <span className="fdnp__score fdnp__score--empty">—</span>;
  const n = Number(v);
  const cls = n >= 14 ? 'fdnp__score--high' : n >= 10 ? 'fdnp__score--mid' : 'fdnp__score--low';
  return <span className={`fdnp__score ${cls}`}>{n.toFixed(2).replace('.', ',')}</span>;
}

// ── localStorage snapshot reader ─────────────────────────────────────────────

function readSnapshot(classId, subjectId, academicYear, termNumber) {
  try {
    const raw = localStorage.getItem(`fdnp:${classId}:${subjectId}:${academicYear}:${termNumber}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Accept snapshots up to 48 hours old
    if (Date.now() - parsed.ts > 48 * 3600 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ── Print page component ──────────────────────────────────────────────────────

export default function FicheDeNotesPrintPage() {
  const { classId, subjectId } = useParams();
  const [params] = useSearchParams();

  const academicYear = params.get('academicYear') ?? '';
  const termNumber   = parseInt(params.get('termNumber') ?? '1', 10);
  const termName     = params.get('termName') ?? `${termNumber}er Trimestre`;

  // Try localStorage snapshot first — populated by GradeEntryPage when print is clicked.
  // This works even when completely offline (no network, no service-worker API cache).
  const snapshot = readSnapshot(classId, subjectId, academicYear, termNumber);

  const { data: ficheData, isLoading: ficheLoading, isError: ficheError } = useQuery({
    queryKey: ['fiche-print', classId, subjectId, academicYear, termNumber],
    queryFn: () => gradesService.getForClassSubject(classId, subjectId, academicYear, termNumber).then((r) => r.data),
    // Skip API call when we already have a fresh snapshot
    enabled: !snapshot && !!classId && !!subjectId && !!academicYear && !isNaN(termNumber),
  });

  const { data: institution } = useQuery({
    queryKey: ['institution-me'],
    queryFn: () => institutionsService.me().then((r) => r.data),
    // Still try even with snapshot — institution data is cached by service worker on login
    staleTime: 24 * 3600 * 1000,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
    enabled: !snapshot,
  });

  // Resolve data source: snapshot wins over API
  const source     = snapshot ?? ficheData;
  const fromCache  = !!snapshot;

  if (!source && ficheLoading) return <div className="fdnp__loading">Chargement de la fiche…</div>;
  if (!source && (ficheError || !ficheData)) return <div className="fdnp__error">Impossible de charger la fiche. Ouvrez la fiche en ligne avant de l'imprimer hors-ligne.</div>;

  const cls        = snapshot ? null : classes.find((c) => c.id === classId);
  const className  = cls?.name ?? params.get('className') ?? '—';
  const subject    = source.subject;
  const teacher    = source.teacher;
  const fiche      = source.fiche;
  const coef       = snapshot?.coef ?? source.students?.find((s) => s.coefficient)?.coefficient ?? 1;
  const rows       = (source.students ?? []).map((s) => ({
    ...s,
    moyenneMatiere: s.moyenneMatiere ?? computeMoy(s),
  }));
  const ranks      = computeRanks(rows);

  const rowsWithMoy = rows.filter((r) => r.moyenneMatiere !== null);
  const moyClasse   = rowsWithMoy.length > 0
    ? Math.round((rowsWithMoy.reduce((s, r) => s + r.moyenneMatiere, 0) / rowsWithMoy.length) * 100) / 100
    : null;
  const highest   = rowsWithMoy.length > 0 ? Math.max(...rowsWithMoy.map((r) => r.moyenneMatiere)) : null;
  const lowest    = rowsWithMoy.length > 0 ? Math.min(...rowsWithMoy.map((r) => r.moyenneMatiere)) : null;
  const passing   = rowsWithMoy.filter((r) => r.moyenneMatiere >= 10).length;
  const passRate  = rowsWithMoy.length > 0 ? Math.round((passing / rowsWithMoy.length) * 100) : null;

  const hasAnyGrade = rowsWithMoy.length > 0;

  return (
    <div className="fdnp__page">
      {/* ── Toolbar (hidden on print) ── */}
      <div className="fdnp__toolbar no-print">
        <PrintFormatPicker defaultFormat="A4 paysage" />
        <button className="fdnp__btn fdnp__btn--print" onClick={() => window.print()}>
          🖨 Imprimer / PDF
        </button>
        <button className="fdnp__btn fdnp__btn--close" onClick={() => window.close()}>
          ✕ Fermer
        </button>
        {fromCache && (
          <span className="fdnp__offline-badge">
            📶 Données hors-ligne
          </span>
        )}
      </div>

      <div className="fdnp__sheet">

        {/* ── School header ── */}
        <div className="fdnp__doc-header">
          <div className="fdnp__school-side">
            {institution?.logo && (
              <img src={institution.logo} alt="" className="fdnp__logo" />
            )}
            <div className="fdnp__school-info">
              {institution?.circonscription && (
                <div className="fdnp__circ">{institution.circonscription}</div>
              )}
              <div className="fdnp__school-name">{institution?.name ?? '—'}</div>
              {institution?.address && (
                <div className="fdnp__school-addr">{institution.address}</div>
              )}
            </div>
          </div>

          <div className="fdnp__title-side">
            <div className="fdnp__doc-badge">FICHE DE NOTES</div>
            <div className="fdnp__doc-meta">
              <span>Classe&nbsp;: <strong>{className}</strong></span>
              <span>Matière&nbsp;: <strong>{subject?.nameFr}</strong></span>
              {subject?.code && <span>Code&nbsp;: <strong>{subject.code}</strong></span>}
              <span>Trimestre&nbsp;: <strong>{termName}</strong></span>
              <span>Année&nbsp;: <strong>{academicYear}</strong></span>
            </div>
            {teacher?.name && (
              <div className="fdnp__teacher-tag">Professeur&nbsp;: <strong>{teacher.name}</strong></div>
            )}
          </div>
        </div>

        <hr className="fdnp__rule" />

        {/* ── Status bar ── */}
        <div className="fdnp__status-bar">
          <span className="fdnp__coef-badge">Coefficient&nbsp;: <strong>{coef}</strong></span>
          {fiche?.isSigned ? (
            <span className="fdnp__signed-badge">
              ✅ Fiche signée — {fiche.signedByName} · {fmtDate(fiche.signedAt)}
            </span>
          ) : (
            <span className="fdnp__unsigned-badge">En attente de signature</span>
          )}
          {!hasAnyGrade && (
            <span className="fdnp__blank-notice">Fiche vierge — à remplir manuellement</span>
          )}
        </div>

        {/* ── Grade table ── */}
        <div className="fdnp__table-wrap">
          <table className="fdnp__table">
            <thead>
              <tr>
                <th className="fdnp__th fdnp__th--n" rowSpan={2}>N°</th>
                <th className="fdnp__th fdnp__th--name" rowSpan={2}>Nom et Prénoms</th>
                <th className="fdnp__th fdnp__th--mat" rowSpan={2}>Matricule</th>
                <th className="fdnp__th fdnp__th--group" colSpan={5}>Interrogations</th>
                <th className="fdnp__th fdnp__th--note" rowSpan={2}>Devoir<br /><span className="fdnp__th-sub">/20</span></th>
                <th className="fdnp__th fdnp__th--note" rowSpan={2}>Examen<br /><span className="fdnp__th-sub">/20</span></th>
                <th className="fdnp__th fdnp__th--moy" rowSpan={2}>Moy.<br /><span className="fdnp__th-sub">/20</span></th>
                <th className="fdnp__th fdnp__th--total" rowSpan={2}>Total<br /><span className="fdnp__th-sub">×{coef}</span></th>
                <th className="fdnp__th fdnp__th--rang" rowSpan={2}>Rang</th>
                <th className="fdnp__th fdnp__th--appr" rowSpan={2}>Appréciation</th>
              </tr>
              <tr>
                <th className="fdnp__th fdnp__th--note">Int.1<br /><span className="fdnp__th-sub">/20</span></th>
                <th className="fdnp__th fdnp__th--note">Int.2<br /><span className="fdnp__th-sub">/20</span></th>
                <th className="fdnp__th fdnp__th--note">Int.3<br /><span className="fdnp__th-sub">/20</span></th>
                <th className="fdnp__th fdnp__th--note">Int.4<br /><span className="fdnp__th-sub">/20</span></th>
                <th className="fdnp__th fdnp__th--moyi">Moy.<br /><span className="fdnp__th-sub">Int.</span></th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={15} className="fdnp__empty">Aucun élève inscrit.</td>
                </tr>
              )}
              {rows.map((row, idx) => {
                const moyI = computeMoyInterros(row);
                const moy  = row.moyenneMatiere;
                const rank = ranks[idx];
                return (
                  <tr key={row.studentId} className={idx % 2 === 0 ? 'fdnp__tr' : 'fdnp__tr fdnp__tr--alt'}>
                    <td className="fdnp__td fdnp__td--n">{idx + 1}</td>
                    <td className="fdnp__td fdnp__td--name">
                      <div className="fdnp__student-name">{row.studentName}</div>
                    </td>
                    <td className="fdnp__td fdnp__td--mat">{row.admissionNumber}</td>
                    <td className="fdnp__td fdnp__td--note"><ScoreCell v={row.noteInterro1} /></td>
                    <td className="fdnp__td fdnp__td--note"><ScoreCell v={row.noteInterro2} /></td>
                    <td className="fdnp__td fdnp__td--note"><ScoreCell v={row.noteInterro3} /></td>
                    <td className="fdnp__td fdnp__td--note"><ScoreCell v={row.noteInterro4} /></td>
                    <td className="fdnp__td fdnp__td--moyi">{isBlank(moyI) ? '—' : fmt(moyI)}</td>
                    <td className="fdnp__td fdnp__td--devoir"><ScoreCell v={row.noteDevoir} /></td>
                    <td className="fdnp__td fdnp__td--compo"><ScoreCell v={row.noteComposition} /></td>
                    <td className={`fdnp__td fdnp__td--moy${moy !== null && moy < 10 ? ' fdnp__td--fail' : ''}`}>
                      {isBlank(moy) ? <span className="fdnp__blank-cell" /> : fmt(moy)}
                    </td>
                    <td className="fdnp__td fdnp__td--total">
                      {moy !== null ? fmt(moy * coef) : <span className="fdnp__blank-cell" />}
                    </td>
                    <td className="fdnp__td fdnp__td--rang">
                      {rank !== null ? `${rank}e` : <span className="fdnp__blank-cell" />}
                    </td>
                    <td className={`fdnp__td fdnp__td--appr ${apprCls(moy)}`}>
                      {moy !== null ? apprLabel(moy, subject?.nameFr) : <span className="fdnp__blank-cell" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* ── Totaux row ── */}
            {rows.length > 0 && (
              <tfoot>
                <tr className="fdnp__totals">
                  <td className="fdnp__td fdnp__totals-label" colSpan={10}>Totaux / Moyennes</td>
                  <td className="fdnp__td fdnp__totals-val">{fmt(moyClasse)}</td>
                  <td className="fdnp__td fdnp__totals-val">
                    {moyClasse !== null ? fmt(moyClasse * coef) : '—'}
                  </td>
                  <td className="fdnp__td" colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ── Stats band ── */}
        {hasAnyGrade && (
          <div className="fdnp__stats-band">
            <div className="fdnp__stat fdnp__stat--neutral">
              <span className="fdnp__stat__label">Effectif noté</span>
              <span className="fdnp__stat__val">{rowsWithMoy.length}<small>/{rows.length}</small></span>
            </div>
            <div className="fdnp__stat fdnp__stat--blue">
              <span className="fdnp__stat__label">Moy. classe</span>
              <span className="fdnp__stat__val">{fmt(moyClasse)}<small>/20</small></span>
            </div>
            <div className="fdnp__stat fdnp__stat--green">
              <span className="fdnp__stat__label">Maximum</span>
              <span className="fdnp__stat__val">{fmt(highest)}</span>
            </div>
            <div className="fdnp__stat fdnp__stat--red">
              <span className="fdnp__stat__label">Minimum</span>
              <span className="fdnp__stat__val">{fmt(lowest)}</span>
            </div>
            <div className="fdnp__stat fdnp__stat--green">
              <span className="fdnp__stat__label">Admis ≥10</span>
              <span className="fdnp__stat__val">{passing}<small>/{rowsWithMoy.length}</small></span>
            </div>
            <div className="fdnp__stat fdnp__stat--teal">
              <span className="fdnp__stat__label">Taux réussite</span>
              <span className="fdnp__stat__val">{passRate != null ? `${passRate}%` : '—'}</span>
            </div>
          </div>
        )}

        {/* ── Signature zone ── */}
        <div className="fdnp__sigs">
          <div className="fdnp__sig">
            <div className="fdnp__sig__label">Signature du Professeur</div>
            {fiche?.isSigned && fiche.signatureData ? (
              <img src={fiche.signatureData} alt="Signature" className="fdnp__sig__img" />
            ) : fiche?.isSigned ? (
              <div className="fdnp__sig__stamp">
                <div className="fdnp__sig__stamp-name">{fiche.signedByName ?? teacher?.name ?? '—'}</div>
                <div className="fdnp__sig__stamp-date">Signé le {fmtDate(fiche.signedAt)}</div>
              </div>
            ) : (
              <div className="fdnp__sig__line" />
            )}
            <div className="fdnp__sig__name">{teacher?.name ?? 'Nom du professeur'}</div>
          </div>

          <div className="fdnp__sig">
            <div className="fdnp__sig__label">Visa du Directeur / de la Directrice</div>
            <div className="fdnp__sig__line" />
            <div className="fdnp__sig__name">Signature et cachet</div>
          </div>
        </div>

        {/* ── Formula footnote ── */}
        <div className="fdnp__footnote">
          Formule&nbsp;: Moy = (moy.interros × 1 + devoir × 2 + examen × 3) ÷ 6 &nbsp;|&nbsp;
          TB ≥ 16 &nbsp;·&nbsp; B ≥ 14 &nbsp;·&nbsp; AB ≥ 12 &nbsp;·&nbsp; P ≥ 10 &nbsp;·&nbsp; Insuf. &lt; 10
          &nbsp;|&nbsp; Imprimé le {new Date().toLocaleDateString('fr-FR')}
        </div>

      </div>
    </div>
  );
}
