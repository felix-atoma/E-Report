import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { analyticsService } from '../../../services/analyticsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Loading from '../../../components/common/Loading/Loading';
import './AnalyticsPage.css';

const PAYMENT_COLORS = {
  PAID:    '#22c55e',
  PARTIAL: '#f59e0b',
  UNPAID:  '#ef4444',
  EXEMPT:  '#9ca3af',
};

const PAYMENT_LABELS = {
  PAID:    'À jour',
  PARTIAL: 'Partiel',
  UNPAID:  'Non payé',
  EXEMPT:  'Exonéré',
};

const REPORT_COLORS = {
  DRAFT:     '#9ca3af',
  REVIEW:    '#f59e0b',
  PUBLISHED: '#3b82f6',
};

const REPORT_LABELS = {
  DRAFT:     'Brouillons',
  REVIEW:    'En révision',
  PUBLISHED: 'Publiés',
};

function StatCard({ label, value, icon, sub }) {
  return (
    <Card className="analytics-stat">
      <div className="analytics-stat__icon">{icon}</div>
      <div className="analytics-stat__body">
        <span className="analytics-stat__value">{value ?? '—'}</span>
        <span className="analytics-stat__label">{label}</span>
        {sub && <span className="analytics-stat__sub">{sub}</span>}
      </div>
    </Card>
  );
}

function AnalyticsPage() {
  const { data: overview, isLoading: l1 } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsService.overview().then((r) => r.data),
  });

  const { data: payments, isLoading: l2 } = useQuery({
    queryKey: ['analytics', 'payment-summary'],
    queryFn: () => analyticsService.paymentSummary().then((r) => r.data),
  });

  const { data: reports, isLoading: l3 } = useQuery({
    queryKey: ['analytics', 'report-stats'],
    queryFn: () => analyticsService.reportStats().then((r) => r.data),
  });

  const isLoading = l1 || l2 || l3;

  if (isLoading) {
    return (
      <AppShell title="Analytiques">
        <Loading />
      </AppShell>
    );
  }

  const paymentPieData = payments
    ? [
        { name: PAYMENT_LABELS.PAID,    value: payments.paidCount    ?? 0, key: 'PAID'    },
        { name: PAYMENT_LABELS.PARTIAL, value: payments.partialCount ?? 0, key: 'PARTIAL' },
        { name: PAYMENT_LABELS.UNPAID,  value: payments.unpaidCount  ?? 0, key: 'UNPAID'  },
        { name: PAYMENT_LABELS.EXEMPT,  value: payments.exemptCount  ?? 0, key: 'EXEMPT'  },
      ].filter((d) => d.value > 0)
    : [];

  const reportBarData = reports
    ? [
        { name: REPORT_LABELS.DRAFT,     count: reports.draftCount     ?? 0, fill: REPORT_COLORS.DRAFT     },
        { name: REPORT_LABELS.REVIEW,    count: reports.reviewCount    ?? 0, fill: REPORT_COLORS.REVIEW    },
        { name: REPORT_LABELS.PUBLISHED, count: reports.publishedCount ?? 0, fill: REPORT_COLORS.PUBLISHED },
      ]
    : [];

  const collectionRate = payments?.collectionRate != null
    ? `${Math.round(payments.collectionRate)}%`
    : '—';

  const totalDue  = payments?.totalDue  != null ? payments.totalDue.toLocaleString('fr-FR')  : null;
  const totalPaid = payments?.totalPaid != null ? payments.totalPaid.toLocaleString('fr-FR') : null;

  return (
    <AppShell title="Analytiques">
      <PageHeader title="Tableau de bord analytique" subtitle="Année scolaire en cours" />

      {/* KPIs */}
      <div className="analytics-kpis">
        <StatCard label="Élèves"         value={overview?.totalStudents}    icon="🎒" />
        <StatCard label="Enseignants"     value={overview?.totalTeachers}    icon="👩‍🏫" />
        <StatCard label="Classes"         value={overview?.totalClasses}     icon="🏫" />
        <StatCard label="Bulletins publiés" value={overview?.publishedReports} icon="📋" />
        <StatCard
          label="Taux de recouvrement"
          value={collectionRate}
          icon="💰"
          sub={totalPaid && totalDue ? `${totalPaid} / ${totalDue} FCFA` : null}
        />
        <StatCard label="En attente paiement" value={overview?.pendingPayments} icon="⏳" />
      </div>

      <div className="analytics-charts">
        {/* Payment pie */}
        <Card className="analytics-chart-card">
          <h3 className="analytics-chart-card__title">Statut des paiements</h3>
          {paymentPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={paymentPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {paymentPieData.map((entry) => (
                    <Cell key={entry.key} fill={PAYMENT_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v} élèves`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="analytics-empty">Aucune donnée de paiement disponible</p>
          )}
        </Card>

        {/* Report bar */}
        <Card className="analytics-chart-card">
          <h3 className="analytics-chart-card__title">État des bulletins</h3>
          {reportBarData.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={reportBarData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Bulletins" radius={[4, 4, 0, 0]}>
                  {reportBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="analytics-empty">Aucun bulletin créé</p>
          )}
        </Card>

        {/* Collection summary */}
        {payments && (
          <Card className="analytics-chart-card analytics-chart-card--wide">
            <h3 className="analytics-chart-card__title">Recouvrement des frais</h3>
            <div className="analytics-collection">
              <div className="analytics-collection__bar-wrap">
                <div
                  className="analytics-collection__bar"
                  style={{ width: `${Math.min(payments.collectionRate ?? 0, 100)}%` }}
                />
              </div>
              <div className="analytics-collection__meta">
                <span className="analytics-collection__rate">{collectionRate} collecté</span>
                {totalPaid && totalDue && (
                  <span className="analytics-collection__detail">
                    {totalPaid} FCFA sur {totalDue} FCFA attendus
                  </span>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

export default AnalyticsPage;
