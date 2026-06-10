import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { studentsService } from '../../../services/studentsService';
import { reportsService } from '../../../services/reportsService';
import { bulletinsService } from '../../../services/bulletinsService';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Avatar from '../../../components/common/Avatar/Avatar';
import Badge from '../../../components/common/Badge/Badge';
import StatusPill from '../../../components/common/StatusPill/StatusPill';
import Loading from '../../../components/common/Loading/Loading';
import './ParentDashboardPage.css';

const PAYMENT_VARIANT = { PAID: 'success', PARTIAL: 'warning', UNPAID: 'danger', EXEMPT: 'default' };

function ParentDashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const PAYMENT_LABEL = {
    PAID:    t('payment.upToDate'),
    PARTIAL: t('payment.partial'),
    UNPAID:  t('payment.unpaid'),
    EXEMPT:  t('payment.exempted'),
  };

  const { data: children = [], isLoading: l1 } = useQuery({
    queryKey: ['my-children'],
    queryFn: () => studentsService.myChildren().then((r) => r.data),
  });

  const { data: reports = [], isLoading: l2 } = useQuery({
    queryKey: ['parent-reports'],
    queryFn: () => reportsService.list().then((r) => r.data),
  });

  const { data: bulletins = [] } = useQuery({
    queryKey: ['bulletins'],
    queryFn: () => bulletinsService.list().then((r) => r.data),
  });

  if (l1 || l2) return <AppShell title={t('dash.title')}><Loading /></AppShell>;

  const published = reports.filter((r) => r.status === 'PUBLISHED');
  const held      = reports.filter((r) => r.status === 'PUBLISHED' && (r.deliveryStatus === 'HELD_UNPAID' || r.deliveryStatus === 'HELD_PARTIAL'));

  return (
    <AppShell title={t('dash.title')}>
      <PageHeader
        title={t('dash.hello', { name: user?.name ?? t('role.PARENT') })}
        subtitle={t('dash.followChildren')}
      />

      <div className="parent-dash__stats">
        <Card className="parent-dash__stat">
          <div className="parent-dash__stat-icon parent-dash__stat-icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <span className="parent-dash__stat-value">{children.length}</span>
          <span className="parent-dash__stat-label">{t('dash.childCount', { count: children.length })}</span>
        </Card>
        <Card className="parent-dash__stat">
          <div className="parent-dash__stat-icon parent-dash__stat-icon--teal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
          </div>
          <span className="parent-dash__stat-value">{published.length}</span>
          <span className="parent-dash__stat-label">{t('dash.bulletinCount', { count: published.length })}</span>
        </Card>
        <Card className="parent-dash__stat">
          <div className="parent-dash__stat-icon parent-dash__stat-icon--orange">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <span className="parent-dash__stat-value">{held.length}</span>
          <span className="parent-dash__stat-label">{t('dash.pendingPayment')}</span>
        </Card>
      </div>

      <div className="parent-dash__grid">
        <Card className="parent-dash__card">
          <div className="parent-dash__card-head">
            <h3 className="parent-dash__card-title">{t('dash.myChildren')}</h3>
            <Link to="/parent/children" className="parent-dash__see-all">{t('action.viewAll')}</Link>
          </div>
          {children.length === 0 ? (
            <p className="parent-dash__empty">{t('dash.noChildren')}</p>
          ) : (
            <div className="parent-dash__children-list">
              {children.map((child) => {
                const cls      = child.classes?.[0]?.class;
                const lastRep  = child.reportCards?.[0];
                const balance  = child.feeBalance;
                const locale   = navigator.language || 'fr-FR';
                return (
                  <Link key={child.id} to={`/parent/children/${child.id}/reports`} className="parent-dash__child-row">
                    <Avatar name={child.user?.name ?? child.admissionNumber ?? '?'} size="sm" />
                    <div className="parent-dash__child-info">
                      <span className="parent-dash__child-name">{child.user?.name ?? child.admissionNumber ?? '—'}</span>
                      <span className="parent-dash__child-class">
                        {cls?.name ?? '—'}
                        {lastRep?.overallAverage != null && (
                          <span style={{ marginLeft: 6, color: Number(lastRep.overallAverage) >= 10 ? '#15803d' : '#dc2626', fontWeight: 700 }}>
                            · Moy. {Number(lastRep.overallAverage).toFixed(2)}/20
                          </span>
                        )}
                      </span>
                      {balance && balance.remaining > 0 && (
                        <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600, marginTop: 2 }}>
                          Reste : {balance.remaining.toLocaleString(locale)} FCFA
                        </span>
                      )}
                    </div>
                    {child.paymentStatus && (
                      <Badge variant={PAYMENT_VARIANT[child.paymentStatus] ?? 'default'}>
                        {PAYMENT_LABEL[child.paymentStatus] ?? child.paymentStatus}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="parent-dash__card">
          <div className="parent-dash__card-head">
            <h3 className="parent-dash__card-title">{t('dash.recentReports')}</h3>
          </div>
          {published.length === 0 ? (
            <p className="parent-dash__empty">{t('dash.noReportAvailable')}</p>
          ) : (
            <div className="parent-dash__report-list">
              {published.slice(0, 5).map((r) => (
                <Link
                  key={r.id}
                  to={`/parent/children/${r.studentId}/reports`}
                  className="parent-dash__report-row"
                >
                  <div>
                    <div className="parent-dash__report-name">
                      {r.student ? (r.student.user?.name ?? r.student.admissionNumber ?? '—') : '—'}
                    </div>
                    <div className="parent-dash__report-meta">
                      {r.termName ?? `Trimestre ${r.termNumber}`} — {r.academicYear}
                    </div>
                  </div>
                  <StatusPill status={r.deliveryStatus ?? r.status} />
                </Link>
              ))}
            </div>
          )}
        </Card>

        {bulletins.length > 0 && (
          <Card className="parent-dash__card parent-dash__card--wide">
            <div className="parent-dash__card-head">
              <h3 className="parent-dash__card-title">{t('dash.announcements')}</h3>
              <Link to="/parent/bulletins" className="parent-dash__see-all">{t('action.viewAll')}</Link>
            </div>
            <div className="parent-dash__bulletin-list">
              {bulletins.slice(0, 3).map((b) => (
                <div key={b.id} className="parent-dash__bulletin-row">
                  <div className="parent-dash__bulletin-title">{b.title}</div>
                  <div className="parent-dash__bulletin-date">
                    {b.publishedAt ? new Date(b.publishedAt).toLocaleDateString('fr-FR') : ''}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

export default ParentDashboardPage;
