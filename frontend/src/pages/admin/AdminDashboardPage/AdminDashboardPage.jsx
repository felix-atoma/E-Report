import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { analyticsService } from '../../../services/analyticsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import StatusPill from '../../../components/common/StatusPill/StatusPill';
import Loading from '../../../components/common/Loading/Loading';
import OnboardingWizard from '../../../components/common/OnboardingWizard/OnboardingWizard';
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
  const { t } = useTranslation();
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsService.overview().then((r) => r.data),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const academicYear = overview?.academicYear ?? null;

  const { data: payments } = useQuery({
    queryKey: ['analytics', 'payment-summary', academicYear],
    queryFn: () => analyticsService.paymentSummary({ academicYear }).then((r) => r.data),
    enabled: !!academicYear,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: reports } = useQuery({
    queryKey: ['analytics', 'report-stats', academicYear],
    queryFn: () => analyticsService.reportStats({ academicYear }).then((r) => r.data),
    enabled: !!academicYear,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: records } = useQuery({
    queryKey: ['analytics', 'records-summary'],
    queryFn: () => analyticsService.recordsSummary().then((r) => r.data),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: atRisk } = useQuery({
    queryKey: ['analytics', 'at-risk', academicYear],
    queryFn: () => analyticsService.atRisk(academicYear).then((r) => r.data),
    enabled: !!academicYear,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  if (loadingOverview) return <AppShell title={t('dash.title')}><Loading /></AppShell>;

  const collectionRate =
    payments?.collectionRate != null && Number.isFinite(payments.collectionRate)
      ? `${payments.collectionRate}%`
      : '—';

  const fmt = (n) => (n != null ? Number(n).toLocaleString('fr-FR') : '—');

  return (
    <AppShell title={t('dash.title')}>
      <PageHeader
        title={t('dash.overview')}
        subtitle={academicYear ? t('dash.academicYear', { year: academicYear }) : t('dash.currentYear')}
      />

      <OnboardingWizard stats={overview} />
      <div className="dashboard-stats stagger">
        <StatCard label={t('dash.students')}         value={overview?.totalStudents}    icon="students"    color="blue" />
        <StatCard label={t('dash.teachers')}         value={overview?.totalTeachers}    icon="teachers"    color="teal" />
        <StatCard label={t('dash.classes')}          value={overview?.totalClasses}     icon="classes"     color="orange" />
        <StatCard label={t('dash.publishedReports')} value={overview?.publishedReports} icon="reports"     color="green" />
        <StatCard
          label={t('dash.collectionRate')}
          value={collectionRate}
          icon="collection"
          color="teal"
          sub={payments ? `${fmt(payments.totalPaid)} / ${fmt(payments.totalDue)} FCFA` : null}
        />
        <StatCard
          label={t('dash.remaining')}
          value={payments ? `${fmt(payments.totalPending)} FCFA` : '—'}
          icon="pending"
          color="orange"
        />
      </div>

      <div className="dashboard-grid">
        {payments && (
          <Card className="dashboard-card">
            <h3 className="dashboard-card__title">{t('dash.feeRecovery')}</h3>
            <div className="dashboard-breakdown">
              {[
                { labelKey: 'dash.totalDue',         value: `${fmt(payments.totalDue)} FCFA`,    status: 'PAID' },
                { labelKey: 'dash.collected',         value: `${fmt(payments.totalPaid)} FCFA`,   status: 'PARTIAL' },
                { labelKey: 'dash.toPay',             value: `${fmt(payments.totalPending)} FCFA`, status: 'UNPAID' },
                { labelKey: 'dash.exemptedStudents',  value: `${payments.exemptCount ?? 0}`,       status: 'EXEMPT' },
              ].map(({ labelKey, value, status }) => (
                <div key={status} className="dashboard-breakdown__row">
                  <StatusPill status={status} />
                  <span className="dashboard-breakdown__label">{t(labelKey)}</span>
                  <span className="dashboard-breakdown__count">{value}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {reports && (
          <Card className="dashboard-card">
            <h3 className="dashboard-card__title">{t('dash.reports')}</h3>
            <div className="dashboard-breakdown">
              {[
                { labelKey: 'dash.drafts',   count: reports.draftCount,     status: 'DRAFT' },
                { labelKey: 'dash.inReview', count: reports.reviewCount,    status: 'REVIEW' },
                { labelKey: 'dash.published',count: reports.publishedCount, status: 'PUBLISHED' },
              ].map(({ labelKey, count, status }) => (
                <div key={status} className="dashboard-breakdown__row">
                  <StatusPill status={status} />
                  <span className="dashboard-breakdown__label">{t(labelKey)}</span>
                  <span className="dashboard-breakdown__count">{count ?? 0}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
      {/* ── School Records Summary ── */}
      {records && (
        <div className="dashboard-records">
          <h3 className="dashboard-records__title">Registres Scolaires</h3>
          <div className="dashboard-records__grid">
            <Link to="/admin/disciplinary" className={`rec-tile ${records.disciplinaryUnresolved > 0 ? 'rec-tile--warn' : 'rec-tile--ok'}`}>
              <span className="rec-tile__value">{records.disciplinaryUnresolved}</span>
              <span className="rec-tile__label">Incidents non résolus</span>
            </Link>
            <Link to="/admin/library" className={`rec-tile ${records.overdueLoans > 0 ? 'rec-tile--alert' : 'rec-tile--ok'}`}>
              <span className="rec-tile__value">{records.overdueLoans}</span>
              <span className="rec-tile__label">Prêts en retard</span>
            </Link>
            <Link to="/admin/health" className="rec-tile rec-tile--info">
              <span className="rec-tile__value">{records.healthThisMonth}</span>
              <span className="rec-tile__label">Visites médicales ce mois</span>
            </Link>
            <Link to="/admin/alumni" className="rec-tile rec-tile--blue">
              <span className="rec-tile__value">{records.alumniCount}</span>
              <span className="rec-tile__label">Anciens élèves</span>
            </Link>
            <Link to="/admin/transfers" className="rec-tile rec-tile--blue">
              <span className="rec-tile__value">{records.transfersThisYear}</span>
              <span className="rec-tile__label">Transferts cette année</span>
            </Link>
            <Link to="/admin/inventory" className="rec-tile rec-tile--info">
              <span className="rec-tile__value">{records.inventoryActive}</span>
              <span className="rec-tile__label">Articles inventaire</span>
            </Link>
            {records.examTotal > 0 && (
              <Link to="/admin/national-exams" className={`rec-tile ${records.examPassRate >= 50 ? 'rec-tile--ok' : 'rec-tile--warn'}`}>
                <span className="rec-tile__value">{records.examPassRate}%</span>
                <span className="rec-tile__label">Taux réussite examens</span>
              </Link>
            )}
          </div>
        </div>
      )}
      {/* ── At-risk students alert ── */}
      {atRisk?.count > 0 && (
        <Card style={{ marginTop: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.4rem' }}>⚠️</span>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
                {atRisk.count} élève{atRisk.count > 1 ? 's' : ''} en difficulté — {atRisk.academicYear}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Moyenne en baisse de plus de 1,5 point ou en dessous de 10
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {atRisk.students.slice(0, 8).map((s) => (
              <div key={s.studentId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.82rem', padding: '0.3rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.isFailingNow ? '#dc2626' : '#f59e0b', flexShrink: 0 }} />
                <span style={{ flex: 1, fontWeight: 600 }}>{s.studentName}</span>
                <span style={{ color: '#6b7280' }}>{s.className}</span>
                <span style={{ color: '#dc2626', fontWeight: 700, fontFamily: 'monospace' }}>
                  {s.previousAvg.toFixed(2)} → {s.currentAvg.toFixed(2)}
                </span>
                <span style={{ background: s.isFailingNow ? '#fef2f2' : '#fefce8', color: s.isFailingNow ? '#dc2626' : '#92400e', fontWeight: 700, fontSize: '0.72rem', padding: '1px 6px', borderRadius: 4 }}>
                  {s.isFailingNow ? 'Échec' : `−${s.drop.toFixed(2)}`}
                </span>
              </div>
            ))}
            {atRisk.count > 8 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                + {atRisk.count - 8} autre{atRisk.count - 8 > 1 ? 's' : ''} élèves
              </p>
            )}
          </div>
        </Card>
      )}
    </AppShell>
  );
}

export default AdminDashboardPage;
