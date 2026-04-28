import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { classesService } from '../../../services/classesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Tabs from '../../../components/common/Tabs/Tabs';
import Table from '../../../components/common/Table/Table';
import Badge from '../../../components/common/Badge/Badge';
import Avatar from '../../../components/common/Avatar/Avatar';
import Loading from '../../../components/common/Loading/Loading';
import Button from '../../../components/common/Button/Button';
import './ClassDetailPage.css';

const LEVEL_LABEL = {
  MATERNELLE: 'Maternelle',
  PRIMAIRE:   'Primaire',
  COLLEGE:    'Collège',
  LYCEE:      'Lycée',
};

function ClassDetailPage() {
  const { id } = useParams();

  const { data: cls, isLoading } = useQuery({
    queryKey: ['class', id],
    queryFn: () => classesService.get(id).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) return <AppShell title="Classe"><Loading /></AppShell>;
  if (!cls) return <AppShell title="Classe"><p className="class-detail__error">Classe introuvable.</p></AppShell>;

  const students  = cls.students  ?? [];
  const subjects  = cls.subjects  ?? [];

  const studentColumns = [
    {
      key: 'name',
      label: 'Élève',
      render: (s) => (
        <div className="class-detail__student">
          <Avatar name={`${s.firstName} ${s.lastName}`} size="sm" />
          <div>
            <div className="class-detail__student-name">{s.firstName} {s.lastName}</div>
            {s.matricule && <div className="class-detail__student-sub">{s.matricule}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'gender',
      label: 'Sexe',
      render: (s) => s.gender === 'M' ? 'M' : s.gender === 'F' ? 'F' : '—',
    },
    {
      key: 'parent',
      label: 'Parent',
      render: (s) =>
        s.parent
          ? `${s.parent.firstName} ${s.parent.lastName}`
          : <span className="class-detail__empty">—</span>,
    },
    {
      key: 'paymentStatus',
      label: 'Statut frais',
      render: (s) =>
        s.paymentStatus
          ? <Badge variant={
              s.paymentStatus === 'PAID'    ? 'success' :
              s.paymentStatus === 'PARTIAL' ? 'warning' :
              s.paymentStatus === 'EXEMPT'  ? 'default' : 'danger'
            }>
              {s.paymentStatus === 'PAID' ? 'À jour' : s.paymentStatus === 'PARTIAL' ? 'Partiel' : s.paymentStatus === 'EXEMPT' ? 'Exonéré' : 'Non payé'}
            </Badge>
          : <span className="class-detail__empty">—</span>,
    },
  ];

  const subjectColumns = [
    {
      key: 'name',
      label: 'Matière',
      render: (s) => (
        <div>
          <div className="class-detail__subject-name">{s.name}</div>
          {s.code && <div className="class-detail__subject-code">{s.code}</div>}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Catégorie',
      render: (s) => s.category ?? <span className="class-detail__empty">—</span>,
    },
  ];

  const tabs = [
    {
      key: 'students',
      label: `Élèves (${students.length})`,
      content: (
        <Table
          columns={studentColumns}
          rows={students}
          emptyMessage="Aucun élève dans cette classe"
        />
      ),
    },
    {
      key: 'subjects',
      label: `Matières (${subjects.length})`,
      content: (
        <Table
          columns={subjectColumns}
          rows={subjects}
          emptyMessage="Aucune matière assignée"
        />
      ),
    },
  ];

  return (
    <AppShell title={cls.name}>
      <PageHeader
        title={cls.name}
        subtitle={`${LEVEL_LABEL[cls.level] ?? cls.level} — ${cls.academicYear ?? ''}`}
        actions={
          <Link to={`/teacher/reports/new?classId=${cls.id}`}>
            <Button icon="📋">Créer un bulletin</Button>
          </Link>
        }
      />

      <div className="class-detail__meta">
        <span className="class-detail__meta-item">
          🎒 <strong>{students.length}</strong> élève{students.length !== 1 ? 's' : ''}
        </span>
        <span className="class-detail__meta-item">
          📚 <strong>{subjects.length}</strong> matière{subjects.length !== 1 ? 's' : ''}
        </span>
        {cls.teacher && (
          <span className="class-detail__meta-item">
            👩‍🏫 <strong>{cls.teacher.firstName} {cls.teacher.lastName}</strong>
          </span>
        )}
      </div>

      <Tabs tabs={tabs} defaultTab="students" />
    </AppShell>
  );
}

export default ClassDetailPage;
