import { useQuery } from '@tanstack/react-query';
import { paymentsService } from '../../../services/paymentsService';
import { studentsService } from '../../../services/studentsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Table from '../../../components/common/Table/Table';
import Badge from '../../../components/common/Badge/Badge';
import EmptyState from '../../../components/common/EmptyState/EmptyState';
import './PaymentHistoryPage.css';

const METHOD_LABEL = {
  CASH:     'Espèces',
  TMONEY:   'TMoney',
  FLOOZ:    'Flooz',
  MOMO:     'MoMo',
  TRANSFER: 'Virement',
  CHEQUE:   'Chèque',
  OTHER:    'Autre',
};

function PaymentHistoryPage() {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['parent-payments'],
    queryFn: () => paymentsService.list().then((r) => r.data),
  });

  const { data: children = [] } = useQuery({
    queryKey: ['my-children'],
    queryFn: () => studentsService.list().then((r) => r.data),
  });

  const total = payments.reduce((s, p) => s + (p.amount ?? 0), 0);

  const columns = [
    {
      key: 'student',
      label: 'Élève',
      render: (p) => {
        const child = children.find((c) => c.id === p.studentId);
        const name  = child
          ? (child.user?.name ?? child.admissionNumber ?? '—')
          : p.student
            ? (p.student.user?.name ?? p.student.admissionNumber ?? '—')
            : '—';
        return <span className="payments-hist__name">{name}</span>;
      },
    },
    {
      key: 'amount',
      label: 'Montant',
      render: (p) => (
        <span className="payments-hist__amount">
          {Number(p.amount).toLocaleString('fr-FR')} FCFA
        </span>
      ),
    },
    {
      key: 'method',
      label: 'Méthode',
      render: (p) => METHOD_LABEL[p.method] ?? p.method ?? '—',
    },
    {
      key: 'reference',
      label: 'Référence',
      render: (p) => p.reference ?? <span className="payments-hist__empty">—</span>,
    },
    {
      key: 'status',
      label: 'Statut résultant',
      render: (p) =>
        p.status
          ? <Badge variant={
              p.status === 'PAID'    ? 'success' :
              p.status === 'PARTIAL' ? 'warning' : 'danger'
            }>
              {p.status === 'PAID' ? 'À jour' : p.status === 'PARTIAL' ? 'Partiel' : 'Non payé'}
            </Badge>
          : '—',
    },
    {
      key: 'date',
      label: 'Date',
      render: (p) =>
        p.createdAt
          ? new Date(p.createdAt).toLocaleDateString('fr-FR')
          : '—',
    },
  ];

  return (
    <AppShell title="Historique des paiements">
      <PageHeader
        title="Historique des paiements"
        subtitle={
          payments.length > 0
            ? `${payments.length} paiement${payments.length !== 1 ? 's' : ''} — Total : ${total.toLocaleString('fr-FR')} FCFA`
            : 'Aucun paiement enregistré'
        }
      />

      {!isLoading && payments.length === 0 ? (
        <EmptyState
          icon="💳"
          message="Aucun paiement enregistré"
          description="Les paiements effectués pour vos enfants apparaîtront ici."
        />
      ) : (
        <Table
          columns={columns}
          rows={payments}
          loading={isLoading}
          emptyMessage="Aucun paiement enregistré"
        />
      )}
    </AppShell>
  );
}

export default PaymentHistoryPage;
