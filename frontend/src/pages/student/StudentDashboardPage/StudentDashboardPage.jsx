import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { reportsService } from '../../../services/reportsService';
import { bulletinsService } from '../../../services/bulletinsService';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Badge from '../../../components/common/Badge/Badge';
import Loading from '../../../components/common/Loading/Loading';
import './StudentDashboardPage.css';

function getMention(avg) {
  if (avg == null) return null;
  if (avg >= 18) return { label: 'Excellent',   variant: 'success' };
  if (avg >= 16) return { label: 'Très Bien',   variant: 'success' };
  if (avg >= 14) return { label: 'Bien',         variant: 'info'    };
  if (avg >= 12) return { label: 'Assez Bien',   variant: 'info'    };
  if (avg >= 10) return { label: 'Passable',     variant: 'warning' };
  return               { label: 'Insuffisant',  variant: 'danger'  };
}

function StudentDashboardPage() {
  const { user } = useAuth();

  const { data: reports = [], isLoading: l1 } = useQuery({
    queryKey: ['student-reports'],
    queryFn: () => reportsService.list().then((r) => r.data),
  });

  const { data: bulletins = [], isLoading: l2 } = useQuery({
    queryKey: ['bulletins'],
    queryFn: () => bulletinsService.list().then((r) => r.data),
  });

  if (l1 || l2) return <AppShell title="Tableau de bord"><Loading /></AppShell>;

  const published    = reports.filter((r) => r.status === 'PUBLISHED');
  const latestReport = published[0] ?? null;
  const mention      = getMention(latestReport?.overallAverage);

  return (
    <AppShell title="Tableau de bord">
      <PageHeader
        title={`Bonjour, ${user?.name ?? 'Étudiant'}`}
        subtitle="Votre espace personnel"
      />

      <div className="student-dash__grid">
        {/* Latest report */}
        <Card className="student-dash__card student-dash__card--featured">
          <h3 className="student-dash__section-title">Dernier bulletin</h3>
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
                Voir tous mes bulletins →
              </Link>
            </div>
          ) : (
            <p className="student-dash__empty">Aucun bulletin publié pour le moment.</p>
          )}
        </Card>

        {/* Stats */}
        <div className="student-dash__stats">
          <Card className="student-dash__stat">
            <div className="student-dash__stat-icon student-dash__stat-icon--teal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              </svg>
            </div>
            <span className="student-dash__stat-value">{published.length}</span>
            <span className="student-dash__stat-label">Bulletin{published.length !== 1 ? 's' : ''}</span>
          </Card>
          <Card className="student-dash__stat">
            <div className="student-dash__stat-icon student-dash__stat-icon--orange">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l19-9-9 19-2-8-8-2z"/>
              </svg>
            </div>
            <span className="student-dash__stat-value">{bulletins.filter((b) => b.publishedAt).length}</span>
            <span className="student-dash__stat-label">Annonce{bulletins.length !== 1 ? 's' : ''}</span>
          </Card>
          <Link to="/student/progress" className="student-dash__stat-link">
            <Card className="student-dash__stat">
              <div className="student-dash__stat-icon student-dash__stat-icon--blue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                  <polyline points="16 7 22 7 22 13"/>
                </svg>
              </div>
              <span className="student-dash__stat-label">Voir ma progression</span>
            </Card>
          </Link>
        </div>

        {/* Announcements */}
        {bulletins.filter((b) => b.publishedAt).length > 0 && (
          <Card className="student-dash__card">
            <div className="student-dash__card-head">
              <h3 className="student-dash__section-title">Annonces récentes</h3>
              <Link to="/student/bulletins" className="student-dash__see-all">Voir tout</Link>
            </div>
            <div className="student-dash__bulletins">
              {bulletins.filter((b) => b.publishedAt).slice(0, 3).map((b) => (
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
