import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { reportsService } from '../../../services/reportsService';
import { classesService } from '../../../services/classesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Table from '../../../components/common/Table/Table';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import StatusPill from '../../../components/common/StatusPill/StatusPill';
import './ReportCardsPage.css';

const STATUS_OPTIONS = [
  { value: 'DRAFT',     label: 'Brouillon' },
  { value: 'REVIEW',    label: 'En révision' },
  { value: 'PUBLISHED', label: 'Publié' },
];

function ReportCardsPage() {
  const [classFilter, setClass]   = useState('');
  const [statusFilter, setStatus] = useState('');

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsService.list().then((r) => r.data),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchClass  = !classFilter  || r.classId === classFilter;
      const matchStatus = !statusFilter || r.status  === statusFilter;
      return matchClass && matchStatus;
    });
  }, [reports, classFilter, statusFilter]);

  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));

  const columns = [
    {
      key: 'class',
      label: 'Classe',
      render: (r) => <span className="reports-table__class">{r.class?.name ?? '—'}</span>,
    },
    {
      key: 'student',
      label: 'Élève',
      render: (r) => r.student?.user?.name ?? r.student?.admissionNumber ?? '—',
    },
    {
      key: 'term',
      label: 'Période',
      render: (r) => r.termName ?? `Trimestre ${r.termNumber}`,
    },
    {
      key: 'academicYear',
      label: 'Année scolaire',
      render: (r) => r.academicYear ?? '—',
    },
    {
      key: 'status',
      label: 'Statut',
      render: (r) => <StatusPill status={r.status} />,
    },
    {
      key: 'updatedAt',
      label: 'Modifié le',
      render: (r) =>
        r.updatedAt
          ? new Date(r.updatedAt).toLocaleDateString('fr-FR')
          : '—',
    },
    {
      key: 'actions',
      label: '',
      style: { width: '160px', textAlign: 'right' },
      render: (r) => (
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
          <Link to={`/teacher/reports/${r.id}`}>
            <Button size="sm" variant="ghost">Ouvrir</Button>
          </Link>
          {r.status === 'PUBLISHED' && (
            <Link to={`/reports/${r.id}/print`} target="_blank" rel="noreferrer">
              <Button size="sm" variant="ghost">🖨️ PDF</Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Bulletins">
      <PageHeader
        title="Bulletins de notes"
        subtitle={`${filtered.length} bulletin${filtered.length !== 1 ? 's' : ''}`}
        actions={
          <Link to="/teacher/reports/new">
            <Button icon="+">Nouveau bulletin</Button>
          </Link>
        }
      />

      <div className="reports-page__toolbar">
        <Select
          id="class-filter"
          value={classFilter}
          placeholder="Toutes les classes"
          options={classOptions}
          onChange={(e) => setClass(e.target.value)}
          className="reports-page__filter"
        />
        <Select
          id="status-filter"
          value={statusFilter}
          placeholder="Tous les statuts"
          options={STATUS_OPTIONS}
          onChange={(e) => setStatus(e.target.value)}
          className="reports-page__filter"
        />
      </div>

      <Table
        columns={columns}
        rows={filtered}
        loading={isLoading}
        emptyMessage="Aucun bulletin trouvé"
      />
    </AppShell>
  );
}

export default ReportCardsPage;
