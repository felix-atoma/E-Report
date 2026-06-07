import { useState } from 'react';
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
      toast.success('Notification envoyée');
      setConfirm(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur d\'envoi'),
  });

  const sendPaymentLink = useMutation({
    mutationFn: (id) => notificationsService.sendPaymentLink(id),
    onSuccess: () => toast.success('Rappel de paiement envoyé sur WhatsApp'),
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur d\'envoi WhatsApp'),
  });

  const heldColumns = [
    {
      key: 'student',
      label: 'Élève',
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
      label: 'Canal',
      render: (n) => (
        <Badge variant={CHANNEL_VARIANT[n.channel] ?? 'default'}>
          {CHANNEL_LABEL[n.channel] ?? n.channel}
        </Badge>
      ),
    },
    {
      key: 'reason',
      label: 'Raison du blocage',
      render: (n) => (
        <span className="notif-table__reason">
          {n.heldReason ?? 'Frais impayés'}
        </span>
      ),
    },
    {
      key: 'report',
      label: 'Bulletin',
      render: (n) => n.reportCard?.term ?? n.reportId ?? '—',
    },
    {
      key: 'createdAt',
      label: 'En attente depuis',
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
            title="Envoyer un rappel de paiement sur WhatsApp au parent"
          >
            💬 Rappel paiement
          </Button>
          <Button size="sm" variant="primary" onClick={() => setConfirm(n)}>
            Forcer l'envoi
          </Button>
        </div>
      ),
    },
  ];

  const logColumns = [
    {
      key: 'recipient',
      label: 'Destinataire',
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
      label: 'Canal',
      render: (n) => (
        <Badge variant={CHANNEL_VARIANT[n.channel] ?? 'default'}>
          {CHANNEL_LABEL[n.channel] ?? n.channel}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (n) => (
        <Badge variant={n.status === 'SENT' ? 'success' : n.status === 'FAILED' ? 'danger' : 'default'}>
          {n.status === 'SENT' ? 'Envoyé' : n.status === 'FAILED' ? 'Échec' : n.status ?? '—'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
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
    <AppShell title="Notifications">
      <PageHeader
        title="Notifications"
        subtitle={
          tab === 'held'
            ? `${held.length} notification${held.length !== 1 ? 's' : ''} en attente`
            : `${mine.length} notification${mine.length !== 1 ? 's' : ''} envoyées`
        }
      />

      <div className="notif-tabs">
        <button
          className={`notif-tab ${tab === 'held' ? 'notif-tab--active' : ''}`}
          onClick={() => setTab('held')}
        >
          En attente
          {held.length > 0 && <span className="notif-tab__badge">{held.length}</span>}
        </button>
        <button
          className={`notif-tab ${tab === 'log' ? 'notif-tab--active' : ''}`}
          onClick={() => setTab('log')}
        >
          Journal
        </button>
      </div>

      <Table
        columns={columns}
        rows={rows}
        loading={isLoading}
        emptyMessage={
          tab === 'held'
            ? 'Aucune notification en attente — tous les bulletins ont été envoyés'
            : 'Aucune notification dans le journal'
        }
      />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => forceSend.mutate(confirm.id)}
        loading={forceSend.isPending}
        title="Forcer l'envoi"
        message={`Envoyer le bulletin de ${confirm?.student?.user?.name ?? confirm?.student?.admissionNumber ?? 'cet élève'} maintenant, même si les frais ne sont pas à jour ?`}
        confirmLabel="Envoyer"
        variant="primary"
      />
    </AppShell>
  );
}

export default NotificationLogsPage;
