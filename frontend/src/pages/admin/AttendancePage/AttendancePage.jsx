import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { classesService } from '../../../services/classesService';
import { attendanceService } from '../../../services/attendanceService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Loading from '../../../components/common/Loading/Loading';
import EmptyState from '../../../components/common/EmptyState/EmptyState';
import { useInstitution } from '../../../context/InstitutionContext';
import './AttendancePage.css';

function rate(v, total) {
  if (!total) return '—';
  return Math.round((v / total) * 100) + '%';
}

export default function AdminAttendancePage() {
  const { institution } = useInstitution();
  const [classId, setClassId] = useState('');
  const [view, setView] = useState('summary'); // 'summary' | 'list'
  const [date, setDate] = useState('');

  const { data: classes = [], isLoading: l1 } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const academicYear = institution?.academicSettings?.academicYear ?? '';

  const { data: summary = [], isLoading: l2 } = useQuery({
    queryKey: ['att-summary', classId, academicYear],
    queryFn: () =>
      attendanceService.summaryByClass(classId, { academicYear }).then((r) => r.data),
    enabled: !!classId && view === 'summary',
  });

  const { data: dayList = [], isLoading: l3 } = useQuery({
    queryKey: ['att-list', classId, date],
    queryFn: () =>
      attendanceService.listByClass(classId, { date }).then((r) => r.data),
    enabled: !!classId && view === 'list' && !!date,
  });

  if (l1) return <AppShell title="Présences"><Loading /></AppShell>;

  return (
    <AppShell title="Présences">
      <PageHeader title="Suivi des présences" subtitle="Consultez le taux de présence par classe" />

      <Card className="att-controls">
        <div className="att-controls__row">
          <div className="att-controls__field">
            <label>Classe</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="att-controls__field">
            <label>Vue</label>
            <select value={view} onChange={(e) => setView(e.target.value)}>
              <option value="summary">Résumé annuel par élève</option>
              <option value="list">Présences d'un jour</option>
            </select>
          </div>
          {view === 'list' && (
            <div className="att-controls__field">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}
        </div>
      </Card>

      {/* Summary view */}
      {view === 'summary' && classId && (
        l2 ? <Loading /> : summary.length === 0 ? (
          <EmptyState message="Aucune donnée de présence pour cette classe." />
        ) : (
          <Card className="att-table-wrap">
            <table className="att-table">
              <thead>
                <tr>
                  <th>Élève</th>
                  <th>Présent</th>
                  <th>Absent</th>
                  <th>Retard</th>
                  <th>Excusé</th>
                  <th>Taux présence</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => {
                  const total = row.present + row.absent + row.late + row.excused;
                  return (
                    <tr key={row.studentId}>
                      <td className="att-table__name">{row.name}</td>
                      <td className="att-table__present">{row.present}</td>
                      <td className="att-table__absent">{row.absent}</td>
                      <td className="att-table__late">{row.late}</td>
                      <td>{row.excused}</td>
                      <td>
                        <div className="att-rate">
                          <div className="att-rate__bar">
                            <div
                              className="att-rate__fill"
                              style={{ width: total ? `${Math.round((row.present / total) * 100)}%` : '0%' }}
                            />
                          </div>
                          <span>{rate(row.present, total)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )
      )}

      {/* Day list view */}
      {view === 'list' && classId && date && (
        l3 ? <Loading /> : dayList.length === 0 ? (
          <EmptyState message="Aucune feuille de présence pour cette date." />
        ) : (
          <Card className="att-table-wrap">
            <table className="att-table">
              <thead>
                <tr>
                  <th>Élève</th>
                  <th>Statut</th>
                  <th>Matière</th>
                  <th>Note</th>
                  <th>Enregistré par</th>
                </tr>
              </thead>
              <tbody>
                {dayList.map((rec) => (
                  <tr key={rec.id}>
                    <td className="att-table__name">{rec.student?.user?.name ?? rec.student?.admissionNumber}</td>
                    <td><span className={`att-pill att-pill--${rec.status.toLowerCase()}`}>{rec.status}</span></td>
                    <td>{rec.subject?.nameFr ?? '—'}</td>
                    <td>{rec.note ?? '—'}</td>
                    <td>{rec.recordedBy ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      {!classId && (
        <EmptyState message="Sélectionnez une classe pour voir les présences." />
      )}
    </AppShell>
  );
}
