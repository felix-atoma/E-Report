import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { studentsService } from '../../../services/studentsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Avatar from '../../../components/common/Avatar/Avatar';
import Badge from '../../../components/common/Badge/Badge';
import Loading from '../../../components/common/Loading/Loading';
import EmptyState from '../../../components/common/EmptyState/EmptyState';
import './ChildrenPage.css';

const PAYMENT_VARIANT = { PAID: 'success', PARTIAL: 'warning', UNPAID: 'danger', EXEMPT: 'default' };
const PAYMENT_LABEL   = { PAID: 'Frais à jour', PARTIAL: 'Paiement partiel', UNPAID: 'Frais impayés', EXEMPT: 'Exonéré' };

function ChildrenPage() {
  const { data: children = [], isLoading } = useQuery({
    queryKey: ['my-children'],
    queryFn: () => studentsService.myChildren().then((r) => r.data),
  });

  if (isLoading) return <AppShell title="Mes enfants"><Loading /></AppShell>;

  return (
    <AppShell title="Mes enfants">
      <PageHeader
        title="Mes enfants"
        subtitle={`${children.length} enfant${children.length !== 1 ? 's' : ''}`}
      />

      {children.length === 0 ? (
        <EmptyState
          icon="👶"
          message="Aucun enfant associé à votre compte"
          description="Contactez l'administration pour associer vos enfants à votre compte parent."
        />
      ) : (
        <div className="children-page__grid">
          {children.map((child) => (
            <Link
              key={child.id}
              to={`/parent/children/${child.id}/reports`}
              className="child-card"
            >
              <div className="child-card__top">
                <Avatar name={child.user?.name ?? child.admissionNumber ?? '?'} size="lg" />
                <div className="child-card__info">
                  <div className="child-card__name">{child.user?.name ?? child.admissionNumber ?? '—'}</div>
                  {(child.classes?.[0]?.class?.name ?? child.class?.name) && (
                    <div className="child-card__class">{child.classes?.[0]?.class?.name ?? child.class?.name}</div>
                  )}
                  <div className="child-card__matricule">{child.admissionNumber}</div>
                </div>
              </div>

              <div className="child-card__footer">
                {child.paymentStatus ? (
                  <Badge variant={PAYMENT_VARIANT[child.paymentStatus] ?? 'default'}>
                    {PAYMENT_LABEL[child.paymentStatus] ?? child.paymentStatus}
                  </Badge>
                ) : (
                  <Badge variant="default">Statut inconnu</Badge>
                )}
                <span className="child-card__link">Voir les bulletins →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

export default ChildrenPage;
