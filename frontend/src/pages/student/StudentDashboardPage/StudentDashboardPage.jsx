import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { reportsService } from '../../../services/reportsService';
import { bulletinsService } from '../../../services/bulletinsService';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Badge from '../../../components/common/Badge/Badge';
import Loading from '../../../components/common/Loading/Loading';
import './StudentDashboardPage.css';

function StudentDashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  function getMention(avg) {
    if (avg == null) return null;
    if (avg >= 18) return { label: t('mention.excellent'),  variant: 'success' };
    if (avg >= 16) return { label: t('mention.veryGood'),   variant: 'success' };
    if (avg >= 14) return { label: t('mention.good'),        variant: 'info'    };
    if (avg >= 12) return { label: t('mention.fairlyGood'),  variant: 'info'    };
    if (avg >= 10) return { label: t('mention.pass'),        variant: 'warning' };
    return               { label: t('mention.fail'),         variant: 'danger'  };
  }

  const { data: reports = [], isLoading: l1 } = useQuery({
    queryKey: ['student-reports'],
    queryFn: () => reportsService.list().then((r) => r.data),
  });

  const { data: bulletins = [], isLoading: l2 } = useQuery({
    queryKey: ['bulletins'],
    queryFn: () => bulletinsService.list().then((r) => r.data),
  });

  if (l1 || l2) return <AppShell title={t('dash.title')}><Loading /></AppShell>;

  const published    = reports.filter((r) => r.status === 'PUBLISHED');
  const latestReport = published[0] ?? null;
  const mention      = getMention(latestReport?.overallAverage);
  const announcementList = bulletins.filter((b) => b.publishedAt);

  return (
    <AppShell title={t('dash.title')}>
      <PageHeader
        title={t('dash.hello', { name: user?.name ?? t('role.STUDENT') })}
        subtitle={t('dash.personalSpace')}
      />

      <div className="student-dash__grid">
        <Card className="student-dash__card student-dash__card--featured">
          <h3 className="student-dash__section-title">{t('dash.latestReport')}</h3>
          {latestReport ? (
            <div className="student-dash__latest">
              <div className="student-dash__latest-term">
                {latestReport.termName ?? `Trimestre ${latestReport.termNumber}`} — {latestReport.academicYear}
              </div>
              {latestReport.overallAverage != null && (
                <div className="student-dash__latest-avg">
                  <span className="student-dash__avg-value">
                    {String(latestReport.overallAverage).replace('.', ',')}
                  </span>
                  <span className="student-dash__avg-label">/ 20</span>
                  {mention && <Badge variant={mention.variant}>{mention.label}</Badge>}
                </div>
              )}
              {latestReport.teacherComment && (
                <p className="student-dash__comment">"{latestReport.teacherComment}"</p>
              )}
              <Link to="/student/reports" className="student-dash__link">
                {t('dash.allReports')}
              </Link>
            </div>
          ) : (
            <p className="student-dash__empty">{t('dash.noReport')}</p>
          )}
        </Card>

        <div className="student-dash__stats">
          <Card className="student-dash__stat">
            <div className="student-dash__stat-icon student-dash__stat-icon--teal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              </svg>
            </div>
            <span className="student-dash__stat-value">{published.length}</span>
            <span className="student-dash__stat-label">{t('dash.bulletinCount', { count: published.length })}</span>
          </Card>
          <Card className="student-dash__stat">
            <div className="student-dash__stat-icon student-dash__stat-icon--orange">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l19-9-9 19-2-8-8-2z"/>
              </svg>
            </div>
            <span className="student-dash__stat-value">{announcementList.length}</span>
            <span className="student-dash__stat-label">{t('dash.announcementCount', { count: announcementList.length })}</span>
          </Card>
          <Link to="/student/progress" className="student-dash__stat-link">
            <Card className="student-dash__stat">
              <div className="student-dash__stat-icon student-dash__stat-icon--blue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                  <polyline points="16 7 22 7 22 13"/>
                </svg>
              </div>
              <span className="student-dash__stat-label">{t('dash.viewProgress')}</span>
            </Card>
          </Link>
        </div>

        {announcementList.length > 0 && (
          <Card className="student-dash__card">
            <div className="student-dash__card-head">
              <h3 className="student-dash__section-title">{t('dash.recentAnnouncements')}</h3>
              <Link to="/student/bulletins" className="student-dash__see-all">{t('action.viewAll')}</Link>
            </div>
            <div className="student-dash__bulletins">
              {announcementList.slice(0, 3).map((b) => (
                <div key={b.id} className="student-dash__bulletin-row">
                  <div className="student-dash__bulletin-title">{b.title}</div>
                  <div className="student-dash__bulletin-date">
                    {new Date(b.publishedAt).toLocaleDateString('fr-FR')}
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

export default StudentDashboardPage;
