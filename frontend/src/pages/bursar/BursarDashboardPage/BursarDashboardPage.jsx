import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { paymentsService } from '../../../services/paymentsService';
import { studentsService } from '../../../services/studentsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Badge from '../../../components/common/Badge/Badge';
import Loading from '../../../components/common/Loading/Loading';
import './BursarDashboardPage.css';

const STATUS_VARIANT = { PAID: 'success', PARTIAL: 'warning', UNPAID: 'danger', EXEMPT: 'default' };
const STATUS_I18N_KEY = { PAID: 'upToDate', PARTIAL: 'partial', UNPAID: 'unpaid', EXEMPT: 'exempted' };

function BursarDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const locale = navigator.language || 'fr-FR';

  const { data: payments = [], isLoading: l1 } = useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentsService.list().then((r) => r.data),
  });

  const { data: students = [], isLoading: l2 } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentsService.list().then((r) => r.data),
  });

  const stats = useMemo(() => {
    const total     = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
    const today     = new Date().toDateString();
    const todayAmt  = payments
      .filter((p) => new Date(p.createdAt).toDateString() === today)
      .reduce((s, p) => s + (p.amount ?? 0), 0);
    const unpaid    = students.filter((s) => s.paymentStatus === 'UNPAID').length;
    const partial   = students.filter((s) => s.paymentStatus === 'PARTIAL').length;
    return { total, todayAmt, unpaid, partial };
  }, [payments, students]);

  const recent = useMemo(
    () => [...payments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8),
    [payments],
  );

  if (l1 || l2) return <AppShell title={t('bursar.title')}><Loading /></AppShell>;

  return (
    <AppShell title={t('bursar.title')}>
      <PageHeader
        title={t('bursar.hello', { name: user?.name ?? t('bursar.bursar') })}
        subtitle={t('bursar.subtitle')}
      />

      <div className="bursar-dash__stats">
        <Card className="bursar-dash__stat">
          <div className="bursar-dash__stat-icon bursar-dash__stat-icon--teal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <span className="bursar-dash__stat-value">{stats.total.toLocaleString(locale)}</span>
          <span className="bursar-dash__stat-label">{t('bursar.totalCollected')}</span>
        </Card>

        <Card className="bursar-dash__stat">
          <div className="bursar-dash__stat-icon bursar-dash__stat-icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <span className="bursar-dash__stat-value">{stats.todayAmt.toLocaleString(locale)}</span>
          <span className="bursar-dash__stat-label">{t('bursar.collectedToday')}</span>
        </Card>

        <Card className="bursar-dash__stat">
          <div className="bursar-dash__stat-icon bursar-dash__stat-icon--orange">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <span className="bursar-dash__stat-value">{stats.unpaid}</span>
          <span className="bursar-dash__stat-label">{t('bursar.unpaidStudents')}</span>
        </Card>

        <Card className="bursar-dash__stat">
          <div className="bursar-dash__stat-icon bursar-dash__stat-icon--yellow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <span className="bursar-dash__stat-value">{stats.partial}</span>
          <span className="bursar-dash__stat-label">{t('bursar.partialPayments')}</span>
        </Card>
      </div>

      <div className="bursar-dash__body">
        <Card className="bursar-dash__recent">
          <div className="bursar-dash__card-head">
            <h3 className="bursar-dash__card-title">{t('bursar.recentPayments')}</h3>
            <Link to="/bursar/payments" className="bursar-dash__see-all">{t('bursar.seeAll')}</Link>
          </div>
          {recent.length === 0 ? (
            <p className="bursar-dash__empty">{t('bursar.noPayments')}</p>
          ) : (
            <div className="bursar-dash__table-wrap">
              <table className="bursar-dash__table">
                <thead>
                  <tr>
                    <th>{t('payments.student')}</th>
                    <th>{t('payments.amount')}</th>
                    <th>{t('payments.method')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('payments.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="bursar-dash__student-name">
                          {p.student?.user?.name ?? p.student?.admissionNumber ?? '—'}
                        </div>
                        {p.student?.class?.name && (
                          <div className="bursar-dash__student-class">{p.student.class.name}</div>
                        )}
                      </td>
                      <td className="bursar-dash__amount">
                        {Number(p.amount).toLocaleString(locale)} FCFA
                      </td>
                      <td>{t(`payment.methods.${p.method}`, p.method)}</td>
                      <td>
                        <Badge variant={STATUS_VARIANT[p.status] ?? 'default'}>
                          {t(`payment.${STATUS_I18N_KEY[p.status] ?? p.status}`, p.status)}
                        </Badge>
                      </td>
                      <td className="bursar-dash__date">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString(locale) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="bursar-dash__actions">
          <h3 className="bursar-dash__card-title">{t('bursar.quickActions')}</h3>
          <div className="bursar-dash__quick-links">
            <Link to="/bursar/payments" className="bursar-dash__quick-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              {t('bursar.recordPayment')}
            </Link>
            <Link to="/bursar/fees" className="bursar-dash__quick-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>
              </svg>
              {t('bursar.manageFees')}
            </Link>
            <Link to="/bursar/notifications" className="bursar-dash__quick-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {t('bursar.heldReports')}
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

export default BursarDashboardPage;
