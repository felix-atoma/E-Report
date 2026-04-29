import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
const STATUS_LABEL   = { PAID: 'À jour', PARTIAL: 'Partiel', UNPAID: 'Non payé', EXEMPT: 'Exonéré' };
const METHOD_LABEL   = { CASH: 'Espèces', TMONEY: 'TMoney', FLOOZ: 'Flooz', MOMO: 'MoMo', TRANSFER: 'Virement', CHEQUE: 'Chèque', OTHER: 'Autre' };

function BursarDashboardPage() {
  const { user } = useAuth();

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

  if (l1 || l2) return <AppShell title="Économat"><Loading /></AppShell>;

  return (
    <AppShell title="Économat">
      <PageHeader
        title={`Bonjour, ${user?.name ?? 'Économe'}`}
        subtitle="Tableau de bord des paiements"
      />

      <div className="bursar-dash__stats">
        <Card className="bursar-dash__stat">
          <div className="bursar-dash__stat-icon bursar-dash__stat-icon--teal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <span className="bursar-dash__stat-value">{stats.total.toLocaleString('fr-FR')}</span>
          <span className="bursar-dash__stat-label">Total collecté (FCFA)</span>
        </Card>

        <Card className="bursar-dash__stat">
          <div className="bursar-dash__stat-icon bursar-dash__stat-icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <span className="bursar-dash__stat-value">{stats.todayAmt.toLocaleString('fr-FR')}</span>
          <span className="bursar-dash__stat-label">Perçu aujourd'hui (FCFA)</span>
        </Card>

        <Card className="bursar-dash__stat">
          <div className="bursar-dash__stat-icon bursar-dash__stat-icon--orange">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <span className="bursar-dash__stat-value">{stats.unpaid}</span>
          <span className="bursar-dash__stat-label">Élèves non payés</span>
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
          <span className="bursar-dash__stat-label">Paiements partiels</span>
        </Card>
      </div>

      <div className="bursar-dash__body">
        <Card className="bursar-dash__recent">
          <div className="bursar-dash__card-head">
            <h3 className="bursar-dash__card-title">Paiements récents</h3>
            <Link to="/bursar/payments" className="bursar-dash__see-all">Voir tout →</Link>
          </div>
          {recent.length === 0 ? (
            <p className="bursar-dash__empty">Aucun paiement enregistré.</p>
          ) : (
            <div className="bursar-dash__table-wrap">
              <table className="bursar-dash__table">
                <thead>
                  <tr>
                    <th>Élève</th>
                    <th>Montant</th>
                    <th>Méthode</th>
                    <th>Statut</th>
                    <th>Date</th>
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
                        {Number(p.amount).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td>{METHOD_LABEL[p.method] ?? p.method}</td>
                      <td>
                        <Badge variant={STATUS_VARIANT[p.status] ?? 'default'}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </Badge>
                      </td>
                      <td className="bursar-dash__date">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="bursar-dash__actions">
          <h3 className="bursar-dash__card-title">Actions rapides</h3>
          <div className="bursar-dash__quick-links">
            <Link to="/bursar/payments" className="bursar-dash__quick-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              Enregistrer un paiement
            </Link>
            <Link to="/bursar/fees" className="bursar-dash__quick-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>
              </svg>
              Gérer les frais
            </Link>
            <Link to="/bursar/notifications" className="bursar-dash__quick-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              Bulletins retenus
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

export default BursarDashboardPage;
