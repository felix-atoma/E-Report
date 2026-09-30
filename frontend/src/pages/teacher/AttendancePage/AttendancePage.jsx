import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { classesService } from '../../../services/classesService';
import { attendanceService } from '../../../services/attendanceService';
import { timetablesService } from '../../../services/timetablesService';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Loading from '../../../components/common/Loading/Loading';
import EmptyState from '../../../components/common/EmptyState/EmptyState';
import Button from '../../../components/common/Button/Button';
import './AttendancePage.css';

function today() {
  return new Date().toISOString().split('T')[0];
}

const WEEKDAYS = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];

export default function AttendancePage() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  // Arrivée depuis la page d'une classe : ?classId=… présélectionne la classe
  const [selectedClassId, setSelectedClassId] = useState(searchParams.get('classId') ?? '');
  const [date, setDate] = useState(today());
  const [subjectId, setSubjectId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [entries, setEntries] = useState({});
  const [lateMinutes, setLateMinutes] = useState({});

  const STATUS_OPTIONS = [
    { value: 'PRESENT',  label: t('attendance.PRESENT'),  color: '#16a34a' },
    { value: 'ABSENT',   label: t('attendance.ABSENT'),   color: '#dc2626' },
    { value: 'LATE',     label: t('attendance.LATE'),     color: '#d97706' },
    { value: 'EXCUSED',  label: t('attendance.EXCUSED'),  color: '#6b7280' },
  ];

  const { data: pending = [] } = useQuery({
    queryKey: ['att-pending-justifications'],
    queryFn: () => attendanceService.pendingJustifications().then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => attendanceService.approveJustification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['att-pending-justifications'] });
      toast.success(t('common.successSaved'));
    },
    onError: () => toast.error(t('common.errorGeneric')),
  });

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const { data: classDetail, isLoading: loadingClass } = useQuery({
    queryKey: ['class', selectedClassId],
    queryFn: () => classesService.get(selectedClassId).then((r) => r.data),
    enabled: !!selectedClassId,
  });

  // Le titulaire et l'admin peuvent saisir pour toutes les matières (ou la journée entière) ;
  // un professeur de matière uniquement pour les siennes.
  const isTitulaire = user?.role === 'ADMIN' || (classDetail && classDetail.teacherId === user?.id);
  const subjectOptions = (classDetail?.subjects ?? [])
    .filter((cs) => isTitulaire || cs.teacher?.id === user?.id)
    .map((cs) => ({ value: cs.subject.id, label: cs.subject.nameFr }));

  useEffect(() => {
    if (!classDetail) return;
    if (!isTitulaire && subjectOptions.length && !subjectOptions.some((o) => o.value === subjectId)) {
      setSubjectId(subjectOptions[0].value);
    }
  }, [classDetail]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: timetable = [] } = useQuery({
    queryKey: ['timetable', selectedClassId, classDetail?.academicYear],
    queryFn: () => timetablesService.list(selectedClassId, classDetail.academicYear).then((r) => r.data),
    enabled: !!selectedClassId && !!classDetail?.academicYear,
  });

  // Séances de l'emploi du temps pour ce jour et cette matière → proposées comme heure de début
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00`).getDay()];
  const slotOptions = timetable
    .filter((s) => s.dayOfWeek === weekday && (!subjectId || s.subjectId === subjectId))
    .map((s) => ({ value: s.startTime, label: `${s.startTime}–${s.endTime}` }));

  useEffect(() => {
    if (slotOptions.length && !slotOptions.some((o) => o.value === startTime)) {
      setStartTime(slotOptions[0].value);
    }
  }, [subjectId, date, timetable.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const sessionParams = { date, subjectId: subjectId || '', startTime: startTime || '' };

  const { data: existing } = useQuery({
    queryKey: ['attendance', selectedClassId, date, subjectId, startTime],
    queryFn: () => attendanceService.listByClass(selectedClassId, sessionParams).then((r) => r.data),
    enabled: !!selectedClassId && !!date,
  });

  useEffect(() => {
    if (!existing) return;
    const map = {};
    const mins = {};
    existing.forEach((rec) => {
      map[rec.studentId] = rec.status;
      if (rec.minutesLate) mins[rec.studentId] = String(rec.minutesLate);
    });
    setEntries(map);
    setLateMinutes(mins);
  }, [existing]);

  const students = classDetail?.students?.map((cs) => cs.student) ?? [];

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () =>
      attendanceService.bulkUpsert({
        classId: selectedClassId,
        date,
        subjectId: subjectId || undefined,
        startTime: startTime || undefined,
        entries: students.map((s) => {
          const status = entries[s.id] ?? 'PRESENT';
          const mins = Number(lateMinutes[s.id]);
          return {
            studentId: s.id,
            status,
            minutesLate: status === 'LATE' && mins > 0 ? mins : undefined,
          };
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', selectedClassId] });
      toast.success('Présences enregistrées');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur lors de l\'enregistrement'),
  });

  const missingLateMinutes = students.some(
    (s) => entries[s.id] === 'LATE' && !(Number(lateMinutes[s.id]) > 0),
  );

  const setAll = (status) => {
    const map = {};
    students.forEach((s) => { map[s.id] = status; });
    setEntries(map);
  };

  const toggle = (studentId, status) => {
    setEntries((prev) => ({ ...prev, [studentId]: status }));
  };

  const resetSession = () => { setEntries({}); setLateMinutes({}); };

  if (loadingClasses) return <AppShell title="Absences & retards"><Loading /></AppShell>;

  const presentCount = students.filter((s) => (entries[s.id] ?? 'PRESENT') === 'PRESENT').length;
  const absentCount  = students.filter((s) => (entries[s.id] ?? 'PRESENT') === 'ABSENT').length;

  return (
    <AppShell title="Absences & retards">
      <PageHeader
        title="Absences & retards"
        subtitle="Choisissez la classe, la matière et la séance, puis marquez les absents et les retards (en minutes)"
      />

      <Card className="att-controls">
        <div className="att-controls__row">
          <div className="att-controls__field">
            <label>Classe</label>
            <select value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setSubjectId(''); setStartTime(''); resetSession(); }}>
              <option value="">— Sélectionner une classe —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="att-controls__field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); resetSession(); }} />
          </div>
        </div>
        {selectedClassId && classDetail && (
          <div className="att-controls__row att-controls__row--session">
            <div className="att-controls__field">
              <label>Matière / séance</label>
              <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); resetSession(); }}>
                {isTitulaire && <option value="">Journée entière</option>}
                {subjectOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="att-controls__field">
              <label>Heure de début</label>
              {slotOptions.length > 0 ? (
                <select value={startTime} onChange={(e) => { setStartTime(e.target.value); resetSession(); }}>
                  {slotOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input type="time" value={startTime} onChange={(e) => { setStartTime(e.target.value); resetSession(); }} />
              )}
            </div>
          </div>
        )}
        {selectedClassId && classDetail && !isTitulaire && subjectOptions.length === 0 && (
          <p className="att-controls__hint">Aucune matière ne vous est attribuée dans cette classe.</p>
        )}
      </Card>

      {selectedClassId && loadingClass && <Loading />}

      {selectedClassId && !loadingClass && students.length === 0 && (
        <EmptyState message="Aucun élève dans cette classe." />
      )}

      {pending.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <p className="att-section-title">⏳ Justifications en attente ({pending.length})</p>
          <Card className="att-table-wrap">
            <table className="att-table">
              <thead>
                <tr>
                  <th>Élève</th>
                  <th>Classe</th>
                  <th>Date</th>
                  <th>Motif</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((rec) => (
                  <tr key={rec.id}>
                    <td className="att-table__name">{rec.student?.user?.name ?? rec.student?.admissionNumber}</td>
                    <td>{rec.class?.name ?? '—'}</td>
                    <td>{rec.date ? new Date(rec.date).toLocaleDateString('fr-FR') : '—'}</td>
                    <td style={{ fontStyle: 'italic', color: 'var(--color-text-muted,#6b7280)', fontSize: '.85rem' }}>
                      {rec.note?.replace('JUSTIFY_PENDING:', '').trim()}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(rec.id)}
                      >
                        ✅ Approuver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {students.length > 0 && (
        <>
          <div className="att-summary">
            <span className="att-summary__chip att-summary__chip--present">✅ {presentCount} présents</span>
            <span className="att-summary__chip att-summary__chip--absent">❌ {absentCount} absents</span>
            <span className="att-summary__chip att-summary__chip--total">📋 {students.length} élèves</span>
          </div>

          <div className="att-bulk-btns">
            <button type="button" className="att-bulk-btn att-bulk-btn--present" onClick={() => setAll('PRESENT')}>Tous présents</button>
            <button type="button" className="att-bulk-btn att-bulk-btn--absent"  onClick={() => setAll('ABSENT')}>Tous absents</button>
          </div>

          <Card className="att-list">
            {students.map((student, i) => {
              const current = entries[student.id] ?? 'PRESENT';
              return (
                <div key={student.id} className="att-row">
                  <div className="att-row__info">
                    <span className="att-row__num">{i + 1}</span>
                    <div>
                      <strong className="att-row__name">{student.user?.name ?? student.admissionNumber}</strong>
                      <span className="att-row__id">{student.admissionNumber}</span>
                    </div>
                  </div>
                  <div className="att-row__btns">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`att-status-btn${current === opt.value ? ' active' : ''}`}
                        style={current === opt.value ? { '--sc': opt.color } : {}}
                        onClick={() => toggle(student.id, opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                    {current === 'LATE' && (
                      <label className="att-late">
                        <input
                          type="number" min="1" max="600" inputMode="numeric"
                          className="att-late__input"
                          value={lateMinutes[student.id] ?? ''}
                          placeholder="15"
                          onChange={(e) => setLateMinutes((prev) => ({ ...prev, [student.id]: e.target.value }))}
                        />
                        <span>min</span>
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>

          <div className="att-footer">
            {missingLateMinutes && (
              <span className="att-footer__warn">Indiquez la durée (en minutes) de chaque retard.</span>
            )}
            <Button onClick={() => save()} disabled={saving || missingLateMinutes || (!isTitulaire && !subjectId)}>
              {saving ? 'Enregistrement…' : '💾 Enregistrer les présences'}
            </Button>
          </div>
        </>
      )}
    </AppShell>
  );
}
