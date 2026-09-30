import { useState, useContext, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { classesService } from '../../../services/classesService';
import { reportsService } from '../../../services/reportsService';
import { attendanceService } from '../../../services/attendanceService';
import { AuthContext } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Loading from '../../../components/common/Loading/Loading';
import './TitulaireEntryPage.css';

const CONDUCT_COLOR = {
  TRES_BIEN: '#16a34a', BIEN: '#0284c7',
  PASSABLE: '#d97706',  MEDIOCRE: '#dc2626',
};

function SmallInput({ value, onChange, type = 'number', placeholder = '—', width = 56 }) {
  return (
    <input
      type={type}
      className="tit__input"
      style={{ width }}
      min={type === 'number' ? 0 : undefined}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === '' ? '' : type === 'number' ? e.target.value : e.target.value)}
    />
  );
}

export default function TitulaireEntryPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const qc = useQueryClient();
  const { t } = useTranslation();

  const TERMS = [
    { value: 1, label: t('fees.terms.TRIMESTRE_1') },
    { value: 2, label: t('fees.terms.TRIMESTRE_2') },
    { value: 3, label: t('fees.terms.TRIMESTRE_3') },
  ];
  const CONDUCT_OPTIONS = [
    { value: '',          label: '—' },
    { value: 'TRES_BIEN', label: t('conduct.TRES_BIEN') },
    { value: 'BIEN',      label: t('conduct.BIEN') },
    { value: 'PASSABLE',  label: t('conduct.PASSABLE') },
    { value: 'MEDIOCRE',  label: t('conduct.MEDIOCRE') },
  ];

  const [term, setTerm]     = useState(1);
  const [entries, setEntries] = useState({});    // { studentId: { ...fields } }
  const [initialized, setInitialized] = useState(new Set());

  // Reset form when term changes so previous term's values don't bleed in
  useEffect(() => {
    setEntries({});
    setInitialized(new Set());
  }, [term]);

  const { data: cls, isLoading: clsLoading } = useQuery({
    queryKey: ['class', classId],
    queryFn: () => classesService.get(classId).then((r) => r.data),
    enabled: !!classId,
  });

  const academicYear = cls?.academicYear ?? '';

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['reports', classId, academicYear, term],
    queryFn: () => reportsService.list({ classId, academicYear, termNumber: term }).then((r) => r.data),
    enabled: !!classId && !!academicYear,
  });

  // Cumul calculé depuis les feuilles de présence des professeurs — prioritaire sur la saisie manuelle
  const { data: termAttendance = [] } = useQuery({
    queryKey: ['attendance-term-summary', classId, academicYear, term],
    queryFn: () => attendanceService
      .termSummary(classId, { academicYear, termType: 'TRIMESTRE', termNumber: term })
      .then((r) => r.data),
    enabled: !!classId && !!academicYear,
  });
  const attendanceByStudentId = useMemo(
    () => new Map(termAttendance.map((a) => [a.studentId, a])),
    [termAttendance],
  );

  // État de la classe : fiches signées par les professeurs, bulletins par statut
  const { data: status } = useQuery({
    queryKey: ['class-status', classId, academicYear, term],
    queryFn: () => reportsService.classStatus({ classId, academicYear, termNumber: term }).then((r) => r.data),
    enabled: !!classId && !!academicYear,
  });

  // Observation proposée par l'IA : remplie dans le champ, le titulaire relit puis enregistre
  const [aiLoadingFor, setAiLoadingFor] = useState(null);
  async function suggestComment(studentId, reportId) {
    setAiLoadingFor(studentId);
    try {
      const res = await reportsService.aiComment(reportId);
      const comment = res.data?.comment ?? '';
      if (comment) {
        setField(studentId, 'teacherComment', comment);
        toast.success("Observation proposée — relisez-la puis cliquez sur « Enregistrer tout ».");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Impossible de générer l'observation.");
    } finally {
      setAiLoadingFor(null);
    }
  }

  const publishMutation = useMutation({
    mutationFn: () => reportsService.bulkPublish({ classId, academicYear, termNumber: term }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['reports', classId, academicYear, term] });
      qc.invalidateQueries({ queryKey: ['class-status', classId, academicYear, term] });
      const { published = 0, skipped = 0 } = res.data ?? {};
      toast.success(`${published} bulletin(s) publié(s)${skipped ? `, ${skipped} ignoré(s)` : ''}.`);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur lors de la publication'),
  });
  const [confirmPublish, setConfirmPublish] = useState(false);

  const students = useMemo(() => {
    return [...(cls?.students ?? [])].sort((a, b) => {
      const na = a.student?.user?.name ?? a.student?.admissionNumber ?? '';
      const nb = b.student?.user?.name ?? b.student?.admissionNumber ?? '';
      return na.localeCompare(nb, 'fr');
    });
  }, [cls]);

  // Pre-fill entries from existing report cards whenever term/data changes
  const reportsByStudentId = useMemo(
    () => new Map(reports.map((r) => [r.studentId, r])),
    [reports],
  );

  students.forEach((cs) => {
    const studentId = cs.student?.id;
    if (!studentId) return;
    const key = `${studentId}-${term}`;
    if (initialized.has(key)) return;

    const rc = reportsByStudentId.get(studentId);
    setInitialized((prev) => new Set([...prev, key]));
    setEntries((prev) => ({
      ...prev,
      [studentId]: {
        attendanceDays:      rc?.attendanceDays      != null ? String(rc.attendanceDays)      : '',
        attendancePresent:   rc?.attendancePresent   != null ? String(rc.attendancePresent)   : '',
        attendanceLate:         rc?.attendanceLate         != null ? String(rc.attendanceLate)         : '',
        attendanceAbsent:       rc?.attendanceAbsent       != null ? String(rc.attendanceAbsent)       : '',
        attendanceAbsentHours:  rc?.attendanceAbsentHours  != null ? String(rc.attendanceAbsentHours)  : '',
        attendanceExcluded:  rc?.attendanceExcluded  != null ? String(rc.attendanceExcluded)  : '',
        warnings:            rc?.warnings            != null ? String(rc.warnings)            : '',
        commendations:       rc?.commendations       != null ? String(rc.commendations)       : '',
        honorCouncil:        rc?.honorCouncil        ?? false,
        conductRating:       rc?.conductRating       ?? '',
        teacherComment:      rc?.teacherComment      ?? '',
        ...(prev[studentId] ?? {}),
      },
    }));
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const termLabel = TERMS.find((t) => t.value === term)?.label ?? `Trimestre ${term}`;
      const payload = {
        classId,
        academicYear,
        termType: 'TRIMESTRE',
        termNumber: term,
        termName: termLabel,
        entries: students.map((cs) => {
          const studentId = cs.student?.id;
          const e = entries[studentId] ?? {};
          return {
            studentId,
            attendanceDays:     e.attendanceDays     !== '' && e.attendanceDays     != null ? Number(e.attendanceDays)     : undefined,
            attendancePresent:  e.attendancePresent  !== '' && e.attendancePresent  != null ? Number(e.attendancePresent)  : undefined,
            attendanceLate:     e.attendanceLate     !== '' && e.attendanceLate     != null ? Number(e.attendanceLate)     : undefined,
            attendanceAbsent:      e.attendanceAbsent      !== '' && e.attendanceAbsent      != null ? Number(e.attendanceAbsent)      : undefined,
            attendanceAbsentHours: e.attendanceAbsentHours !== '' && e.attendanceAbsentHours != null ? Number(e.attendanceAbsentHours) : undefined,
            attendanceExcluded: e.attendanceExcluded !== '' && e.attendanceExcluded != null ? Number(e.attendanceExcluded) : undefined,
            warnings:           e.warnings           !== '' && e.warnings           != null ? Number(e.warnings)           : undefined,
            commendations:      e.commendations      !== '' && e.commendations      != null ? Number(e.commendations)      : undefined,
            honorCouncil:       e.honorCouncil       || false,
            conductRating:      e.conductRating      || undefined,
            teacherComment:     e.teacherComment     || undefined,
          };
        }).filter((e) => e.studentId),
      };
      return reportsService.titulaireUpsert(payload);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['reports', classId, academicYear, term] });
      toast.success(`${res.data?.count ?? ''} bulletins mis à jour.`);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  function setField(studentId, field, value) {
    setEntries((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? {}), [field]: value },
    }));
  }

  if (clsLoading) return <AppShell title="Saisie titulaire"><Loading /></AppShell>;

  const isHomeroom = cls?.teacher?.id === user?.id;
  if (!isHomeroom && user?.role !== 'ADMIN') {
    return (
      <AppShell title="Saisie titulaire">
        <p className="tit__error">Accès réservé au professeur titulaire de cette classe.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Saisie titulaire">
      <PageHeader
        title={`Saisie titulaire — ${cls?.name ?? ''}`}
        subtitle="Assiduité, conduite, observations — relecture et publication des bulletins de la classe"
        actions={
          <button className="tit__back-btn" onClick={() => navigate(`/teacher/classes/${classId}`)}>
            ← Retour à la classe
          </button>
        }
      />

      <div className="tit__toolbar">
        <div className="tit__term-tabs">
          {TERMS.map((t) => (
            <button
              key={t.value}
              className={`tit__term-btn${term === t.value ? ' tit__term-btn--active' : ''}`}
              onClick={() => { setTerm(t.value); setInitialized(new Set()); }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          className="tit__save-btn"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || students.length === 0}
        >
          {saveMutation.isPending ? 'Enregistrement…' : '💾 Enregistrer tout'}
        </button>
      </div>

      {status && (
        status.allSigned ? (
          <div className="tit__status tit__status--ready">
            <div className="tit__status-text">
              <strong>✅ Toutes les fiches de notes sont signées ({status.signedSubjects}/{status.subjects}).</strong>
              <span>
                {status.reports.review > 0
                  ? `${status.reports.review} bulletin(s) prêt(s) : relisez-les, ajoutez vos observations, puis publiez.`
                  : status.reports.published > 0
                    ? `${status.reports.published} bulletin(s) déjà publié(s) pour ce trimestre.`
                    : 'Les bulletins sont en cours de préparation.'}
              </span>
            </div>
            {status.reports.review > 0 && (
              confirmPublish ? (
                <div className="tit__status-confirm">
                  <span>Publier {status.reports.review} bulletin(s) et les envoyer aux parents ?</span>
                  <button type="button" className="tit__publish-btn" disabled={publishMutation.isPending}
                    onClick={() => { publishMutation.mutate(); setConfirmPublish(false); }}>
                    {publishMutation.isPending ? 'Publication…' : 'Oui, publier'}
                  </button>
                  <button type="button" className="tit__cancel-btn" onClick={() => setConfirmPublish(false)}>Annuler</button>
                </div>
              ) : (
                <button type="button" className="tit__publish-btn" onClick={() => setConfirmPublish(true)}
                  disabled={publishMutation.isPending}>
                  📤 Publier les bulletins de la classe
                </button>
              )
            )}
          </div>
        ) : (
          <div className="tit__status tit__status--waiting">
            <div className="tit__status-text">
              <strong>⏳ Fiches de notes signées : {status.signedSubjects}/{status.subjects}</strong>
              <span>
                Les bulletins seront générés automatiquement dès que tous les professeurs auront signé.
                {status.unsignedSubjects.length > 0 && <> En attente : {status.unsignedSubjects.join(', ')}.</>}
              </span>
            </div>
          </div>
        )
      )}

      {termAttendance.length > 0 && (
        <p className="tit__auto-note">
          Les absences et retards en <span className="tit__auto">vert</span> sont calculés automatiquement
          à partir des feuilles de présence des professeurs et seront reportés sur le bulletin à la publication.
        </p>
      )}

      {reportsLoading ? (
        <Loading />
      ) : students.length === 0 ? (
        <p className="tit__empty">Aucun élève inscrit dans cette classe.</p>
      ) : (
        <div className="tit__table-wrap">
          <table className="tit__table">
            <thead>
              <tr>
                <th className="tit__th tit__th--name">Élève</th>
                <th className="tit__th">Jours</th>
                <th className="tit__th">Présents</th>
                <th className="tit__th">Abs. (j)</th>
                <th className="tit__th">H. Absence</th>
                <th className="tit__th">Retards (h)</th>
                <th className="tit__th">Exclusions</th>
                <th className="tit__th">Avert.</th>
                <th className="tit__th">Fél.</th>
                <th className="tit__th">T. honneur</th>
                <th className="tit__th tit__th--conduct">Conduite</th>
                <th className="tit__th tit__th--comment">Observation</th>
              </tr>
            </thead>
            <tbody>
              {students.map((cs) => {
                const s = cs.student;
                const studentId = s?.id;
                if (!studentId) return null;
                const e = entries[studentId] ?? {};
                const rc = reportsByStudentId.get(studentId);
                const auto = attendanceByStudentId.get(studentId);

                return (
                  <tr key={studentId} className={rc ? '' : 'tit__tr--new'}>
                    <td className="tit__td tit__td--name">
                      <div className="tit__student-name">
                        {s?.user?.name ?? s?.admissionNumber ?? '—'}
                      </div>
                      {!rc && <span className="tit__new-badge">Nouveau</span>}
                    </td>
                    <td className="tit__td">
                      <SmallInput value={e.attendanceDays} onChange={(v) => setField(studentId, 'attendanceDays', v)} />
                    </td>
                    <td className="tit__td">
                      <SmallInput value={e.attendancePresent} onChange={(v) => setField(studentId, 'attendancePresent', v)} />
                    </td>
                    <td className="tit__td">
                      {auto ? (
                        <span className="tit__auto" title="Calculé depuis les feuilles de présence">
                          {auto.absentDays} j
                          {auto.excusedDays > 0 && <small> (+{auto.excusedDays} just.)</small>}
                        </span>
                      ) : (
                        <SmallInput value={e.attendanceAbsent} onChange={(v) => setField(studentId, 'attendanceAbsent', v)} />
                      )}
                    </td>
                    <td className="tit__td">
                      <SmallInput value={e.attendanceAbsentHours} onChange={(v) => setField(studentId, 'attendanceAbsentHours', v)} />
                    </td>
                    <td className="tit__td">
                      {auto ? (
                        <span className="tit__auto" title={`${auto.lateCount} retard(s) — calculé depuis les feuilles de présence`}>
                          {String(Math.round((auto.lateMinutes / 60) * 10) / 10).replace('.', ',')} h
                        </span>
                      ) : (
                        <SmallInput value={e.attendanceLate} onChange={(v) => setField(studentId, 'attendanceLate', v)} />
                      )}
                    </td>
                    <td className="tit__td">
                      <SmallInput value={e.attendanceExcluded} onChange={(v) => setField(studentId, 'attendanceExcluded', v)} />
                    </td>
                    <td className="tit__td">
                      <SmallInput value={e.warnings} onChange={(v) => setField(studentId, 'warnings', v)} width={48} />
                    </td>
                    <td className="tit__td">
                      <SmallInput value={e.commendations} onChange={(v) => setField(studentId, 'commendations', v)} width={48} />
                    </td>
                    <td className="tit__td tit__td--center">
                      <input
                        type="checkbox"
                        className="tit__checkbox"
                        checked={!!e.honorCouncil}
                        onChange={(ev) => setField(studentId, 'honorCouncil', ev.target.checked)}
                      />
                    </td>
                    <td className="tit__td">
                      <select
                        className="tit__conduct-select"
                        value={e.conductRating ?? ''}
                        style={e.conductRating ? { color: CONDUCT_COLOR[e.conductRating] } : {}}
                        onChange={(ev) => setField(studentId, 'conductRating', ev.target.value)}
                      >
                        {CONDUCT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="tit__td tit__td--comment">
                      <div className="tit__comment-cell">
                        <textarea
                          className="tit__comment-input"
                          rows={2}
                          placeholder="Observation du titulaire…"
                          value={e.teacherComment ?? ''}
                          onChange={(ev) => setField(studentId, 'teacherComment', ev.target.value)}
                        />
                        <div className="tit__comment-actions">
                          <button
                            type="button"
                            className="tit__ai-btn"
                            title={rc ? "Proposer une observation d'après les résultats de l'élève" : "Aucun bulletin : les notes ne sont pas encore saisies"}
                            disabled={!rc || rc.status === 'PUBLISHED' || aiLoadingFor === studentId}
                            onClick={() => suggestComment(studentId, rc.id)}
                          >
                            {aiLoadingFor === studentId ? '…' : '✨ IA'}
                          </button>
                          {rc && (
                            <a className="tit__view-link" href={`/reports/${rc.id}/print`} target="_blank" rel="noreferrer"
                              title="Relire le bulletin">
                              👁
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
