import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../../services/analyticsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import StatusPill from '../../../components/common/StatusPill/StatusPill';
import Loading from '../../../components/common/Loading/Loading';
import './AdminDashboardPage.css';

function StatCard({ label, value, icon, sub }) {
  return (
    <Card className="stat-card">
      <div className="stat-card__icon">{icon}</div>
      <div className="stat-card__body">
        <span className="stat-card__value">{value ?? '—'}</span>
        <span className="stat-card__label">{label}</span>
        {sub && <span className="stat-card__sub">{sub}</span>}
      </div>
    </Card>
  );
}

function AdminDashboardPage() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsService.overview().then((r) => r.data),
  });

  const { data: payments } = useQuery({
    queryKey: ['analytics', 'payment-summary'],
    queryFn: () => analyticsService.paymentSummary().then((r) => r.data),
  });

  const { data: reports } = useQuery({
    queryKey: ['analytics', 'report-stats'],
    queryFn: () => analyticsService.reportStats().then((r) => r.data),
  });

  if (loadingOverview) return <AppShell title="Tableau de bord"><Loading /></AppShell>;

  const collectionRate = payments?.collectionRate != null
    ? `${Math.round(payments.collectionRate)}%`
    : '—';

  return (
    <AppShell title="Tableau de bord">
      <PageHeader title="Vue d'ensemble" subtitle={`Année scolaire en cours`} />

      <div className="dashboard-stats">
        <StatCard label="Élèves"       value={overview?.totalStudents}  icon="🎒" />
        <StatCard label="Enseignants"  value={overview?.totalTeachers}  icon="👩‍🏫" />
        <StatCard label="Classes"      value={overview?.totalClasses}   icon="🏫" />
        <StatCard label="Bulletins publiés" value={overview?.publishedReports} icon="📋" />
        <StatCard
          label="Taux de recouvrement"
          value={collectionRate}
          icon="💰"
          sub={payments ? `${payments.totalPaid?.toLocaleString('fr-FR')} / ${payments.totalDue?.toLocaleString('fr-FR')} FCFA` : null}
        />
        <StatCard
          label="Paiements en attente"
          value={overview?.pendingPayments}
          icon="⏳"
        />
      </div>

      <div className="dashboard-grid">
        {/* Payment breakdown */}
        {payments && (
          <Card className="dashboard-card">
            <h3 className="dashboard-card__title">Statut des paiements</h3>
            <div className="dashboard-breakdown">
              {[
                { label: 'À jour',   count: payments.paidCount,    status: 'PAID' },
                { label: 'Partiel',  count: payments.partialCount, status: 'PARTIAL' },
                { label: 'Non payé', count: payments.unpaidCount,  status: 'UNPAID' },
                { label: 'Exonéré', count: payments.exemptCount,  status: 'EXEMPT' },
              ].map(({ label, count, status }) => (
                <div key={status} className="dashboard-breakdown__row">
                  <StatusPill status={status} />
                  <span className="dashboard-breakdown__count">{count ?? 0} élèves</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Report card status */}
        {reports && (
          <Card className="dashboard-card">
            <h3 className="dashboard-card__title">Bulletins</h3>
            <div className="dashboard-breakdown">
              {[
                { label: 'Brouillons', count: reports.draftCount,     status: 'DRAFT' },
                { label: 'En révision', count: reports.reviewCount,   status: 'REVIEW' },
                { label: 'Publiés',    count: reports.publishedCount, status: 'PUBLISHED' },
              ].map(({ label, count, status }) => (
                <div key={status} className="dashboard-breakdown__row">
                  <StatusPill status={status} />
                  <span className="dashboard-breakdown__count">{count ?? 0}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

export default AdminDashboardPage;
