import { useState, useContext, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { classesService } from '../../../services/classesService';
import { reportsService } from '../../../services/reportsService';
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
        subtitle="Assiduité, conduite et discipline par élève"
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
                <th className="tit__th">Retards</th>
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
                      <SmallInput value={e.attendanceAbsent} onChange={(v) => setField(studentId, 'attendanceAbsent', v)} />
                    </td>
                    <td className="tit__td">
                      <SmallInput value={e.attendanceAbsentHours} onChange={(v) => setField(studentId, 'attendanceAbsentHours', v)} />
                    </td>
                    <td className="tit__td">
                      <SmallInput value={e.attendanceLate} onChange={(v) => setField(studentId, 'attendanceLate', v)} />
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
                      <input
                        type="text"
                        className="tit__comment-input"
                        placeholder="Observation…"
                        value={e.teacherComment ?? ''}
                        onChange={(ev) => setField(studentId, 'teacherComment', ev.target.value)}
                      />
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
