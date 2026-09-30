import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { classesService } from '../../../services/classesService';
import { reportsService } from '../../../services/reportsService';
import { timetablesService } from '../../../services/timetablesService';
import { programsService } from '../../../services/programsService';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import StatusPill from '../../../components/common/StatusPill/StatusPill';
import Loading from '../../../components/common/Loading/Loading';
import Button from '../../../components/common/Button/Button';
import './TeacherDashboardPage.css';

const TODAY_MAP = { 1:'LUNDI', 2:'MARDI', 3:'MERCREDI', 4:'JEUDI', 5:'VENDREDI', 6:'SAMEDI' };
const DAY_FR    = { LUNDI:'Lundi', MARDI:'Mardi', MERCREDI:'Mercredi', JEUDI:'Jeudi', VENDREDI:'Vendredi', SAMEDI:'Samedi' };

function currentAcademicYear() {
  const y = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  return `${y}-${y + 1}`;
}

function TeacherDashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const schedYear = currentAcademicYear();
  const today     = TODAY_MAP[new Date().getDay()];

  const { data: classes = [], isLoading: l1 } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const { data: reports = [], isLoading: l2 } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsService.list().then((r) => r.data),
  });

  const { data: schedule = [] } = useQuery({
    queryKey: ['my-schedule', schedYear],
    queryFn: () => timetablesService.getMySchedule(schedYear).then(r => r.data),
  });

  const { data: roadmap = [] } = useQuery({
    queryKey: ['my-roadmap', schedYear],
    queryFn: () => programsService.getMyRoadmap(schedYear).then(r => r.data),
  });

  if (l1 || l2) return <AppShell title={t('dash.title')}><Loading /></AppShell>;

  const pending      = reports.filter((r) => r.status === 'DRAFT' || r.status === 'REVIEW');
  const published    = reports.filter((r) => r.status === 'PUBLISHED');
  const todaySlots   = schedule.filter(s => s.dayOfWeek === today);
  const totalCh      = roadmap.reduce((n, i) => n + (i.program?.chapters?.length ?? 0), 0);
  const doneCh       = roadmap.reduce((n, i) => n + (i.program?.chapters?.filter(c => c.isCompleted).length ?? 0), 0);
  const pctDone      = totalCh === 0 ? 0 : Math.round((doneCh / totalCh) * 100);

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
        <Card className="teacher-dash__stat">
          <div className="teacher-dash__stat-icon teacher-dash__stat-icon--green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              <line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/>
            </svg>
          </div>
          <span className="teacher-dash__stat-value">{todaySlots.length}</span>
          <span className="teacher-dash__stat-label">Cours aujourd'hui</span>
        </Card>
        <Card className="teacher-dash__stat">
          <div className="teacher-dash__stat-icon" style={{background:'#f5f3ff',color:'#7c3aed'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <span className="teacher-dash__stat-value">{pctDone}%</span>
          <span className="teacher-dash__stat-label">Programme couvert</span>
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

        {/* Tableau de service today */}
        <Card className="teacher-dash__card">
          <div className="teacher-dash__card-head">
            <h3 className="teacher-dash__card-title">
              📅 {today ? `${DAY_FR[today]}` : 'Aujourd\'hui'} — cours du jour
            </h3>
            <Link to="/teacher/schedule" className="teacher-dash__see-all">Tout voir</Link>
          </div>
          {todaySlots.length === 0 ? (
            <p className="teacher-dash__empty">
              {today ? 'Aucun cours aujourd\'hui.' : 'Emploi du temps non configuré.'}
            </p>
          ) : (
            <div className="teacher-dash__schedule-list">
              {todaySlots.map(slot => (
                <div key={slot.id} className="teacher-dash__schedule-row">
                  <span className="teacher-dash__schedule-time">{slot.startTime}–{slot.endTime}</span>
                  <div>
                    <div className="teacher-dash__schedule-subject">{slot.subject?.nameFr ?? '—'}</div>
                    <div className="teacher-dash__schedule-class">{slot.class?.name ?? '—'}{slot.room ? ` · ${slot.room}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Feuille de route summary */}
        <Card className="teacher-dash__card">
          <div className="teacher-dash__card-head">
            <h3 className="teacher-dash__card-title">📋 Feuille de route {schedYear}</h3>
            <Link to="/teacher/roadmap" className="teacher-dash__see-all">Détail</Link>
          </div>
          {roadmap.length === 0 ? (
            <p className="teacher-dash__empty">Aucun programme défini.</p>
          ) : (
            <div className="teacher-dash__roadmap-list">
              {roadmap.slice(0, 5).map(item => {
                const chs  = item.program?.chapters ?? [];
                const done = chs.filter(c => c.isCompleted).length;
                const pct  = chs.length === 0 ? 0 : Math.round((done / chs.length) * 100);
                return (
                  <div key={`${item.classId}-${item.subjectId}`} className="teacher-dash__roadmap-row">
                    <div className="teacher-dash__roadmap-info">
                      <span className="teacher-dash__roadmap-subject">{item.subjectName}</span>
                      <span className="teacher-dash__roadmap-class">{item.className}</span>
                    </div>
                    <div className="teacher-dash__roadmap-bar">
                      <div className="teacher-dash__roadmap-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="teacher-dash__roadmap-pct">{pct}%</span>
                  </div>
                );
              })}
              {roadmap.length > 5 && (
                <Link to="/teacher/roadmap" className="teacher-dash__see-all" style={{ paddingTop: '0.25rem' }}>
                  +{roadmap.length - 5} autres matières
                </Link>
              )}
            </div>
          )}
        </Card>
      </div>

    </AppShell>
  );
}

export default TeacherDashboardPage;
