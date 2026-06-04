import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Loading from '../../../components/common/Loading/Loading';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import SignaturePad from '../../../components/common/SignaturePad/SignaturePad';
import { gradesService } from '../../../services/gradesService';
import { enqueueGrade, dequeueAll, removeFromQueue, queueCount } from '../../../utils/offlineGradeQueue';
import { subjectHoursService } from '../../../services/subjectHoursService';
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

const APPRECIATION_LABELS = {
  fr: ['Très Bien',  'Bien',  'Assez Bien',   'Passable',    'Insuffisant'],
  en: ['Very Good',  'Good',  'Fairly Good',  'Satisfactory','Insufficient'],
  de: ['Sehr gut',   'Gut',   'Befriedigend', 'Ausreichend', 'Ungenügend'],
  es: ['Muy bien',   'Bien',  'Bastante bien','Suficiente',  'Insuficiente'],
  ar: ['ممتاز',      'جيد جداً', 'جيد',       'مقبول',       'ضعيف'],
};

function detectAppreciationLang(subjectName) {
  if (!subjectName) return 'fr';
  const n = subjectName.toLowerCase();
  if (n.includes('anglais')  || n.includes('english')) return 'en';
  if (n.includes('allemand') || n.includes('deutsch'))  return 'de';
  if (n.includes('espagnol') || n.includes('español'))  return 'es';
  if (n.includes('arabe')    || n.includes('arabic'))   return 'ar';
  return 'fr';
}

