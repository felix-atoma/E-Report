import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { classesService } from '../../../services/classesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Badge from '../../../components/common/Badge/Badge';
import Loading from '../../../components/common/Loading/Loading';
import EmptyState from '../../../components/common/EmptyState/EmptyState';
import './MyClassesPage.css';

const LEVEL_VARIANT = {
  MATERNELLE: 'info',
  PRIMAIRE:   'success',
  COLLEGE:    'warning',
  LYCEE:      'danger',
};

const LEVEL_LABEL = {
  MATERNELLE: 'Maternelle',
  PRIMAIRE:   'Primaire',
  COLLEGE:    'Collège',
  LYCEE:      'Lycée',
};

function MyClassesPage() {
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  if (isLoading) return <AppShell title="Mes classes"><Loading /></AppShell>;

  return (
    <AppShell title="Mes classes">
      <PageHeader
        title="Mes classes"
        subtitle={`${classes.length} classe${classes.length !== 1 ? 's' : ''} assignée${classes.length !== 1 ? 's' : ''}`}
      />

      {classes.length === 0 ? (
        <EmptyState message="Aucune classe ne vous est assignée pour le moment." />
      ) : (
        <div className="my-classes__grid">
          {classes.map((cls) => (
            <Link key={cls.id} to={`/teacher/classes/${cls.id}`} className="class-card">
              <div className="class-card__header">
                <span className="class-card__name">{cls.name}</span>
                <Badge variant={LEVEL_VARIANT[cls.level] ?? 'default'}>
                  {LEVEL_LABEL[cls.level] ?? cls.level}
                </Badge>
              </div>
              <div className="class-card__body">
                <div className="class-card__stat">
                  <span className="class-card__stat-icon">🎒</span>
                  <span>{cls._count?.students ?? cls.studentsCount ?? 0} élèves</span>
                </div>
                <div className="class-card__stat">
                  <span className="class-card__stat-icon">📚</span>
                  <span>{cls._count?.subjects ?? cls.subjectsCount ?? 0} matières</span>
                </div>
                {cls.academicYear && (
                  <div className="class-card__stat">
                    <span className="class-card__stat-icon">📅</span>
                    <span>{cls.academicYear}</span>
                  </div>
                )}
              </div>
              <div className="class-card__footer">
                <span className="class-card__link">Voir le détail →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

export default MyClassesPage;
