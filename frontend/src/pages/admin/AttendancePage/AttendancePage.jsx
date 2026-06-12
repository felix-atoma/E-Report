import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { classesService } from '../../../services/classesService';
import { attendanceService } from '../../../services/attendanceService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Loading from '../../../components/common/Loading/Loading';
import EmptyState from '../../../components/common/EmptyState/EmptyState';
import { useInstitution } from '../../../context/InstitutionContext';
import './AttendancePage.css';

function rate(v, total) {
  if (!total) return '—';
  return Math.round((v / total) * 100) + '%';
}

export default function AdminAttendancePage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { institution } = useInstitution();
  const [classId, setClassId] = useState('');
  const [view, setView] = useState('summary');
  const [date, setDate] = useState('');

  const { data: pending = [], isLoading: loadingPending } = useQuery({
    queryKey: ['att-pending-justifications'],
    queryFn: () => attendanceService.pendingJustifications().then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => attendanceService.approveJustification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['att-pending-justifications'] });
      toast.success(t('attendance.approved'));
    },
    onError: () => toast.error(t('attendance.approveError')),
  });

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

  if (l1) return <AppShell title={t('attendance.pageTitle')}><Loading /></AppShell>;

  return (
    <AppShell title={t('attendance.pageTitle')}>
      <PageHeader title={t('attendance.trackTitle')} subtitle={t('attendance.trackSubtitle')} />

      <Card className="att-controls">
        <div className="att-controls__row">
          <div className="att-controls__field">
            <label>{t('attendance.class')}</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">— {t('common.all')} —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="att-controls__field">
            <label>{t('attendance.view')}</label>
            <select value={view} onChange={(e) => setView(e.target.value)}>
              <option value="summary">{t('attendance.annualSummary')}</option>
              <option value="list">{t('attendance.dayList')}</option>
            </select>
          </div>
          {view === 'list' && (
            <div className="att-controls__field">
              <label>{t('attendance.date')}</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}
        </div>
      </Card>

      {view === 'summary' && classId && (
        l2 ? <Loading /> : summary.length === 0 ? (
          <EmptyState message={t('attendance.noData')} />
        ) : (
          <Card className="att-table-wrap">
            <table className="att-table">
              <thead>
                <tr>
                  <th>{t('students.title')}</th>
                  <th>{t('attendance.PRESENT')}</th>
                  <th>{t('attendance.ABSENT')}</th>
                  <th>{t('attendance.LATE')}</th>
                  <th>{t('attendance.EXCUSED')}</th>
                  <th>{t('attendance.rate')}</th>
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

      {view === 'list' && classId && date && (
        l3 ? <Loading /> : dayList.length === 0 ? (
          <EmptyState message={t('attendance.noDataDay')} />
        ) : (
          <Card className="att-table-wrap">
            <table className="att-table">
              <thead>
                <tr>
                  <th>{t('students.title')}</th>
                  <th>{t('attendance.status')}</th>
                  <th>{t('attendance.subject')}</th>
                  <th>{t('attendance.note')}</th>
                  <th>{t('attendance.recordedBy')}</th>
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
        <EmptyState message={t('attendance.selectClass')} />
      )}

      {(loadingPending || pending.length > 0) && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 className="att-section-title">
            {t('attendance.justificationsTitle', { count: pending.length })}
          </h3>
          {loadingPending ? <Loading /> : (
            <Card className="att-table-wrap">
              <table className="att-table">
                <thead>
                  <tr>
                    <th>{t('students.title')}</th>
                    <th>{t('classes.title')}</th>
                    <th>{t('attendance.date')}</th>
                    <th>{t('attendance.motive')}</th>
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
                          ✅ {t('attendance.approve')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}
