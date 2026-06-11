import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { reportsService } from '../../../services/reportsService';

async function downloadReportPdf(reportId) {
  const res = await api.get(`/reports/${reportId}/pdf-download`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bulletin-${reportId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
import { classesService } from '../../../services/classesService';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Table from '../../../components/common/Table/Table';
import Select from '../../../components/common/Select/Select';
import Input from '../../../components/common/Input/Input';
import Button from '../../../components/common/Button/Button';
import StatusPill from '../../../components/common/StatusPill/StatusPill';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog';
import './ReportCardsPage.css';

const TERM_TYPES = [
  { value: 'TRIMESTRE', label: 'Trimestriel' },
  { value: 'SEMESTRE',  label: 'Semestriel' },
  { value: 'CUSTOM',    label: 'Personnalisé' },
];
const TRIMESTRE_NAMES = [
  { value: '1', label: '1er trimestre' },
  { value: '2', label: '2ème trimestre' },
  { value: '3', label: '3ème trimestre' },
];
const SEMESTRE_NAMES = [
  { value: '1', label: '1er semestre' },
  { value: '2', label: '2ème semestre' },
];
const EMPTY_CREATE = { classId: '', academicYear: '', termType: 'TRIMESTRE', termNumber: '1', termName: '' };

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
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [confirmBulkPublish, setConfirmBulkPublish] = useState(false);

  // ── Create bulletin OffCanvas ──────────────────────────────────────────
  const [createOpen, setCreateOpen]   = useState(false);
  const [createForm, setCreateForm]   = useState(EMPTY_CREATE);
  const [createErrors, setCreateErrors] = useState({});

  const createMutation = useMutation({
    mutationFn: (data) => reportsService.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      const count = res.data?.count ?? 1;
      toast.success(`${count} bulletin${count !== 1 ? 's' : ''} créé${count !== 1 ? 's' : ''}`);
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      setCreateErrors({});
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de création'),
  });

  function setCreate(field, value) {
    setCreateForm((f) => ({ ...f, [field]: value }));
    if (createErrors[field]) setCreateErrors((e) => ({ ...e, [field]: undefined }));
  }

  function handleCreate() {
    const e = {};
    if (!createForm.classId)             e.classId     = 'Classe requise';
    if (!createForm.academicYear.trim()) e.academicYear = 'Année scolaire requise';
    if (!createForm.termType)            e.termType    = 'Type de période requis';
    if (!createForm.termNumber)          e.termNumber  = 'Période requise';
    if (Object.keys(e).length) { setCreateErrors(e); return; }
    createMutation.mutate({
      classId:      createForm.classId,
      academicYear: createForm.academicYear,
      termType:     createForm.termType,
      termNumber:   Number(createForm.termNumber),
      ...(createForm.termName ? { termName: createForm.termName } : {}),
    });
  }

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
  const canBulkPublish = isAdmin && classFilter && yearFilter && termFilter;
  const reviewCount = filtered.filter((r) => r.status === 'REVIEW').length;

  const handleBulkPublish = async () => {
    setBulkPublishing(true);
    setConfirmBulkPublish(false);
    try {
      const res = await reportsService.bulkPublish({
        classId: classFilter,
        academicYear: yearFilter,
        termNumber: Number(termFilter),
      });
      const { published, skipped } = res.data;
      qc.invalidateQueries({ queryKey: ['reports'] });
      toast.success(`${published} bulletin${published !== 1 ? 's' : ''} publié${published !== 1 ? 's' : ''} ! Les notifications WhatsApp/Email partent dans 2 min.${skipped > 0 ? ` (${skipped} ignorés)` : ''}`);
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Erreur lors de la publication groupée');
    } finally {
      setBulkPublishing(false);
    }
  };

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
            <Button size="sm" variant="ghost" onClick={() => downloadReportPdf(r.id)}>
              📥 PDF
            </Button>
          )}
          {r.status === 'PUBLISHED' && r.academicYear && (
            <Link to={`/reports/annual/${r.studentId}/${r.academicYear}`} target="_blank" rel="noreferrer">
              <Button size="sm" variant="ghost" title="Voir le relevé annuel de cet élève">📋 Annuel</Button>
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
        actions={<Button size="sm" onClick={() => setCreateOpen(true)}>+ Nouveau bulletin</Button>}
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
        {isAdmin && canBulkPublish && reviewCount > 0 && (
          <Button
            variant="primary"
            onClick={() => setConfirmBulkPublish(true)}
            disabled={bulkPublishing}
          >
            {bulkPublishing ? '⏳ Publication…' : `🚀 Publier tout (${reviewCount})`}
          </Button>
        )}
        {isAdmin && (
          <Button
            variant="ghost"
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
      <ConfirmDialog
        open={confirmBulkPublish}
        onClose={() => setConfirmBulkPublish(false)}
        onConfirm={handleBulkPublish}
        loading={bulkPublishing}
        title="Publier tous les bulletins"
        message={`Publier les ${reviewCount} bulletin${reviewCount !== 1 ? 's' : ''} en statut "En révision" pour cette classe ? Les parents recevront une notification WhatsApp et email dans les 2 minutes. Cette action est irréversible.`}
        confirmLabel={`Publier ${reviewCount} bulletin${reviewCount !== 1 ? 's' : ''}`}
        variant="primary"
      />

      {/* Nouveau bulletin de notes — OffCanvas */}
      <OffCanvas
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateForm(EMPTY_CREATE); setCreateErrors({}); }}
        title="Nouveau bulletin de notes"
        subtitle="Générez les bulletins pour une classe et une période"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Création…' : 'Créer le bulletin'}
            </Button>
          </>
        }
      >
        <div className="create-report-form">
          <Select
            id="cr-classId"
            label="Classe"
            required
            value={createForm.classId}
            error={createErrors.classId}
            placeholder="Sélectionner une classe"
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(e) => setCreate('classId', e.target.value)}
          />

          <Input
            id="cr-academicYear"
            label="Année scolaire"
            required
            value={createForm.academicYear}
            error={createErrors.academicYear}
            placeholder="ex : 2024-2025"
            onChange={(e) => setCreate('academicYear', e.target.value)}
          />

          <div className="create-report-form__row">
            <div className="form-field">
              <label className="form-field__label">Type de période <span style={{color:'#ef4444'}}>*</span></label>
              <select
                className="create-report-form__select"
                value={createForm.termType}
                onChange={(e) => { setCreate('termType', e.target.value); setCreate('termNumber', '1'); }}
              >
                {TERM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {createErrors.termType && <span className="create-report-form__error">{createErrors.termType}</span>}
            </div>

            {createForm.termType !== 'CUSTOM' ? (
              <div className="form-field">
                <label className="form-field__label">Période <span style={{color:'#ef4444'}}>*</span></label>
                <select
                  className="create-report-form__select"
                  value={createForm.termNumber}
                  onChange={(e) => setCreate('termNumber', e.target.value)}
                >
                  {(createForm.termType === 'SEMESTRE' ? SEMESTRE_NAMES : TRIMESTRE_NAMES)
                    .map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {createErrors.termNumber && <span className="create-report-form__error">{createErrors.termNumber}</span>}
              </div>
            ) : (
              <Input
                id="cr-termName"
                label="Nom de la période"
                required
                value={createForm.termName}
                error={createErrors.termNumber}
                placeholder="ex : Période 1"
                onChange={(e) => { setCreate('termName', e.target.value); setCreate('termNumber', '1'); }}
              />
            )}
          </div>

          {createForm.termType !== 'CUSTOM' && (
            <Input
              id="cr-termLabel"
              label="Libellé personnalisé (optionnel)"
              value={createForm.termName}
              placeholder={`ex : ${createForm.termType === 'SEMESTRE' ? '1er semestre 2024' : '1er trimestre 2024'}`}
              onChange={(e) => setCreate('termName', e.target.value)}
            />
          )}
        </div>
      </OffCanvas>
    </AppShell>
  );
}

export default ReportCardsPage;
