import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { classesService } from '../../../services/classesService';
import { reportsService } from '../../../services/reportsService';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import StatusPill from '../../../components/common/StatusPill/StatusPill';
import Loading from '../../../components/common/Loading/Loading';
import Button from '../../../components/common/Button/Button';
import './TeacherDashboardPage.css';

function TeacherDashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: classes = [], isLoading: l1 } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const { data: reports = [], isLoading: l2 } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsService.list().then((r) => r.data),
  });

  if (l1 || l2) return <AppShell title={t('dash.title')}><Loading /></AppShell>;

  const pending   = reports.filter((r) => r.status === 'DRAFT' || r.status === 'REVIEW');
  const published = reports.filter((r) => r.status === 'PUBLISHED');

  return (
    <AppShell title={t('dash.title')}>
      <PageHeader
        title={t('dash.hello', { name: user?.name ?? t('role.TEACHER') })}
        subtitle={t('dash.activities')}
        actions={
          <Button icon="+" onClick={() => {}}>
            <Link to="/teacher/reports/new" className="teacher-dash__link">{t('dash.newBulletin')}</Link>
          </Button>
        }
      />

      <div className="teacher-dash__stats">
        <Card className="teacher-dash__stat">
          <div className="teacher-dash__stat-icon teacher-dash__stat-icon--orange">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span className="teacher-dash__stat-value">{classes.length}</span>
          <span className="teacher-dash__stat-label">{t('dash.myClasses')}</span>
        </Card>
        <Card className="teacher-dash__stat">
          <div className="teacher-dash__stat-icon teacher-dash__stat-icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
          <span className="teacher-dash__stat-value">{pending.length}</span>
          <span className="teacher-dash__stat-label">{t('dash.inProgress')}</span>
        </Card>
        <Card className="teacher-dash__stat">
          <div className="teacher-dash__stat-icon teacher-dash__stat-icon--teal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
          </div>
          <span className="teacher-dash__stat-value">{published.length}</span>
          <span className="teacher-dash__stat-label">{t('dash.published')}</span>
        </Card>
      </div>

      <div className="teacher-dash__grid">
        <Card className="teacher-dash__card">
          <div className="teacher-dash__card-head">
            <h3 className="teacher-dash__card-title">{t('dash.myClasses')}</h3>
            <Link to="/teacher/classes" className="teacher-dash__see-all">{t('action.viewAll')}</Link>
          </div>
          {classes.length === 0 ? (
            <p className="teacher-dash__empty">{t('dash.noClass')}</p>
          ) : (
            <div className="teacher-dash__class-list">
              {classes.slice(0, 5).map((c) => (
                <Link key={c.id} to={`/teacher/classes/${c.id}`} className="teacher-dash__class-row">
                  <span className="teacher-dash__class-name">{c.name}</span>
                  <span className="teacher-dash__class-meta">
                    {t('dash.studentsCount', { count: c._count?.students ?? c.studentsCount ?? 0 })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="teacher-dash__card">
          <div className="teacher-dash__card-head">
            <h3 className="teacher-dash__card-title">{t('dash.recentReports')}</h3>
            <Link to="/teacher/reports" className="teacher-dash__see-all">{t('action.viewAll')}</Link>
          </div>
          {reports.length === 0 ? (
            <p className="teacher-dash__empty">{t('dash.noBulletin')}</p>
          ) : (
            <div className="teacher-dash__report-list">
              {reports.slice(0, 6).map((r) => (
                <Link key={r.id} to={`/teacher/reports/${r.id}`} className="teacher-dash__report-row">
                  <div>
                    <div className="teacher-dash__report-name">
                      {r.class?.name ?? '—'} — {r.termName ?? `Trimestre ${r.termNumber}`}
                    </div>
                    <div className="teacher-dash__report-meta">{r.academicYear}</div>
                  </div>
                  <StatusPill status={r.status} />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

    </AppShell>
  );
}

export default TeacherDashboardPage;
