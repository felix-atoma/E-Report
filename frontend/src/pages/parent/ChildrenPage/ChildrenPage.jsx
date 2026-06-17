import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { studentsService } from '../../../services/studentsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import PayFeesForm from '../../../components/payments/PayFeesForm/PayFeesForm';
import Avatar from '../../../components/common/Avatar/Avatar';
import Badge from '../../../components/common/Badge/Badge';
import Loading from '../../../components/common/Loading/Loading';
import EmptyState from '../../../components/common/EmptyState/EmptyState';
import './ChildrenPage.css';

const PAYMENT_VARIANT = { PAID: 'success', PARTIAL: 'warning', UNPAID: 'danger', EXEMPT: 'default' };

function ChildrenPage() {
  const { t } = useTranslation();
  const [payingChild, setPayingChild] = useState(null);

  const { data: children = [], isLoading } = useQuery({
    queryKey: ['my-children'],
    queryFn: () => studentsService.myChildren().then((r) => r.data),
  });

  const handlePayFees = (e, child) => {
    e.preventDefault();
    e.stopPropagation();
    setPayingChild(child);
  };

  if (isLoading) return <AppShell title={t('children.title')}><Loading /></AppShell>;

  return (
    <AppShell title={t('children.title')}>
      <PageHeader
        title={t('children.title')}
        subtitle={t('children.subtitle', { count: children.length })}
      />

      {children.length === 0 ? (
        <EmptyState
          icon="👶"
          message={t('children.empty')}
          description={t('children.emptyDesc')}
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
                    {t(`children.paymentStatus.${child.paymentStatus}`, child.paymentStatus)}
                  </Badge>
                ) : (
                  <Badge variant="default">{t('children.paymentStatus.UNKNOWN')}</Badge>
                )}
                <span className="child-card__link">{t('children.seeReports')}</span>
              </div>

              {(child.paymentStatus === 'UNPAID' || child.paymentStatus === 'PARTIAL') && (
                <button
                  className="child-card__pay-btn"
                  onClick={(e) => handlePayFees(e, child)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  {t('children.payFees')}
                </button>
              )}
            </Link>
          ))}
        </div>
      )}

      <OffCanvas
        open={!!payingChild}
        onClose={() => setPayingChild(null)}
        title={t('children.payFees')}
        subtitle={payingChild?.user?.name ?? payingChild?.admissionNumber}
        size="md"
      >
        {payingChild && (
          <PayFeesForm
            studentId={payingChild.id}
            academicYear={payingChild.academicYear}
            onClose={() => setPayingChild(null)}
          />
        )}
      </OffCanvas>
    </AppShell>
  );
}

export default ChildrenPage;