function appreciation(moy, subjectName) {
  if (moy === null) return '';
  const [vg, g, fg, p, f] = APPRECIATION_LABELS[detectAppreciationLang(subjectName)];
  if (moy >= 16) return vg;
  if (moy >= 14) return g;
  if (moy >= 12) return fg;
  if (moy >= 10) return p;
  return f;
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

  // Hours panel state
  const [hoursForm, setHoursForm] = useState({ heuresPrevues: '', heuresEffectuees: '', absences: '', retards: '', notes: '' });
  const [hoursInitialized, setHoursInitialized] = useState(false);

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

  // Hours log for this subject+class+term
  const { data: hoursLogs = [] } = useQuery({
    queryKey: ['subject-hours', subjectId],
    queryFn: () => subjectHoursService.list(subjectId).then((r) => r.data),
    enabled: !!subjectId,
  });

  const existingHoursLog = hoursLogs.find(
    (h) => h.classId === classId && h.academicYear === academicYear && h.termNumber === termNumber,
  );

  if (existingHoursLog && !hoursInitialized) {
    setHoursInitialized(true);
    setHoursForm({
      heuresPrevues:    existingHoursLog.heuresPrevues    != null ? String(existingHoursLog.heuresPrevues)    : '',
      heuresEffectuees: existingHoursLog.heuresEffectuees != null ? String(existingHoursLog.heuresEffectuees) : '',
      absences:         existingHoursLog.absences         != null ? String(existingHoursLog.absences)         : '',
      retards:          existingHoursLog.retards          != null ? String(existingHoursLog.retards)          : '',
      notes:            existingHoursLog.notes ?? '',
    });
  }

  const hoursMutation = useMutation({
    mutationFn: () => subjectHoursService.upsert(subjectId, {
      classId,
      academicYear,
      termNumber,
      termName,
      heuresPrevues:    hoursForm.heuresPrevues    !== '' ? Number(hoursForm.heuresPrevues)    : undefined,
      heuresEffectuees: hoursForm.heuresEffectuees !== '' ? Number(hoursForm.heuresEffectuees) : undefined,
      absences:         hoursForm.absences         !== '' ? Number(hoursForm.absences)         : undefined,
      retards:          hoursForm.retards          !== '' ? Number(hoursForm.retards)          : undefined,
      notes:            hoursForm.notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subject-hours', subjectId] });
      toast.success('Suivi des heures enregistré.');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  // Initialise rows from server data (only once)
  if (data && rows === null) {
    setRows(data.students.map((s) => ({ ...s })));
    const firstCoef = data.students.find((s) => s.coefficient)?.coefficient;
    if (firstCoef) setCoef(firstCoef);
  }

  const isSigned = data?.fiche?.isSigned ?? false;

  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    queueCount().then(setPendingCount).catch(() => {});
  }, []);

  async function syncOfflineQueue() {
    setSyncing(true);
    try {
      const items = await dequeueAll();
      let synced = 0;
      for (const item of items) {
        try {
          await gradesService.saveForClassSubject(item.classId, item.subjectId, item.payload);
          await removeFromQueue(item.id);
          synced++;
        } catch { /* skip failed */ }
      }
      if (synced > 0) {
        toast.success(`${synced} fiche(s) synchronisée(s)`);
        qc.invalidateQueries({ queryKey: ficheKey });
      }
      setPendingCount(await queueCount());
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    const handleOnline = () => { if (pendingCount > 0) syncOfflineQueue(); };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCount]);

  const mutation = useMutation({
    mutationFn: (payload) => gradesService.saveForClassSubject(classId, subjectId, payload),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ficheKey });
      setTimeout(() => setSaved(false), 3000);
    },
    onError: async (err, payload) => {
      // If network error, queue offline
      if (!navigator.onLine || err?.code === 'ERR_NETWORK') {
        await enqueueGrade({ classId, subjectId, payload });
        setPendingCount((n) => n + 1);
        toast('Note mise en file hors-ligne — sera synchronisée dès la reconnexion', { icon: '📶' });
      } else {
        toast.error(err?.response?.data?.message ?? 'Erreur lors de l\'enregistrement');
      }
    },
  });

  const csvRef = useRef(null);
  const csvMutation = useMutation({
    mutationFn: (rows) => gradesService.importCsvGrades(classId, subjectId, academicYear, termNumber, rows),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ficheKey });
      toast.success(`${data.data.imported} note(s) importée(s)${data.data.failed ? `, ${data.data.failed} erreur(s)` : ''}.`);
    },
    onError: () => toast.error('Erreur lors de l\'import CSV'),
  });

  const handleCsvImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const idIdx = headers.findIndex((h) => h.includes('id') || h.includes('matricule'));
      const devIdx = headers.findIndex((h) => h.includes('devoir') || h === 'd');
      const compoIdx = headers.findIndex((h) => h.includes('compo') || h === 'c');
      if (idIdx === -1) { toast.error('Colonne studentId/matricule introuvable'); return; }
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(',');
        return {
          studentId: cols[idIdx]?.trim(),
          ...(devIdx !== -1 && cols[devIdx]?.trim() && { devoir: parseFloat(cols[devIdx]) }),
          ...(compoIdx !== -1 && cols[compoIdx]?.trim() && { compo: parseFloat(cols[compoIdx]) }),
        };
      }).filter((r) => r.studentId);
      csvMutation.mutate(rows);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const students = rows.map((r) => `${r.studentId},${r.studentName},,""`);
    const csv = ['studentId,Nom,devoir,compo', ...students].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'template_notes.csv'; a.click();
    URL.revokeObjectURL(url);
  };

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

  const teacherLabel = data?.teacher?.name
    ? `Prof : ${data.teacher.name}`
    : null;

  return (
    <AppShell title={`Fiche de notes — ${data?.subject?.nameFr ?? ''}`}>
      {/* Offline sync banner */}
      {pendingCount > 0 && (
        <div className="fdn__offline-banner">
          <span>📶 {pendingCount} fiche(s) en attente de synchronisation</span>
          <button className="fdn__offline-sync-btn" onClick={syncOfflineQueue} disabled={syncing}>
            {syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
          </button>
        </div>
      )}
      <PageHeader
        title={`Fiche de notes — ${data?.subject?.nameFr ?? ''}`}
        subtitle={[termName, academicYear, teacherLabel].filter(Boolean).join(' · ')}
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

      <div className="fdn__csv-bar">
        <span className="fdn__csv-label">Import CSV :</span>
        <button type="button" className="fdn__btn fdn__btn--csv-dl" onClick={downloadTemplate}>
          ⬇ Télécharger le modèle
        </button>
        <button type="button" className="fdn__btn fdn__btn--csv-up" onClick={() => csvRef.current?.click()} disabled={csvMutation.isPending}>
          ⬆ Importer les notes
        </button>
        <input ref={csvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvImport} />
      </div>

      {isSigned && (
        <div className="fdn__signature-banner">
          <span className="fdn__signature-banner__icon">✅</span>
          <div>
            <strong>Fiche signée et verrouillée</strong>
            <span> — Signée par <em>{data.fiche.signedByName}</em> le {new Date(data.fiche.signedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      )}

      {/* ── Hours panel ── */}
      <div className="fdn__hours-panel">
        <div className="fdn__hours-title">Suivi des heures &amp; absences</div>
        <div className="fdn__hours-fields">
          {[
            { key: 'heuresPrevues',    label: 'H. prévues' },
            { key: 'heuresEffectuees', label: 'H. effectuées' },
            { key: 'absences',         label: 'Absences' },
            { key: 'retards',          label: 'Retards' },
          ].map(({ key, label }) => (
            <label key={key} className="fdn__hours-field">
              <span className="fdn__hours-field-label">{label}</span>
              <input
                type="number"
                min="0"
                className="fdn__hours-input"
                placeholder="—"
                value={hoursForm[key]}
                onChange={(e) => setHoursForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}
          <label className="fdn__hours-field fdn__hours-field--notes">
            <span className="fdn__hours-field-label">Observations</span>
            <input
              type="text"
              className="fdn__hours-input"
              placeholder="Optionnel…"
              value={hoursForm.notes}
              onChange={(e) => setHoursForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
          <button
            className="fdn__hours-save-btn"
            onClick={() => hoursMutation.mutate()}
            disabled={hoursMutation.isPending}
          >
            {hoursMutation.isPending ? '…' : '💾 Enregistrer'}
          </button>
        </div>
      </div>

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
                    {appreciation(moy, data?.subject?.nameFr) || '—'}
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

      {/* Signature panel */}
      <OffCanvas
        open={signModal}
        onClose={() => setSignModal(false)}
        title="Signer la fiche de notes"
        size="md"
        footer={
          <>
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
          </>
        }
      >
        <div className="fdn__sign-modal-body">
          <p className="fdn__sign-modal-info">
            En signant cette fiche, vous certifiez que les notes saisies sont exactes et définitives.
            La fiche sera verrouillée et ne pourra plus être modifiée sans annuler la signature.
          </p>
          <SignaturePad onChange={setSigData} width={460} height={180} />
        </div>
      </OffCanvas>

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
