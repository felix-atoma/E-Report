import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../../services/analyticsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import StatusPill from '../../../components/common/StatusPill/StatusPill';
import Loading from '../../../components/common/Loading/Loading';
import './AdminDashboardPage.css';

const STAT_ICONS = {
  students: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      <line x1="8" y1="14" x2="16" y2="14"/>
    </svg>
  ),
  teachers: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  classes: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  reports: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
  ),
  collection: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>
      <path d="M7 6h1v4"/>
    </svg>
  ),
  pending: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
};

function StatCard({ label, value, icon, sub, color = 'primary' }) {
  return (
    <Card className="stat-card">
      <div className={`stat-card__icon-wrap stat-card__icon-wrap--${color}`}>
        {STAT_ICONS[icon]}
      </div>
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
        <StatCard label="Élèves"       value={overview?.totalStudents}  icon="students"    color="blue" />
        <StatCard label="Enseignants"  value={overview?.totalTeachers}  icon="teachers"    color="teal" />
        <StatCard label="Classes"      value={overview?.totalClasses}   icon="classes"     color="orange" />
        <StatCard label="Bulletins publiés" value={overview?.publishedReports} icon="reports" color="green" />
        <StatCard
          label="Taux de recouvrement"
          value={collectionRate}
          icon="collection"
          color="teal"
          sub={payments ? `${payments.totalPaid?.toLocaleString('fr-FR')} / ${payments.totalDue?.toLocaleString('fr-FR')} FCFA` : null}
        />
        <StatCard
          label="Paiements en attente"
          value={overview?.pendingPayments}
          icon="pending"
          color="orange"
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
