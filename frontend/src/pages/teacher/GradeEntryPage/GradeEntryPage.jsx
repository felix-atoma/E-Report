import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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

// Togolese formula: (moy_interros×1 + devoir×2 + compo×3) / (1+2+3), normalized to /20
function computeMoy(row, maxScore = 20) {
  const moyI = computeMoyInterros(row);
  let ws = 0, wt = 0;
  if (moyI !== null)                   { ws += moyI * 1;           wt += 1; }
  if (!isBlank(row.noteDevoir))        { ws += Number(row.noteDevoir) * 2;      wt += 2; }
  if (!isBlank(row.noteComposition))   { ws += Number(row.noteComposition) * 3; wt += 3; }
  if (wt === 0) return null;
  const rawMoy = ws / wt;
  return Math.round((rawMoy * 20 / maxScore) * 100) / 100;
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

// Appreciation labels stay in-code: they vary per subject language
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

function NoteInput({ value, onChange, disabled, maxScore = 20 }) {
  return (
    <input
      type="number"
      className={`fdn__note-input${disabled ? ' fdn__note-input--locked' : ''}`}
      min={0} max={maxScore} step={maxScore === 10 ? 0.5 : 0.25}
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
  const { t } = useTranslation();
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

  const maxScore       = data?.subject?.maxScore       ?? 20;
  const hasCoefficient = data?.subject?.hasCoefficient ?? true;
  const [signModal, setSignModal] = useState(false);
  const [sigData, setSigData] = useState(null);

  const [hoursForm, setHoursForm] = useState({ heuresPrevues: '', heuresEffectuees: '', absences: '', retards: '', notes: '' });
  const [hoursInitialized, setHoursInitialized] = useState(false);

  const ficheKey = ['fiche', classId, subjectId, academicYear, termNumber];

  const { data, isLoading, error } = useQuery({
    queryKey: ficheKey,
    queryFn: () =>
      gradesService.getForClassSubject(classId, subjectId, academicYear, termNumber).then((r) => r.data),
    enabled: !!classId && !!subjectId && !!academicYear && !isNaN(termNumber),
  });

  const prevTerm = termNumber > 1 ? termNumber - 1 : null;
  const { data: prevData } = useQuery({
    queryKey: ['fiche', classId, subjectId, academicYear, prevTerm],
    queryFn: () =>
      gradesService.getForClassSubject(classId, subjectId, academicYear, prevTerm).then((r) => r.data),
    enabled: !!classId && !!subjectId && !!academicYear && prevTerm !== null,
  });

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
      classId, academicYear, termNumber, termName,
      heuresPrevues:    hoursForm.heuresPrevues    !== '' ? Number(hoursForm.heuresPrevues)    : undefined,
      heuresEffectuees: hoursForm.heuresEffectuees !== '' ? Number(hoursForm.heuresEffectuees) : undefined,
      absences:         hoursForm.absences         !== '' ? Number(hoursForm.absences)         : undefined,
      retards:          hoursForm.retards          !== '' ? Number(hoursForm.retards)          : undefined,
      notes:            hoursForm.notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subject-hours', subjectId] });
      toast.success(t('gradeEntry.toast.hoursSaved'));
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('gradeEntry.toast.hoursError')),
  });

  if (data && rows === null) {
    setRows(data.students.map((s) => ({ ...s })));
    if (data.subject?.hasCoefficient !== false) {
      const firstCoef = data.students.find((s) => s.coefficient)?.coefficient;
      if (firstCoef) setCoef(firstCoef);
    }
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
        toast.success(t('gradeEntry.offline.synced', { count: synced }));
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
      if (!navigator.onLine || err?.code === 'ERR_NETWORK') {
        await enqueueGrade({ classId, subjectId, payload });
        setPendingCount((n) => n + 1);
        toast(t('gradeEntry.offline.queued'), { icon: '📶' });
      } else {
        toast.error(err?.response?.data?.message ?? t('gradeEntry.toast.saveError'));
      }
    },
  });

  const csvRef = useRef(null);
  const csvMutation = useMutation({
    mutationFn: (rows) => gradesService.importCsvGrades(classId, subjectId, academicYear, termNumber, rows),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ficheKey });
      const msg = t('gradeEntry.csv.imported', { count: data.data.imported })
        + (data.data.failed ? `, ${t('gradeEntry.csv.failed', { count: data.data.failed })}` : '');
      toast.success(msg);
    },
    onError: () => toast.error(t('gradeEntry.csv.error')),
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
      if (idIdx === -1) { toast.error(t('gradeEntry.csv.missingColumn')); return; }
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
      toast.success(t('gradeEntry.toast.signed'));
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('gradeEntry.toast.signError')),
  });

  const unsignMutation = useMutation({
    mutationFn: () => gradesService.unsignFiche(classId, subjectId, academicYear, termNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ficheKey });
      toast.success(t('gradeEntry.toast.unsigned'));
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('gradeEntry.toast.signError')),
  });

  const maxScoreRef = useRef(20);
  maxScoreRef.current = maxScore;

  const updateRow = useCallback((idx, field, value) => {
    setRows((prev) => {
      const next = prev.map((r, i) => i === idx ? { ...r, [field]: value } : r);
      const moy = computeMoy(next[idx], maxScoreRef.current);
      next[idx] = { ...next[idx], moyenneMatiere: moy };
      return next;
    });
  }, []);

  const handleSave = () => {
    if (!rows) return;
    const effectiveCoef = hasCoefficient ? coef : 1;
    mutation.mutate({
      academicYear, termName, termNumber,
      grades: rows.map((r) => ({
        studentId: r.studentId,
        noteInterro1: r.noteInterro1,
        noteInterro2: r.noteInterro2,
        noteInterro3: r.noteInterro3,
        noteInterro4: r.noteInterro4,
        noteDevoir: r.noteDevoir,
        noteComposition: r.noteComposition,
        coefficient: effectiveCoef,
        teacherComment: r.teacherComment,
        teacherName: r.teacherName,
      })),
    });
  };

  const subjectTitle = data?.subject?.nameFr ?? '';
  const pageTitle = t('gradeEntry.title', { subject: subjectTitle });

  if (isLoading) return <AppShell title={t('gradeEntry.loading')}><Loading /></AppShell>;
  if (error) {
    const msg = error?.response?.data?.message ?? t('gradeEntry.errors.load');
    return <AppShell title={t('gradeEntry.loading')}><p className="fdn__error">{msg}</p></AppShell>;
  }

  const displayRows = rows ?? data?.students ?? [];
  const ranks = computeRanks(displayRows);

  const totalCoef    = displayRows.filter((r) => r.moyenneMatiere !== null).length * coef;
  const totalPoints  = displayRows.reduce((s, r) => s + (r.moyenneMatiere !== null ? r.moyenneMatiere * coef : 0), 0);
  const moyClasse    = displayRows.filter((r) => r.moyenneMatiere !== null).length > 0
    ? totalPoints / totalCoef : null;
  const rowsWithMoy  = displayRows.filter((r) => r.moyenneMatiere !== null);
  const classHighest = rowsWithMoy.length > 0 ? Math.max(...rowsWithMoy.map((r) => r.moyenneMatiere)) : null;
  const classLowest  = rowsWithMoy.length > 0 ? Math.min(...rowsWithMoy.map((r) => r.moyenneMatiere)) : null;

  const strongestRow = rowsWithMoy.length > 0
    ? rowsWithMoy.reduce((a, b) => b.moyenneMatiere > a.moyenneMatiere ? b : a)
    : null;
  const weakestRow = rowsWithMoy.length > 0
    ? rowsWithMoy.reduce((a, b) => b.moyenneMatiere < a.moyenneMatiere ? b : a)
    : null;

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
    ? `${t('gradeEntry.teacherProf')} ${data.teacher.name}`
    : null;

  return (
    <AppShell title={pageTitle}>
      {pendingCount > 0 && (
        <div className="fdn__offline-banner">
          <span>📶 {t('gradeEntry.offline', { count: pendingCount })}</span>
          <button className="fdn__offline-sync-btn" onClick={syncOfflineQueue} disabled={syncing}>
            {syncing ? t('gradeEntry.syncing') : t('gradeEntry.syncNow')}
          </button>
        </div>
      )}
      <PageHeader
        title={pageTitle}
        subtitle={[termName, academicYear, teacherLabel].filter(Boolean).join(' · ')}
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {!hasCoefficient && (
              <span className="fdn__primary-badge">{t('gradeEntry.primaryNoCoeф')}</span>
            )}
            {hasCoefficient && (
              <label className="fdn__coef-label">
                {t('gradeEntry.coef')}
                <input
                  type="number"
                  className="fdn__coef-input"
                  min={0.5} max={20} step={0.5}
                  value={coef}
                  onChange={(e) => setCoef(parseFloat(e.target.value))}
                  disabled={isSigned}
                />
              </label>
            )}
            <button className="fdn__btn fdn__btn--secondary" onClick={() => navigate(-1)}>{t('gradeEntry.back')}</button>
            <button
              className="fdn__btn fdn__btn--print"
              onClick={() => {
                const snapshot = {
                  ts: Date.now(),
                  subject: data?.subject ?? null,
                  teacher: data?.teacher ?? null,
                  fiche: data?.fiche ?? null,
                  coef, termName, academicYear, termNumber,
                  students: rows,
                };
                localStorage.setItem(
                  `fdnp:${classId}:${subjectId}:${academicYear}:${termNumber}`,
                  JSON.stringify(snapshot),
                );
                const qs = new URLSearchParams({ academicYear, termNumber, termName }).toString();
                window.open(`/teacher/classes/${classId}/grades/${subjectId}/print?${qs}`, '_blank');
              }}
            >
              {t('gradeEntry.printOffline')}
            </button>
            {!isSigned ? (
              <>
                <button
                  className="fdn__btn fdn__btn--primary"
                  onClick={handleSave}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? t('gradeEntry.saving') : t('gradeEntry.save')}
                </button>
                <button
                  className="fdn__btn fdn__btn--sign"
                  onClick={() => { setSigData(null); setSignModal(true); }}
                >
                  {t('gradeEntry.sign')}
                </button>
              </>
            ) : (
              <button
                className="fdn__btn fdn__btn--unsign"
                onClick={() => unsignMutation.mutate()}
                disabled={unsignMutation.isPending}
              >
                {t('gradeEntry.unsign')}
              </button>
            )}
          </div>
        }
      />

      {saved && (
        <div className="fdn__toast">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          {t('gradeEntry.saved')}
        </div>
      )}

      <div className="fdn__csv-bar">
        <span className="fdn__csv-label">{t('gradeEntry.csvLabel')}</span>
        <button type="button" className="fdn__btn fdn__btn--csv-dl" onClick={downloadTemplate}>
          {t('gradeEntry.downloadTemplate')}
        </button>
        <button type="button" className="fdn__btn fdn__btn--csv-up" onClick={() => csvRef.current?.click()} disabled={csvMutation.isPending}>
          {t('gradeEntry.importBtn')}
        </button>
        <input ref={csvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvImport} />
      </div>

      {isSigned && (
        <div className="fdn__signature-banner">
          <span className="fdn__signature-banner__icon">✅</span>
          <div>
            <strong>{t('gradeEntry.signedBannerTitle')}</strong>
            <span> — {t('gradeEntry.signedBy', {
              name: data.fiche.signedByName,
              date: new Date(data.fiche.signedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
            })}</span>
          </div>
        </div>
      )}

      <div className="fdn__hours-panel">
        <div className="fdn__hours-title">{t('gradeEntry.hoursPanel')}</div>
        <div className="fdn__hours-fields">
          {[
            { key: 'heuresPrevues',    label: t('gradeEntry.hoursPlanned') },
            { key: 'heuresEffectuees', label: t('gradeEntry.hoursDone') },
            { key: 'absences',         label: t('gradeEntry.absences') },
            { key: 'retards',          label: t('gradeEntry.delays') },
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
            <span className="fdn__hours-field-label">{t('gradeEntry.observations')}</span>
            <input
              type="text"
              className="fdn__hours-input"
              placeholder="…"
              value={hoursForm.notes}
              onChange={(e) => setHoursForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
          <button
            className="fdn__hours-save-btn"
            onClick={() => hoursMutation.mutate()}
            disabled={hoursMutation.isPending}
          >
            {hoursMutation.isPending ? '…' : t('gradeEntry.saveHours')}
          </button>
        </div>
      </div>

      <div className="fdn__table-wrap">
        <table className="fdn__table">
          <thead>
            <tr>
              <th className="fdn__th fdn__th--name" rowSpan={2}>{t('gradeEntry.columns.student')}</th>
              <th className="fdn__th fdn__th--group" colSpan={5}>{t('gradeEntry.columns.classnotes')}</th>
              <th className="fdn__th fdn__th--note fdn__th--devoir" rowSpan={2}>{t('gradeEntry.columns.devoir')}<span>/{maxScore}</span></th>
              <th className="fdn__th fdn__th--note fdn__th--compo" rowSpan={2}>{t('gradeEntry.columns.examen')}<span>/{maxScore}</span></th>
              <th className="fdn__th fdn__th--moy" rowSpan={2}>{t('gradeEntry.columns.moy')}<span>/20</span></th>
              {hasCoefficient && <th className="fdn__th fdn__th--coef" rowSpan={2}>{t('gradeEntry.columns.coef')}</th>}
              {hasCoefficient && <th className="fdn__th fdn__th--total" rowSpan={2}>{t('gradeEntry.columns.total')}</th>}
              <th className="fdn__th fdn__th--rang" rowSpan={2}>{t('gradeEntry.columns.rang')}</th>
              <th className="fdn__th fdn__th--appr" rowSpan={2}>{t('gradeEntry.columns.appreciation')}<span>{t('gradeEntry.teacherProf')}</span></th>
              <th className="fdn__th fdn__th--teacher" rowSpan={2}>{t('gradeEntry.columns.teacher')}</th>
            </tr>
            <tr>
              <th className="fdn__th fdn__th--note">{t('gradeEntry.columns.int1')}<span>/{maxScore}</span></th>
              <th className="fdn__th fdn__th--note">{t('gradeEntry.columns.int2')}<span>/{maxScore}</span></th>
              <th className="fdn__th fdn__th--note">{t('gradeEntry.columns.int3')}<span>/{maxScore}</span></th>
              <th className="fdn__th fdn__th--note">{t('gradeEntry.columns.int4')}<span>/{maxScore}</span></th>
              <th className="fdn__th fdn__th--note fdn__th--moyinterro">{t('gradeEntry.columns.moyInterro')}</th>
            </tr>
          </thead>

          <tbody>
            {displayRows.length === 0 && (
              <tr><td colSpan={14} className="fdn__empty">{t('gradeEntry.noStudents')}</td></tr>
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
                  <td className="fdn__td"><NoteInput value={row.noteInterro1} onChange={(v) => updateRow(idx, 'noteInterro1', v)} disabled={isSigned} maxScore={maxScore} /></td>
                  <td className="fdn__td"><NoteInput value={row.noteInterro2} onChange={(v) => updateRow(idx, 'noteInterro2', v)} disabled={isSigned} maxScore={maxScore} /></td>
                  <td className="fdn__td"><NoteInput value={row.noteInterro3} onChange={(v) => updateRow(idx, 'noteInterro3', v)} disabled={isSigned} maxScore={maxScore} /></td>
                  <td className="fdn__td"><NoteInput value={row.noteInterro4} onChange={(v) => updateRow(idx, 'noteInterro4', v)} disabled={isSigned} maxScore={maxScore} /></td>
                  <td className="fdn__td fdn__td--computed">{fmt(moyI)}</td>
                  <td className="fdn__td fdn__td--devoir"><NoteInput value={row.noteDevoir} onChange={(v) => updateRow(idx, 'noteDevoir', v)} disabled={isSigned} maxScore={maxScore} /></td>
                  <td className="fdn__td fdn__td--compo"><NoteInput value={row.noteComposition} onChange={(v) => updateRow(idx, 'noteComposition', v)} disabled={isSigned} maxScore={maxScore} /></td>
                  <td className={`fdn__td fdn__td--moy ${moy !== null && moy < 10 ? 'fdn__td--fail' : ''}`}>{fmt(moy)}</td>
                  {hasCoefficient && <td className="fdn__td fdn__td--coef">{coef}</td>}
                  {hasCoefficient && <td className="fdn__td fdn__td--total">{moy !== null ? fmt(moy * coef) : '—'}</td>}
                  <td className="fdn__td fdn__td--rang">{ranks[idx] !== null ? `${ranks[idx]}e` : '—'}</td>
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

          <tfoot>
            <tr className="fdn__totals">
              <td className="fdn__td fdn__td--name fdn__totals-label" colSpan={8}>{t('gradeEntry.totals')}</td>
              <td className="fdn__td fdn__td--moy fdn__totals-val">{fmt(moyClasse)}</td>
              {hasCoefficient && <td className="fdn__td fdn__td--coef fdn__totals-val">{coef}</td>}
              {hasCoefficient && <td className="fdn__td fdn__td--total fdn__totals-val">{fmt(totalPoints)}</td>}
              <td className="fdn__td" colSpan={hasCoefficient ? 3 : 5}></td>
            </tr>
            <tr className="fdn__stats">
              <td colSpan={14} className="fdn__stats-row">
                <span><strong>{t('gradeEntry.stats.strongest')} :</strong> {fmt(classHighest)} {strongestRow ? `— ${strongestRow.studentName}` : ''}</span>
                <span className="fdn__legend-sep">|</span>
                <span><strong>{t('gradeEntry.stats.weakest')} :</strong> {fmt(classLowest)} {weakestRow ? `— ${weakestRow.studentName}` : ''}</span>
                <span className="fdn__legend-sep">|</span>
                <span><strong>{t('gradeEntry.stats.classAvg')} :</strong> {fmt(moyClasse)}</span>
                <span className="fdn__legend-sep">|</span>
                <span><strong>{t('gradeEntry.stats.count')} :</strong> {rowsWithMoy.length} / {displayRows.length}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {rowsWithMoy.length > 0 && (
        <div className="fdn__extra-stats">
          <div className="fdn__extra-stat fdn__extra-stat--high">
            <div className="fdn__extra-stat__label">{t('gradeEntry.stats.strongest')}</div>
            <div className="fdn__extra-stat__value">{fmt(strongestRow.moyenneMatiere)}<span>/20</span></div>
            <div className="fdn__extra-stat__name">{t('gradeEntry.stats.obtainedBy')} <strong>{strongestRow.studentName}</strong></div>
          </div>
          <div className="fdn__extra-stat fdn__extra-stat--low">
            <div className="fdn__extra-stat__label">{t('gradeEntry.stats.weakest')}</div>
            <div className="fdn__extra-stat__value">{fmt(weakestRow.moyenneMatiere)}<span>/20</span></div>
            <div className="fdn__extra-stat__name">{t('gradeEntry.stats.obtainedBy')} <strong>{weakestRow.studentName}</strong></div>
          </div>
          {mostImproved ? (
            <div className="fdn__extra-stat fdn__extra-stat--up">
              <div className="fdn__extra-stat__label">{t('gradeEntry.stats.improved')}</div>
              <div className="fdn__extra-stat__value">+{fmt(mostImproved.delta)}<span>pts</span></div>
              <div className="fdn__extra-stat__name"><strong>{mostImproved.studentName}</strong></div>
              <div className="fdn__extra-stat__sub">T{prevTerm} → T{termNumber} · {fmt(prevData.students.find(s => s.studentId === mostImproved.studentId)?.moyenneMatiere)} → {fmt(mostImproved.moyenneMatiere)}</div>
            </div>
          ) : prevTerm && (
            <div className="fdn__extra-stat fdn__extra-stat--up fdn__extra-stat--muted">
              <div className="fdn__extra-stat__label">{t('gradeEntry.stats.improved')}</div>
              <div className="fdn__extra-stat__name">{t('gradeEntry.stats.noImprovement')}</div>
            </div>
          )}
          {mostDeclined ? (
            <div className="fdn__extra-stat fdn__extra-stat--down">
              <div className="fdn__extra-stat__label">{t('gradeEntry.stats.declined')}</div>
              <div className="fdn__extra-stat__value">{fmt(mostDeclined.delta)}<span>pts</span></div>
              <div className="fdn__extra-stat__name"><strong>{mostDeclined.studentName}</strong></div>
              <div className="fdn__extra-stat__sub">T{prevTerm} → T{termNumber} · {fmt(prevData.students.find(s => s.studentId === mostDeclined.studentId)?.moyenneMatiere)} → {fmt(mostDeclined.moyenneMatiere)}</div>
            </div>
          ) : prevTerm && (
            <div className="fdn__extra-stat fdn__extra-stat--down fdn__extra-stat--muted">
              <div className="fdn__extra-stat__label">{t('gradeEntry.stats.declined')}</div>
              <div className="fdn__extra-stat__name">{t('gradeEntry.stats.noDecline')}</div>
            </div>
          )}
        </div>
      )}

      {isSigned && data?.fiche?.signatureData && (
        <div className="fdn__sig-preview">
          <span className="fdn__sig-preview__label">{t('gradeEntry.signedBannerTitle')} :</span>
          <img src={data.fiche.signatureData} alt="Signature" className="fdn__sig-preview__img" />
        </div>
      )}

      <OffCanvas
        open={signModal}
        onClose={() => setSignModal(false)}
        title={t('gradeEntry.signModal.title')}
        size="md"
        footer={
          <>
            <button
              className="fdn__btn fdn__btn--secondary"
              onClick={() => setSignModal(false)}
              disabled={signMutation.isPending}
            >
              {t('gradeEntry.signModal.cancel')}
            </button>
            <button
              className="fdn__btn fdn__btn--sign"
              onClick={() => {
                if (!sigData) { toast.error(t('gradeEntry.signModal.noSig')); return; }
                signMutation.mutate(sigData);
              }}
              disabled={signMutation.isPending || !sigData}
            >
              {signMutation.isPending ? t('gradeEntry.signModal.confirming') : t('gradeEntry.signModal.confirm')}
            </button>
          </>
        }
      >
        <div className="fdn__sign-modal-body">
          <p className="fdn__sign-modal-info">{t('gradeEntry.signModal.info')}</p>
          <SignaturePad onChange={setSigData} width={460} height={180} />
        </div>
      </OffCanvas>

      <div className="fdn__legend">
        <span><strong>{t('gradeEntry.legend.formula').split(':')[0]} :</strong> {t('gradeEntry.legend.formula').split(':')[1]?.trim()}</span>
        <span className="fdn__legend-sep">|</span>
        <span className="appr--good">{t('gradeEntry.legend.tb')}</span>
        <span className="fdn__legend-sep">·</span>
        <span className="appr--good">{t('gradeEntry.legend.b')}</span>
        <span className="fdn__legend-sep">·</span>
        <span className="appr--pass">{t('gradeEntry.legend.ab')}</span>
        <span className="fdn__legend-sep">·</span>
        <span className="appr--pass">{t('gradeEntry.legend.p')}</span>
        <span className="fdn__legend-sep">·</span>
        <span className="appr--fail">{t('gradeEntry.legend.insuf')}</span>
      </div>
    </AppShell>
  );
}
