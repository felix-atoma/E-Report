import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { classesService } from '../../../services/classesService';
import { attendanceService } from '../../../services/attendanceService';
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

export default function AttendancePage() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState({});

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

  const { data: existing = [] } = useQuery({
    queryKey: ['attendance', selectedClassId, date],
    queryFn: () => attendanceService.listByClass(selectedClassId, { date }).then((r) => r.data),
    enabled: !!selectedClassId && !!date,
  });

  useEffect(() => {
    if (!existing.length) return;
    const map = {};
    existing.forEach((rec) => { map[rec.studentId] = rec.status; });
    setEntries(map);
  }, [existing]);

  const students = classDetail?.students?.map((cs) => cs.student) ?? [];

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () =>
      attendanceService.bulkUpsert({
        classId: selectedClassId,
        date,
        entries: students.map((s) => ({
          studentId: s.id,
          status: entries[s.id] ?? 'PRESENT',
        })),
      }),
    onSuccess: () => toast.success('Présences enregistrées'),
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });

  const setAll = (status) => {
    const map = {};
    students.forEach((s) => { map[s.id] = status; });
    setEntries(map);
  };

  const toggle = (studentId, status) => {
    setEntries((prev) => ({ ...prev, [studentId]: status }));
  };

  if (loadingClasses) return <AppShell title="Présences"><Loading /></AppShell>;

  const presentCount = students.filter((s) => (entries[s.id] ?? 'PRESENT') === 'PRESENT').length;
  const absentCount  = students.filter((s) => (entries[s.id] ?? 'PRESENT') === 'ABSENT').length;

  return (
    <AppShell title="Présences">
      <PageHeader
        title="Feuille de présences"
        subtitle="Marquez les présences de votre classe pour chaque séance"
      />

      <Card className="att-controls">
        <div className="att-controls__row">
          <div className="att-controls__field">
            <label>Classe</label>
            <select value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setEntries({}); }}>
              <option value="">— Sélectionner une classe —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="att-controls__field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setEntries({}); }} />
          </div>
        </div>
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
                  </div>
                </div>
              );
            })}
          </Card>

          <div className="att-footer">
            <Button onClick={() => save()} disabled={saving}>
              {saving ? 'Enregistrement…' : '💾 Enregistrer les présences'}
            </Button>
          </div>
        </>
      )}
    </AppShell>
  );
}
