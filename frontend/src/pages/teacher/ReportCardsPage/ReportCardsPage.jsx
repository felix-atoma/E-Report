import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { reportsService } from '../../../services/reportsService';
import { classesService } from '../../../services/classesService';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Table from '../../../components/common/Table/Table';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import StatusPill from '../../../components/common/StatusPill/StatusPill';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog';
import './ReportCardsPage.css';

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

const STATUS_OPTIONS = [
  { value: 'DRAFT',     label: 'Brouillon' },
  { value: 'REVIEW',    label: 'En révision' },
  { value: 'PUBLISHED', label: 'Publié' },
];

function ReportCardsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const qc = useQueryClient();
  const [classFilter, setClass]    = useState('');
  const [statusFilter, setStatus]  = useState('');
  const [yearFilter, setYear]      = useState('');
  const [termFilter, setTerm]      = useState('');
  const [confirmPublish, setConfirmPublish] = useState(null);
  const [zipping, setZipping] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsService.list().then((r) => r.data),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const publishMut = useMutation({
    mutationFn: (id) => reportsService.publish(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Bulletin publié ! Le PDF sera disponible dans quelques instants.');
      setConfirmPublish(null);
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message ?? 'Erreur lors de la publication');
      setConfirmPublish(null);
    },
  });

  const pdfMut = useMutation({
    mutationFn: (id) => reportsService.regeneratePdf(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      toast.success('PDF généré avec succès !');
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Erreur lors de la génération PDF'),
  });

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchClass  = !classFilter  || r.classId     === classFilter;
      const matchStatus = !statusFilter || r.status      === statusFilter;
      const matchYear   = !yearFilter   || r.academicYear === yearFilter;
      const matchTerm   = !termFilter   || String(r.termNumber) === termFilter;
      return matchClass && matchStatus && matchYear && matchTerm;
    });
  }, [reports, classFilter, statusFilter, yearFilter, termFilter]);

  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));

  const yearOptions = useMemo(() => {
    const years = [...new Set(reports.map((r) => r.academicYear).filter(Boolean))].sort().reverse();
    return years.map((y) => ({ value: y, label: y }));
  }, [reports]);

  const termOptions = [
    { value: '1', label: 'Trimestre 1' },
    { value: '2', label: 'Trimestre 2' },
    { value: '3', label: 'Trimestre 3' },
  ];

  const canZip = isAdmin && yearFilter && termFilter;

  const handleBulkZip = async () => {
    if (!canZip) return;
    setZipping(true);
    try {
      const res = await reportsService.bulkZip({
        academicYear: yearFilter,
        termNumber: Number(termFilter),
        ...(classFilter ? { classId: classFilter } : {}),
      });
      const scope = classFilter
        ? (classes.find((c) => c.id === classFilter)?.name ?? 'classe')
        : 'ecole';
      downloadBlob(res.data, `bulletins-${yearFilter}-T${termFilter}-${scope}.zip`);
      toast.success('ZIP téléchargé avec succès !');
    } catch (e) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Erreur lors de la génération du ZIP';
      toast.error(msg);
    } finally {
      setZipping(false);
    }
  };

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
      style: { width: '220px', textAlign: 'right' },
      render: (r) => (
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Link to={isAdmin ? `/admin/reports/${r.id}` : `/teacher/reports/${r.id}`}>
            <Button size="sm" variant="ghost">Ouvrir</Button>
          </Link>
          {(r.status === 'REVIEW' || r.status === 'PUBLISHED') && (
            <Link to={`/reports/${r.id}/print`} target="_blank" rel="noreferrer">
              <Button size="sm" variant="ghost">🖨️ Imprimer</Button>
            </Link>
          )}
          {isAdmin && r.status === 'REVIEW' && (
            <Button size="sm" variant="primary" onClick={() => setConfirmPublish(r)}>
              Publier
            </Button>
          )}
          {r.status === 'PUBLISHED' && (
            r.pdfUrl ? (
              <a href={r.pdfUrl} download target="_blank" rel="noreferrer">
                <Button size="sm" variant="ghost">📥 PDF</Button>
              </a>
            ) : isAdmin ? (
              <Button size="sm" variant="ghost" onClick={() => pdfMut.mutate(r.id)} disabled={pdfMut.isPending}>
                {pdfMut.isPending ? '⏳…' : '🔄 Générer PDF'}
              </Button>
            ) : null
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
          <Link to={isAdmin ? '/admin/reports/new' : '/teacher/reports/new'}>
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
        <Select
          id="year-filter"
          value={yearFilter}
          placeholder="Année scolaire"
          options={yearOptions}
          onChange={(e) => setYear(e.target.value)}
          className="reports-page__filter"
        />
        <Select
          id="term-filter"
          value={termFilter}
          placeholder="Trimestre"
          options={termOptions}
          onChange={(e) => setTerm(e.target.value)}
          className="reports-page__filter"
        />
        {isAdmin && (
          <Button
            variant="primary"
            onClick={handleBulkZip}
            disabled={!canZip || zipping}
            title={!yearFilter || !termFilter ? 'Sélectionnez une année et un trimestre' : classFilter ? 'Télécharger les bulletins de cette classe en ZIP' : 'Télécharger tous les bulletins de l\'école en ZIP'}
          >
            {zipping ? '⏳ Génération…' : `📦 ZIP ${classFilter ? 'Classe' : 'École'}`}
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        rows={filtered}
        loading={isLoading}
        emptyMessage="Aucun bulletin trouvé"
      />

      <ConfirmDialog
        open={!!confirmPublish}
        onClose={() => setConfirmPublish(null)}
        onConfirm={() => publishMut.mutate(confirmPublish.id)}
        loading={publishMut.isPending}
        title="Publier le bulletin"
        message={`Publier le bulletin de ${confirmPublish?.student?.user?.name ?? confirmPublish?.student?.admissionNumber ?? '…'} (${confirmPublish?.termName ?? ''}) ? Cette action est irréversible.`}
        confirmLabel="Publier"
        variant="primary"
      />
    </AppShell>
  );
}

export default ReportCardsPage;
