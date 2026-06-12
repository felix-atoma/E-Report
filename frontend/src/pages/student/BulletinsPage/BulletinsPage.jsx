import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { bulletinsService } from '../../../services/bulletinsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Loading from '../../../components/common/Loading/Loading';
import EmptyState from '../../../components/common/EmptyState/EmptyState';
import './BulletinsPage.css';

function BulletinsPage() {
  const { t } = useTranslation();

  const { data: bulletins = [], isLoading } = useQuery({
    queryKey: ['bulletins'],
    queryFn: () => bulletinsService.list().then((r) => r.data),
  });

  const published = bulletins.filter((b) => !!b.publishedAt);

  if (isLoading) return <AppShell title={t('bulletins.title')}><Loading /></AppShell>;

  return (
    <AppShell title={t('bulletins.title')}>
      <PageHeader
        title={t('bulletins.title')}
        subtitle={t('bulletins.subtitle', { count: published.length })}
      />

      {published.length === 0 ? (
        <EmptyState
          icon="📢"
          message={t('bulletins.noAnnouncements')}
          description={t('bulletins.noAnnouncementsDesc')}
        />
      ) : (
        <div className="student-bulletins__list">
          {published.map((b) => (
            <Card key={b.id} className="student-bulletin-card">
              <div className="student-bulletin-card__header">
                <h3 className="student-bulletin-card__title">{b.title}</h3>
                <span className="student-bulletin-card__date">
                  {b.publishedAt
                    ? new Date(b.publishedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : ''}
                </span>
              </div>
              <p className="student-bulletin-card__content">{b.content}</p>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}

export default BulletinsPage;
