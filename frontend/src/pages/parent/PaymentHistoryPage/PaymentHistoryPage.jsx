import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { paymentsService } from '../../../services/paymentsService';
import { studentsService } from '../../../services/studentsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Table from '../../../components/common/Table/Table';
import Badge from '../../../components/common/Badge/Badge';
import EmptyState from '../../../components/common/EmptyState/EmptyState';
import './PaymentHistoryPage.css';

const STATUS_KEY = { PAID: 'upToDate', PARTIAL: 'partial', UNPAID: 'unpaid' };

function PaymentHistoryPage() {
  const { t } = useTranslation();
  const locale = 'fr-FR';

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['parent-payments'],
    queryFn: () => paymentsService.myHistory().then((r) => r.data),
  });

  const { data: children = [] } = useQuery({
    queryKey: ['my-children'],
    queryFn: () => studentsService.myChildren().then((r) => r.data),
  });

  const total = payments.reduce((s, p) => s + (p.amount ?? 0), 0);

  const columns = [
    {
      key: 'student',
      label: t('payments.student'),
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
      label: t('payments.amount'),
      render: (p) => (
        <span className="payments-hist__amount">
          {Number(p.amount).toLocaleString(locale)} {t('common.currency')}
        </span>
      ),
    },
    {
      key: 'method',
      label: t('payments.method'),
      render: (p) => {
        const key = p.method ?? '';
        return t(`payment.methods.${key}`, key) || '—';
      },
    },
    {
      key: 'reference',
      label: t('payments.reference'),
      render: (p) => p.reference ?? <span className="payments-hist__empty">—</span>,
    },
    {
      key: 'status',
      label: t('paymentHistory.resultingStatus'),
      render: (p) =>
        p.status ? (
          <Badge variant={
            p.status === 'PAID'    ? 'success' :
            p.status === 'PARTIAL' ? 'warning' : 'danger'
          }>
            {t(`payment.${STATUS_KEY[p.status] ?? p.status}`, p.status)}
          </Badge>
        ) : '—',
    },
    {
      key: 'date',
      label: t('payments.date'),
      render: (p) =>
        p.createdAt ? new Date(p.createdAt).toLocaleDateString(locale) : '—',
    },
  ];

  return (
    <AppShell title={t('nav.paymentHistory')}>
      <PageHeader
        title={t('nav.paymentHistory')}
        subtitle={
          payments.length > 0
            ? `${payments.length} ${t('nav.payments').toLowerCase()} — Total : ${total.toLocaleString(locale)} FCFA`
            : t('payments.noPayments')
        }
      />

      {!isLoading && payments.length === 0 ? (
        <EmptyState
          icon="💳"
          message={t('payments.noPayments')}
          description={t('paymentHistory.noPaymentsDesc')}
        />
      ) : (
        <Table
          columns={columns}
          rows={payments}
          loading={isLoading}
          emptyMessage={t('payments.noPayments')}
        />
      )}
    </AppShell>
  );
}

export default PaymentHistoryPage;
