import { useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Loading from '../../../components/common/Loading/Loading';
import Modal from '../../../components/common/Modal/Modal';
import SignaturePad from '../../../components/common/SignaturePad/SignaturePad';
import { gradesService } from '../../../services/gradesService';
import './GradeEntryPage.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

function isBlank(v) {
  return v === null || v === undefined || String(v).trim() === '';
}

function computeMoyInterros(row) {
  const vals = [row.noteInterro1, row.noteInterro2, row.noteInterro3, row.noteInterro4]
    .filter((v) => !isBlank(v))
    .map(Number);
  return vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;
}

// Togolese formula: (moy_interros×1 + devoir×2 + compo×3) / (1+2+3)
function computeMoy(row) {
  const moyI = computeMoyInterros(row);
  let ws = 0, wt = 0;
  if (moyI !== null)                   { ws += moyI * 1;           wt += 1; }
  if (!isBlank(row.noteDevoir))        { ws += Number(row.noteDevoir) * 2;      wt += 2; }
  if (!isBlank(row.noteComposition))   { ws += Number(row.noteComposition) * 3; wt += 3; }
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

function appreciation(moy) {
  if (moy === null) return '';
  if (moy >= 16) return 'Très Bien';
  if (moy >= 14) return 'Bien';
  if (moy >= 12) return 'Assez Bien';
  if (moy >= 10) return 'Passable';
  return 'Insuffisant';
}

function apprCls(moy) {
  if (moy === null) return '';
  if (moy >= 14) return 'appr--good';
  if (moy >= 10) return 'appr--pass';
  return 'appr--fail';
}

function fmt(v, dec = 2) {
  return v !== null && v !== undefined ? Number(v).toFixed(dec) : '—';
}

function NoteInput({ value, onChange, disabled }) {
  return (
    <input
      type="number"
      className={`fdn__note-input${disabled ? ' fdn__note-input--locked' : ''}`}
      min={0} max={20} step={0.25}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
      placeholder="—"
      disabled={disabled}
      readOnly={disabled}
    />
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GradeEntryPage() {
  const { classId, subjectId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const academicYear = params.get('academicYear') ?? '';
  const termNumber   = parseInt(params.get('termNumber') ?? '1', 10);
  const termName     = params.get('termName') ?? `${termNumber}er Trimestre`;

  const [rows, setRows] = useState(null);
  const [coef, setCoef] = useState(1);
  const [saved, setSaved] = useState(false);
  const [signModal, setSignModal] = useState(false);
  const [sigData, setSigData] = useState(null);

  const ficheKey = ['fiche', classId, subjectId, academicYear, termNumber];

  const { data, isLoading, error } = useQuery({
    queryKey: ficheKey,
    queryFn: () =>
      gradesService.getForClassSubject(classId, subjectId, academicYear, termNumber).then((r) => r.data),
    enabled: !!classId && !!subjectId && !!academicYear && !isNaN(termNumber),
  });

  // Previous term — used to compute progression/regression
  const prevTerm = termNumber > 1 ? termNumber - 1 : null;
  const { data: prevData } = useQuery({
    queryKey: ['fiche', classId, subjectId, academicYear, prevTerm],
    queryFn: () =>
      gradesService.getForClassSubject(classId, subjectId, academicYear, prevTerm).then((r) => r.data),
    enabled: !!classId && !!subjectId && !!academicYear && prevTerm !== null,
  });

  // Initialise rows from server data (only once)
  if (data && rows === null) {
    setRows(data.students.map((s) => ({ ...s })));
    const firstCoef = data.students.find((s) => s.coefficient)?.coefficient;
    if (firstCoef) setCoef(firstCoef);
  }

  const isSigned = data?.fiche?.isSigned ?? false;

  const mutation = useMutation({
    mutationFn: (payload) => gradesService.saveForClassSubject(classId, subjectId, payload),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ficheKey });
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur lors de l\'enregistrement'),
  });

  const signMutation = useMutation({
    mutationFn: (signatureData) =>
      gradesService.signFiche(classId, subjectId, academicYear, termNumber, signatureData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ficheKey });
      setSignModal(false);
      setSigData(null);
      toast.success('Fiche signée et verrouillée.');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de signature'),
  });

  const unsignMutation = useMutation({
    mutationFn: () => gradesService.unsignFiche(classId, subjectId, academicYear, termNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ficheKey });
      toast.success('Signature annulée — fiche déverrouillée.');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const updateRow = useCallback((idx, field, value) => {
    setRows((prev) => {
      const next = prev.map((r, i) => i === idx ? { ...r, [field]: value } : r);
      const moy = computeMoy(next[idx]);
      next[idx] = { ...next[idx], moyenneMatiere: moy };
      return next;
    });
  }, []);

  const handleSave = () => {
    if (!rows) return;
    mutation.mutate({
      academicYear,
      termName,
      termNumber,
      grades: rows.map((r) => ({
        studentId: r.studentId,
        noteInterro1: r.noteInterro1,
        noteInterro2: r.noteInterro2,
        noteInterro3: r.noteInterro3,
        noteInterro4: r.noteInterro4,
        noteDevoir: r.noteDevoir,
        noteComposition: r.noteComposition,
        coefficient: coef,
        teacherComment: r.teacherComment,
        teacherName: r.teacherName,
      })),
    });
  };

  if (isLoading) return <AppShell title="Fiche de notes"><Loading /></AppShell>;
  if (error) {
    const msg = error?.response?.data?.message ?? 'Impossible de charger la fiche.';
    return <AppShell title="Fiche de notes"><p className="fdn__error">{msg}</p></AppShell>;
  }

  const displayRows = rows ?? data?.students ?? [];
  const ranks = computeRanks(displayRows);

  // ── Bottom totals (matches bulletin Totaux row) ───────────────────────────
  const totalCoef    = displayRows.filter((r) => r.moyenneMatiere !== null).length * coef;
  const totalPoints  = displayRows.reduce((s, r) => s + (r.moyenneMatiere !== null ? r.moyenneMatiere * coef : 0), 0);
  const moyClasse    = displayRows.filter((r) => r.moyenneMatiere !== null).length > 0
    ? totalPoints / totalCoef : null;
  const rowsWithMoy  = displayRows.filter((r) => r.moyenneMatiere !== null);
  const classHighest = rowsWithMoy.length > 0 ? Math.max(...rowsWithMoy.map((r) => r.moyenneMatiere)) : null;
  const classLowest  = rowsWithMoy.length > 0 ? Math.min(...rowsWithMoy.map((r) => r.moyenneMatiere)) : null;

  // Named extremes
  const strongestRow = rowsWithMoy.length > 0
    ? rowsWithMoy.reduce((a, b) => b.moyenneMatiere > a.moyenneMatiere ? b : a)
    : null;
  const weakestRow = rowsWithMoy.length > 0
    ? rowsWithMoy.reduce((a, b) => b.moyenneMatiere < a.moyenneMatiere ? b : a)
    : null;

  // Progression vs previous term
  let mostImproved = null;
  let mostDeclined = null;
  if (prevData?.students && rowsWithMoy.length > 0) {
    const prevMap = new Map(prevData.students.map((s) => [s.studentId, s.moyenneMatiere]));
    const withDelta = rowsWithMoy
      .map((r) => {
        const prev = prevMap.get(r.studentId);
        return prev != null ? { ...r, delta: Math.round((r.moyenneMatiere - prev) * 100) / 100 } : null;
      })
      .filter(Boolean);
    const improved = withDelta.filter((r) => r.delta > 0);
    const declined = withDelta.filter((r) => r.delta < 0);
    if (improved.length > 0) mostImproved = improved.reduce((a, b) => b.delta > a.delta ? b : a);
    if (declined.length > 0) mostDeclined = declined.reduce((a, b) => b.delta < a.delta ? b : a);
  }

  return (
    <AppShell title={`Fiche de notes — ${data?.subject?.nameFr ?? ''}`}>
      <PageHeader
        title={`Fiche de notes — ${data?.subject?.nameFr ?? ''}`}
        subtitle={`${termName} · ${academicYear}`}
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <label className="fdn__coef-label">
              Coeff.
              <input
                type="number"
                className="fdn__coef-input"
                min={0.5} max={20} step={0.5}
                value={coef}
                onChange={(e) => setCoef(parseFloat(e.target.value))}
                disabled={isSigned}
              />
            </label>
            <button className="fdn__btn fdn__btn--secondary" onClick={() => navigate(-1)}>Retour</button>
            {!isSigned ? (
              <>
                <button
                  className="fdn__btn fdn__btn--primary"
                  onClick={handleSave}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  className="fdn__btn fdn__btn--sign"
                  onClick={() => { setSigData(null); setSignModal(true); }}
                  title="Signer et verrouiller la fiche"
                >
                  ✍ Signer la fiche
                </button>
              </>
            ) : (
              <button
                className="fdn__btn fdn__btn--unsign"
                onClick={() => unsignMutation.mutate()}
                disabled={unsignMutation.isPending}
                title="Annuler la signature pour pouvoir modifier"
              >
                🔓 Annuler la signature
              </button>
            )}
          </div>
        }
      />

      {saved && (
        <div className="fdn__toast">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Notes enregistrées avec succès.
        </div>
      )}

      {isSigned && (
        <div className="fdn__signature-banner">
          <span className="fdn__signature-banner__icon">✅</span>
          <div>
            <strong>Fiche signée et verrouillée</strong>
            <span> — Signée par <em>{data.fiche.signedByName}</em> le {new Date(data.fiche.signedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      )}

      <div className="fdn__table-wrap">
        <table className="fdn__table">
          <thead>
            <tr>
              {/* Group: Notes de classe */}
              <th className="fdn__th fdn__th--name" rowSpan={2}>Élève</th>
              <th className="fdn__th fdn__th--group" colSpan={5}>Notes de classe</th>
              <th className="fdn__th fdn__th--note fdn__th--devoir" rowSpan={2}>Devoir<span>/20</span></th>
              <th className="fdn__th fdn__th--note fdn__th--compo" rowSpan={2}>Examen<span>/20</span></th>
              <th className="fdn__th fdn__th--moy" rowSpan={2}>Moy.<span>/20</span></th>
              <th className="fdn__th fdn__th--coef" rowSpan={2}>Coef.</th>
              <th className="fdn__th fdn__th--total" rowSpan={2}>Total</th>
              <th className="fdn__th fdn__th--rang" rowSpan={2}>Rang</th>
              <th className="fdn__th fdn__th--appr" rowSpan={2}>Appréciation<span>du professeur</span></th>
              <th className="fdn__th fdn__th--teacher" rowSpan={2}>Nom du Prof.</th>
            </tr>
            <tr>
              <th className="fdn__th fdn__th--note">Int. 1<span>/20</span></th>
              <th className="fdn__th fdn__th--note">Int. 2<span>/20</span></th>
              <th className="fdn__th fdn__th--note">Int. 3<span>/20</span></th>
              <th className="fdn__th fdn__th--note">Int. 4<span>/20</span></th>
              <th className="fdn__th fdn__th--note fdn__th--moyinterro">Moy.<span>interros</span></th>
            </tr>
          </thead>

          <tbody>
            {displayRows.length === 0 && (
              <tr><td colSpan={14} className="fdn__empty">Aucun élève inscrit dans cette classe.</td></tr>
            )}
            {displayRows.map((row, idx) => {
              const moyI = computeMoyInterros(row);
              const moy  = row.moyenneMatiere;
              return (
                <tr key={row.studentId} className={idx % 2 === 0 ? 'fdn__tr' : 'fdn__tr fdn__tr--alt'}>
                  <td className="fdn__td fdn__td--name">
                    <div className="fdn__student-name">{row.studentName}</div>
                    <div className="fdn__student-id">{row.admissionNumber}</div>
                  </td>
                  <td className="fdn__td"><NoteInput value={row.noteInterro1} onChange={(v) => updateRow(idx, 'noteInterro1', v)} disabled={isSigned} /></td>
                  <td className="fdn__td"><NoteInput value={row.noteInterro2} onChange={(v) => updateRow(idx, 'noteInterro2', v)} disabled={isSigned} /></td>
                  <td className="fdn__td"><NoteInput value={row.noteInterro3} onChange={(v) => updateRow(idx, 'noteInterro3', v)} disabled={isSigned} /></td>
                  <td className="fdn__td"><NoteInput value={row.noteInterro4} onChange={(v) => updateRow(idx, 'noteInterro4', v)} disabled={isSigned} /></td>
                  <td className="fdn__td fdn__td--computed">{fmt(moyI)}</td>
                  <td className="fdn__td fdn__td--devoir"><NoteInput value={row.noteDevoir} onChange={(v) => updateRow(idx, 'noteDevoir', v)} disabled={isSigned} /></td>
                  <td className="fdn__td fdn__td--compo"><NoteInput value={row.noteComposition} onChange={(v) => updateRow(idx, 'noteComposition', v)} disabled={isSigned} /></td>
                  <td className={`fdn__td fdn__td--moy ${moy !== null && moy < 10 ? 'fdn__td--fail' : ''}`}>
                    {fmt(moy)}
                  </td>
                  <td className="fdn__td fdn__td--coef">{coef}</td>
                  <td className="fdn__td fdn__td--total">
                    {moy !== null ? fmt(moy * coef) : '—'}
                  </td>
                  <td className="fdn__td fdn__td--rang">
                    {ranks[idx] !== null ? `${ranks[idx]}e` : '—'}
                  </td>
                  <td className={`fdn__td fdn__td--appr ${apprCls(moy)}`}>
                    {appreciation(moy) || '—'}
                  </td>
                  <td className="fdn__td fdn__td--teacher">
                    <input
                      type="text"
                      className="fdn__teacher-input"
                      value={row.teacherName ?? ''}
                      onChange={(e) => updateRow(idx, 'teacherName', e.target.value)}
                      placeholder="Nom…"
                      disabled={isSigned}
                      readOnly={isSigned}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* ── Totaux row (matches bulletin bottom totals) ── */}
          <tfoot>
            <tr className="fdn__totals">
              <td className="fdn__td fdn__td--name fdn__totals-label" colSpan={8}>Totaux</td>
              <td className="fdn__td fdn__td--moy fdn__totals-val">{fmt(moyClasse)}</td>
              <td className="fdn__td fdn__td--coef fdn__totals-val">{coef}</td>
              <td className="fdn__td fdn__td--total fdn__totals-val">{fmt(totalPoints)}</td>
              <td className="fdn__td" colSpan={3}></td>
            </tr>
            <tr className="fdn__stats">
              <td colSpan={14} className="fdn__stats-row">
                <span><strong>Moy. la plus forte :</strong> {fmt(classHighest)} {strongestRow ? `— ${strongestRow.studentName}` : ''}</span>
                <span className="fdn__legend-sep">|</span>
                <span><strong>Moy. la plus faible :</strong> {fmt(classLowest)} {weakestRow ? `— ${weakestRow.studentName}` : ''}</span>
                <span className="fdn__legend-sep">|</span>
                <span><strong>Moy. de la classe :</strong> {fmt(moyClasse)}</span>
                <span className="fdn__legend-sep">|</span>
                <span><strong>Effectif :</strong> {rowsWithMoy.length} / {displayRows.length}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Named stat cards ─────────────────────────────────────────────── */}
      {rowsWithMoy.length > 0 && (
        <div className="fdn__extra-stats">
          <div className="fdn__extra-stat fdn__extra-stat--high">
            <div className="fdn__extra-stat__label">Moy. la plus forte</div>
            <div className="fdn__extra-stat__value">{fmt(strongestRow.moyenneMatiere)}<span>/20</span></div>
            <div className="fdn__extra-stat__name">obtenue par <strong>{strongestRow.studentName}</strong></div>
          </div>
          <div className="fdn__extra-stat fdn__extra-stat--low">
            <div className="fdn__extra-stat__label">Moy. la plus faible</div>
            <div className="fdn__extra-stat__value">{fmt(weakestRow.moyenneMatiere)}<span>/20</span></div>
            <div className="fdn__extra-stat__name">obtenue par <strong>{weakestRow.studentName}</strong></div>
          </div>
          {mostImproved ? (
            <div className="fdn__extra-stat fdn__extra-stat--up">
              <div className="fdn__extra-stat__label">A le plus progressé</div>
              <div className="fdn__extra-stat__value">+{fmt(mostImproved.delta)}<span>pts</span></div>
              <div className="fdn__extra-stat__name"><strong>{mostImproved.studentName}</strong></div>
              <div className="fdn__extra-stat__sub">T{prevTerm} → T{termNumber} · {fmt(prevData.students.find(s => s.studentId === mostImproved.studentId)?.moyenneMatiere)} → {fmt(mostImproved.moyenneMatiere)}</div>
            </div>
          ) : prevTerm && (
            <div className="fdn__extra-stat fdn__extra-stat--up fdn__extra-stat--muted">
              <div className="fdn__extra-stat__label">A le plus progressé</div>
              <div className="fdn__extra-stat__name">Aucune progression</div>
            </div>
          )}
          {mostDeclined ? (
            <div className="fdn__extra-stat fdn__extra-stat--down">
              <div className="fdn__extra-stat__label">A le plus régressé</div>
              <div className="fdn__extra-stat__value">{fmt(mostDeclined.delta)}<span>pts</span></div>
              <div className="fdn__extra-stat__name"><strong>{mostDeclined.studentName}</strong></div>
              <div className="fdn__extra-stat__sub">T{prevTerm} → T{termNumber} · {fmt(prevData.students.find(s => s.studentId === mostDeclined.studentId)?.moyenneMatiere)} → {fmt(mostDeclined.moyenneMatiere)}</div>
            </div>
          ) : prevTerm && (
            <div className="fdn__extra-stat fdn__extra-stat--down fdn__extra-stat--muted">
              <div className="fdn__extra-stat__label">A le plus régressé</div>
              <div className="fdn__extra-stat__name">Aucune régression</div>
            </div>
          )}
        </div>
      )}

      {/* Existing signature preview when signed */}
      {isSigned && data?.fiche?.signatureData && (
        <div className="fdn__sig-preview">
          <span className="fdn__sig-preview__label">Signature apposée :</span>
          <img
            src={data.fiche.signatureData}
            alt="Signature"
            className="fdn__sig-preview__img"
          />
        </div>
      )}

      {/* Signature modal */}
      <Modal
        open={signModal}
        onClose={() => setSignModal(false)}
        title="Signer la fiche de notes"
        size="md"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              className="fdn__btn fdn__btn--secondary"
              onClick={() => setSignModal(false)}
              disabled={signMutation.isPending}
            >
              Annuler
            </button>
            <button
              className="fdn__btn fdn__btn--sign"
              onClick={() => {
                if (!sigData) { toast.error('Veuillez apposer votre signature avant de valider.'); return; }
                signMutation.mutate(sigData);
              }}
              disabled={signMutation.isPending || !sigData}
            >
              {signMutation.isPending ? 'Validation…' : '✅ Valider et verrouiller'}
            </button>
          </div>
        }
      >
        <div className="fdn__sign-modal-body">
          <p className="fdn__sign-modal-info">
            En signant cette fiche, vous certifiez que les notes saisies sont exactes et définitives.
            La fiche sera verrouillée et ne pourra plus être modifiée sans annuler la signature.
          </p>
          <SignaturePad onChange={setSigData} width={500} height={180} />
        </div>
      </Modal>

      <div className="fdn__legend">
        <span><strong>Formule :</strong> Moy = (moy.interros×1 + devoir×2 + examen×3) ÷ 6</span>
        <span className="fdn__legend-sep">|</span>
        <span className="appr--good">TB ≥ 16</span>
        <span className="fdn__legend-sep">·</span>
        <span className="appr--good">B ≥ 14</span>
        <span className="fdn__legend-sep">·</span>
        <span className="appr--pass">AB ≥ 12</span>
        <span className="fdn__legend-sep">·</span>
        <span className="appr--pass">P ≥ 10</span>
        <span className="fdn__legend-sep">·</span>
        <span className="appr--fail">Insuf. &lt; 10</span>
      </div>
    </AppShell>
  );
}
