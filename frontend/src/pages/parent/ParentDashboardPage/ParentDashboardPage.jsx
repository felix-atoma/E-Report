import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
const PAYMENT_LABEL   = { PAID: 'À jour', PARTIAL: 'Partiel', UNPAID: 'Non payé', EXEMPT: 'Exonéré' };

function ParentDashboardPage() {
  const { user } = useAuth();

  const { data: children = [], isLoading: l1 } = useQuery({
    queryKey: ['my-children'],
    queryFn: () => studentsService.list().then((r) => r.data),
  });

  const { data: reports = [], isLoading: l2 } = useQuery({
    queryKey: ['parent-reports'],
    queryFn: () => reportsService.list().then((r) => r.data),
  });

  const { data: bulletins = [] } = useQuery({
    queryKey: ['bulletins'],
    queryFn: () => bulletinsService.list().then((r) => r.data),
  });

  if (l1 || l2) return <AppShell title="Tableau de bord"><Loading /></AppShell>;

  const published = reports.filter((r) => r.status === 'PUBLISHED');
  const held      = reports.filter((r) => r.status === 'PUBLISHED' && (r.deliveryStatus === 'HELD_UNPAID' || r.deliveryStatus === 'HELD_PARTIAL'));

  return (
    <AppShell title="Tableau de bord">
      <PageHeader
        title={`Bonjour, ${user?.firstName ?? 'Parent'}`}
        subtitle="Suivez la scolarité de vos enfants"
      />

      {/* Summary bar */}
      <div className="parent-dash__stats">
        <Card className="parent-dash__stat">
          <span className="parent-dash__stat-icon">👶</span>
          <span className="parent-dash__stat-value">{children.length}</span>
          <span className="parent-dash__stat-label">Enfant{children.length !== 1 ? 's' : ''}</span>
        </Card>
        <Card className="parent-dash__stat">
          <span className="parent-dash__stat-icon">📋</span>
          <span className="parent-dash__stat-value">{published.length}</span>
          <span className="parent-dash__stat-label">Bulletin{published.length !== 1 ? 's' : ''}</span>
        </Card>
        <Card className="parent-dash__stat">
          <span className="parent-dash__stat-icon">⏳</span>
          <span className="parent-dash__stat-value">{held.length}</span>
          <span className="parent-dash__stat-label">En attente paiement</span>
        </Card>
      </div>

      <div className="parent-dash__grid">
        {/* Children */}
        <Card className="parent-dash__card">
          <div className="parent-dash__card-head">
            <h3 className="parent-dash__card-title">Mes enfants</h3>
            <Link to="/parent/children" className="parent-dash__see-all">Voir tout</Link>
          </div>
          {children.length === 0 ? (
            <p className="parent-dash__empty">Aucun enfant associé à votre compte.</p>
          ) : (
            <div className="parent-dash__children-list">
              {children.map((child) => (
                <Link key={child.id} to={`/parent/children/${child.id}/reports`} className="parent-dash__child-row">
                  <Avatar name={`${child.firstName} ${child.lastName}`} size="sm" />
                  <div className="parent-dash__child-info">
                    <span className="parent-dash__child-name">{child.firstName} {child.lastName}</span>
                    <span className="parent-dash__child-class">{child.class?.name ?? '—'}</span>
                  </div>
                  {child.paymentStatus && (
                    <Badge variant={PAYMENT_VARIANT[child.paymentStatus] ?? 'default'}>
                      {PAYMENT_LABEL[child.paymentStatus] ?? child.paymentStatus}
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Recent bulletins */}
        <Card className="parent-dash__card">
          <div className="parent-dash__card-head">
            <h3 className="parent-dash__card-title">Bulletins récents</h3>
          </div>
          {published.length === 0 ? (
            <p className="parent-dash__empty">Aucun bulletin disponible.</p>
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
                      {r.student ? `${r.student.firstName} ${r.student.lastName}` : '—'}
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

        {/* Recent announcements */}
        {bulletins.length > 0 && (
          <Card className="parent-dash__card parent-dash__card--wide">
            <div className="parent-dash__card-head">
              <h3 className="parent-dash__card-title">Annonces</h3>
              <Link to="/parent/bulletins" className="parent-dash__see-all">Voir tout</Link>
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
