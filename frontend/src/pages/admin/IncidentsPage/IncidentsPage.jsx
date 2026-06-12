import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { incidentReportsService } from '../../../services/incidentReportsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Select from '../../../components/common/Select/Select';
import Textarea from '../../../components/common/Textarea/Textarea';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Loading from '../../../components/common/Loading/Loading';
import './IncidentsPage.css';

const STATUS_KEYS = ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'];
const STATUS_CLS  = {
  PENDING:      'inc-status--pending',
  UNDER_REVIEW: 'inc-status--review',
  RESOLVED:     'inc-status--resolved',
  DISMISSED:    'inc-status--dismissed',
};

export default function IncidentsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected]         = useState(null);
  const [newStatus, setNewStatus]       = useState('');
  const [adminNotes, setAdminNotes]     = useState('');

  const statusOptions = [
    { value: '', label: t('incidents.allStatuses') },
    ...STATUS_KEYS.map((k) => ({ value: k, label: t(`incidents.status.${k}`) })),
  ];

  const newStatusOptions = STATUS_KEYS.map((k) => ({
    value: k, label: t(`incidents.status.${k}`),
  }));

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['incidents', statusFilter],
    queryFn: () => incidentReportsService.list(statusFilter ? { status: statusFilter } : {}).then((r) => r.data),
    staleTime: 0,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => incidentReportsService.updateStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(t('incidents.toast.updated'));
      setSelected(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('incidents.toast.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => incidentReportsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(t('incidents.toast.deleted'));
      setSelected(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('incidents.toast.error')),
  });

  function openDetail(report) {
    setSelected(report);
    setNewStatus(report.status);
    setAdminNotes(report.adminNotes ?? '');
  }

  function handleUpdate() {
    updateMutation.mutate({ id: selected.id, data: { status: newStatus, adminNotes } });
  }

  const pending = reports.filter((r) => r.status === 'PENDING').length;

  const subtitle = t('incidents.subtitle', { count: reports.length })
    + (pending > 0 ? t('incidents.pending', { count: pending }) : '');

  return (
    <AppShell title={t('incidents.title')}>
      <PageHeader
        title={t('incidents.title')}
        subtitle={subtitle}
      />

      <div className="inc-toolbar">
        <Select
          id="inc-status-filter"
          label=""
          value={statusFilter}
          options={statusOptions}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        <div className="inc-legend">
          {STATUS_KEYS.map((k) => (
            <span key={k} className={`inc-status ${STATUS_CLS[k]}`}>
              {t(`incidents.status.${k}`)} ({reports.filter((r) => r.status === k).length})
            </span>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Loading />
      ) : reports.length === 0 ? (
        <div className="inc-empty">
          <div className="inc-empty__icon">🛡️</div>
          <p>{statusFilter ? t('incidents.emptyStatus') : t('incidents.empty')}</p>
        </div>
      ) : (
        <div className="inc-list">
          {reports.map((r) => {
            const reporter = r.anonymous ? t('incidents.anonymous') : (r.reportedBy?.name ?? '—');
            const roleLabel = r.reportedBy?.role === 'TEACHER' ? t('incidents.teacher') : t('incidents.student');
            return (
              <Card key={r.id} className="inc-card" onClick={() => openDetail(r)}>
                <div className="inc-card__header">
                  <div className="inc-card__meta">
                    <span className="inc-card__cat">{t(`incidents.category.${r.category}`, r.category)}</span>
                    <span className={`inc-status ${STATUS_CLS[r.status] ?? STATUS_CLS.PENDING}`}>
                      {t(`incidents.status.${r.status}`, r.status)}
                    </span>
                  </div>
                  <span className="inc-card__date">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
                <h4 className="inc-card__title">{r.title}</h4>
                <div className="inc-card__info">
                  <span>{t('incidents.concerning')} <strong>{r.accusedName}</strong> ({r.accusedRole})</span>
                  <span>{t('incidents.reportedBy')} <strong>{reporter}</strong>{r.reportedBy?.role ? ` — ${roleLabel}` : ''}</span>
                </div>
                <p className="inc-card__desc">{r.description.length > 160 ? r.description.slice(0, 160) + '…' : r.description}</p>
              </Card>
            );
          })}
        </div>
      )}

      {selected && (
        <OffCanvas
          open
          onClose={() => setSelected(null)}
          title={t('incidents.detail.title')}
          size="md"
          footer={
            <>
              <Button
                variant="danger"
                size="sm"
                onClick={() => { if (window.confirm(t('incidents.confirmDelete'))) deleteMutation.mutate(selected.id); }}
                disabled={deleteMutation.isPending}
              >
                {t('incidents.delete')}
              </Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>{t('action.close')}</Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? t('action.saving') : t('action.save')}
              </Button>
            </>
          }
        >
          <div className="inc-detail">
            <div className="inc-detail__row">
              <span className="inc-detail__label">{t('incidents.detail.category')}</span>
              <span className="inc-detail__value">{t(`incidents.category.${selected.category}`, selected.category)}</span>
            </div>
            <div className="inc-detail__row">
              <span className="inc-detail__label">{t('incidents.detail.concerning')}</span>
              <span className="inc-detail__value"><strong>{selected.accusedName}</strong> — {selected.accusedRole}</span>
            </div>
            <div className="inc-detail__row">
              <span className="inc-detail__label">{t('incidents.detail.reportedBy')}</span>
              <span className="inc-detail__value">
                {selected.anonymous ? t('incidents.anonymous') : selected.reportedBy?.name ?? '—'}
                {!selected.anonymous && selected.reportedBy?.role && (
                  <span style={{ color: '#9ca3af', marginLeft: 4 }}>
                    ({selected.reportedBy.role === 'TEACHER' ? t('incidents.teacher') : t('incidents.student')})
                  </span>
                )}
              </span>
            </div>
            <div className="inc-detail__row">
              <span className="inc-detail__label">{t('incidents.detail.date')}</span>
              <span className="inc-detail__value">{new Date(selected.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>

            <div className="inc-detail__section">
              <div className="inc-detail__label">{t('incidents.detail.subject')}</div>
              <p className="inc-detail__title">{selected.title}</p>
            </div>

            <div className="inc-detail__section">
              <div className="inc-detail__label">{t('incidents.detail.description')}</div>
              <p className="inc-detail__desc">{selected.description}</p>
            </div>

            <div className="inc-detail__divider" />

            <Select
              id="inc-new-status"
              label={t('incidents.detail.changeStatus')}
              value={newStatus}
              options={newStatusOptions}
              onChange={(e) => setNewStatus(e.target.value)}
            />

            <Textarea
              id="inc-admin-notes"
              label={t('incidents.detail.adminNotes')}
              rows={4}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={t('incidents.detail.adminNotesPlaceholder')}
            />
          </div>
        </OffCanvas>
      )}
    </AppShell>
  );
}
