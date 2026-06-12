import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { notificationsService } from '../../../services/notificationsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Table from '../../../components/common/Table/Table';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog';
import Button from '../../../components/common/Button/Button';
import Badge from '../../../components/common/Badge/Badge';
import './NotificationLogsPage.css';

const CHANNEL_LABEL  = { WHATSAPP: 'WhatsApp', EMAIL: 'Email', IN_APP: 'In-app' };
const CHANNEL_VARIANT = { WHATSAPP: 'success', EMAIL: 'info', IN_APP: 'default' };

function NotificationLogsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab]         = useState('held');
  const [confirm, setConfirm] = useState(null);

  const { data: held = [], isLoading: loadingHeld } = useQuery({
    queryKey: ['notifications', 'held'],
    queryFn: () => notificationsService.held().then((r) => r.data),
  });

  const { data: mine = [], isLoading: loadingMine } = useQuery({
    queryKey: ['notifications', 'mine'],
    queryFn: () => notificationsService.mine().then((r) => r.data),
  });

  const forceSend = useMutation({
    mutationFn: (id) => notificationsService.forceSend(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(t('notifLog.toast.sent'));
      setConfirm(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('notifLog.toast.sendError')),
  });

  const sendPaymentLink = useMutation({
    mutationFn: (id) => notificationsService.sendPaymentLink(id),
    onSuccess: () => toast.success(t('notifLog.toast.paymentReminderSent')),
    onError: (err) => toast.error(err?.response?.data?.message ?? t('notifLog.toast.whatsappError')),
  });

  const heldColumns = [
    {
      key: 'student',
      label: t('notifLog.student'),
      render: (n) => (
        <div>
          <div className="notif-table__name">
            {n.student ? (n.student.user?.name ?? n.student.admissionNumber ?? '—') : '—'}
          </div>
          {(n.student?.classes?.[0]?.class?.name ?? n.student?.class?.name) && (
            <div className="notif-table__sub">{n.student.classes?.[0]?.class?.name ?? n.student.class?.name}</div>
          )}
        </div>
      ),
    },
    {
      key: 'channel',
      label: t('notifLog.channel'),
      render: (n) => (
        <Badge variant={CHANNEL_VARIANT[n.channel] ?? 'default'}>
          {CHANNEL_LABEL[n.channel] ?? n.channel}
        </Badge>
      ),
    },
    {
      key: 'reason',
      label: t('notifLog.heldReason'),
      render: (n) => (
        <span className="notif-table__reason">
          {n.heldReason ?? t('notifLog.defaultHeldReason')}
        </span>
      ),
    },
    {
      key: 'report',
      label: t('notifLog.bulletin'),
      render: (n) => n.reportCard?.term ?? n.reportId ?? '—',
    },
    {
      key: 'createdAt',
      label: t('notifLog.waitingSince'),
      render: (n) =>
        n.createdAt
          ? new Date(n.createdAt).toLocaleDateString('fr-FR')
          : '—',
    },
    {
      key: 'actions',
      label: '',
      style: { width: '200px', textAlign: 'right' },
      render: (n) => (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button
            size="sm"
            variant="ghost"
            disabled={sendPaymentLink.isPending}
            onClick={() => sendPaymentLink.mutate(n.id)}
          >
            {t('notifLog.paymentReminder')}
          </Button>
          <Button size="sm" variant="primary" onClick={() => setConfirm(n)}>
            {t('notifLog.forceBtn')}
          </Button>
        </div>
      ),
    },
  ];

  const logColumns = [
    {
      key: 'recipient',
      label: t('notifLog.recipient'),
      render: (n) => (
        <div>
          <div className="notif-table__name">
            {n.student ? (n.student.user?.name ?? n.student.admissionNumber ?? '—') : (n.recipient ?? '—')}
          </div>
          {(n.student?.classes?.[0]?.class?.name ?? n.student?.class?.name) && (
            <div className="notif-table__sub">{n.student.classes?.[0]?.class?.name ?? n.student.class?.name}</div>
          )}
        </div>
      ),
    },
    {
      key: 'channel',
      label: t('notifLog.channel'),
      render: (n) => (
        <Badge variant={CHANNEL_VARIANT[n.channel] ?? 'default'}>
          {CHANNEL_LABEL[n.channel] ?? n.channel}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: t('notifLog.status'),
      render: (n) => (
        <Badge variant={n.status === 'SENT' ? 'success' : n.status === 'FAILED' ? 'danger' : 'default'}>
          {t(`notifLog.statuses.${n.status}`, n.status ?? '—')}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      label: t('notifLog.date'),
      render: (n) =>
        n.createdAt
          ? new Date(n.createdAt).toLocaleDateString('fr-FR')
          : '—',
    },
  ];

  const isLoading = tab === 'held' ? loadingHeld : loadingMine;
  const rows      = tab === 'held' ? held : mine;
  const columns   = tab === 'held' ? heldColumns : logColumns;

  return (
    <AppShell title={t('notifLog.title')}>
      <PageHeader
        title={t('notifLog.title')}
        subtitle={
          tab === 'held'
            ? t('notifLog.heldSubtitle', { count: held.length })
            : t('notifLog.sentSubtitle', { count: mine.length })
        }
      />

      <div className="notif-tabs">
        <button
          className={`notif-tab ${tab === 'held' ? 'notif-tab--active' : ''}`}
          onClick={() => setTab('held')}
        >
          {t('notifLog.tabHeld')}
          {held.length > 0 && <span className="notif-tab__badge">{held.length}</span>}
        </button>
        <button
          className={`notif-tab ${tab === 'log' ? 'notif-tab--active' : ''}`}
          onClick={() => setTab('log')}
        >
          {t('notifLog.tabLog')}
        </button>
      </div>

      <Table
        columns={columns}
        rows={rows}
        loading={isLoading}
        emptyMessage={tab === 'held' ? t('notifLog.heldEmpty') : t('notifLog.logEmpty')}
      />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => forceSend.mutate(confirm.id)}
        loading={forceSend.isPending}
        title={t('notifLog.forceConfirm.title')}
        message={t('notifLog.forceConfirm.message', {
          name: confirm?.student?.user?.name ?? confirm?.student?.admissionNumber ?? '—',
        })}
        confirmLabel={t('notifLog.forceSendBtn')}
        variant="primary"
      />
    </AppShell>
  );
}

export default NotificationLogsPage;
