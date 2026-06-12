import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { reportsService } from '../../../services/reportsService';
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

const EMPTY_CREATE = { classId: '', academicYear: '', termType: 'TRIMESTRE', termNumber: '1', termName: '' };

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

async function downloadReportPdf(reportId) {
  const res = await api.get(`/reports/${reportId}/pdf-download`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bulletin-${reportId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportCardsPage() {
  const { t } = useTranslation();
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
  const [downloadingId, setDownloadingId] = useState(null);

  const [createOpen, setCreateOpen]   = useState(false);
  const [createForm, setCreateForm]   = useState(EMPTY_CREATE);
  const [createErrors, setCreateErrors] = useState({});

  const TERM_TYPES = [
    { value: 'TRIMESTRE', label: t('reportCardsFull.termTypes.TRIMESTRE') },
    { value: 'SEMESTRE',  label: t('reportCardsFull.termTypes.SEMESTRE') },
    { value: 'CUSTOM',    label: t('reportCardsFull.termTypes.CUSTOM') },
  ];

  const TRIMESTRE_NAMES = [
    { value: '1', label: t('reportCardsFull.trimestreNames.1') },
    { value: '2', label: t('reportCardsFull.trimestreNames.2') },
    { value: '3', label: t('reportCardsFull.trimestreNames.3') },
  ];

  const SEMESTRE_NAMES = [
    { value: '1', label: t('reportCardsFull.semestreNames.1') },
    { value: '2', label: t('reportCardsFull.semestreNames.2') },
  ];

  const STATUS_OPTIONS = [
    { value: 'DRAFT',     label: t('reportCardsFull.statusOptions.DRAFT') },
    { value: 'REVIEW',    label: t('reportCardsFull.statusOptions.REVIEW') },
    { value: 'PUBLISHED', label: t('reportCardsFull.statusOptions.PUBLISHED') },
  ];

  const termOptions = [
    { value: '1', label: t('reportCardsFull.termOptions.1') },
    { value: '2', label: t('reportCardsFull.termOptions.2') },
    { value: '3', label: t('reportCardsFull.termOptions.3') },
  ];

  const createMutation = useMutation({
    mutationFn: (data) => reportsService.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      const count = res.data?.count ?? 1;
      toast.success(t('reportCards.toast.created', { count }));
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      setCreateErrors({});
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('reportCards.toast.error')),
  });

  function setCreate(field, value) {
    setCreateForm((f) => ({ ...f, [field]: value }));
    if (createErrors[field]) setCreateErrors((e) => ({ ...e, [field]: undefined }));
  }

  function handleCreate() {
    const e = {};
    if (!createForm.classId)             e.classId     = t('reportCards.errors.classRequired');
    if (!createForm.academicYear.trim()) e.academicYear = t('reportCards.errors.yearRequired');
    if (!createForm.termType)            e.termType    = t('reportCards.errors.termTypeRequired');
    if (!createForm.termNumber)          e.termNumber  = t('reportCards.errors.termRequired');
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
      toast.success(t('reportCardsFull.toast.publishedNotif'));
      setConfirmPublish(null);
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message ?? t('reportCardsFull.toast.publishError'));
      setConfirmPublish(null);
    },
  });

  const pdfMut = useMutation({
    mutationFn: (id) => reportsService.regeneratePdf(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      toast.success(t('reportCardsFull.toast.pdfOk'));
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? t('reportCardsFull.toast.pdfError')),
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
      const msg = t('reportCardsFull.toast.bulkPublished', { published })
        + (skipped > 0 ? ' ' + t('reportCardsFull.toast.bulkSkipped', { skipped }) : '');
      toast.success(msg);
    } catch (e) {
      toast.error(e?.response?.data?.message ?? t('reportCardsFull.toast.bulkError'));
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
      toast.success(t('reportCardsFull.toast.zipOk'));
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? t('reportCardsFull.toast.zipError'));
    } finally {
      setZipping(false);
    }
  };

  const columns = [
    {
      key: 'class',
      label: t('reportCardsFull.columns.class'),
      render: (r) => <span className="reports-table__class">{r.class?.name ?? '—'}</span>,
    },
    {
      key: 'student',
      label: t('reportCardsFull.columns.student'),
      render: (r) => r.student?.user?.name ?? r.student?.admissionNumber ?? '—',
    },
    {
      key: 'term',
      label: t('reportCardsFull.columns.term'),
      render: (r) => r.termName ?? `Trimestre ${r.termNumber}`,
    },
    {
      key: 'academicYear',
      label: t('reportCardsFull.columns.academicYear'),
      render: (r) => r.academicYear ?? '—',
    },
    {
      key: 'status',
      label: t('reportCardsFull.columns.status'),
      render: (r) => <StatusPill status={r.status} />,
    },
    {
      key: 'updatedAt',
      label: t('reportCardsFull.columns.updatedAt'),
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
            <Button size="sm" variant="ghost">{t('reportCardsFull.open')}</Button>
          </Link>
          {(r.status === 'REVIEW' || r.status === 'PUBLISHED') && (
            <Link to={`/reports/${r.id}/print`} target="_blank" rel="noreferrer">
              <Button size="sm" variant="ghost">{t('reportCardsFull.printBtn')}</Button>
            </Link>
          )}
          {isAdmin && r.status === 'REVIEW' && (
            <Button size="sm" variant="primary" onClick={() => setConfirmPublish(r)}>
              {t('reportCardsFull.publish')}
            </Button>
          )}
          {r.status === 'PUBLISHED' && (
            <Button
              size="sm"
              variant="ghost"
              disabled={downloadingId === r.id}
              onClick={async () => {
                setDownloadingId(r.id);
                try {
                  await downloadReportPdf(r.id);
                } catch {
                  toast.error(t('reportCardsFull.toast.downloadError'));
                } finally {
                  setDownloadingId(null);
                }
              }}
            >
              {downloadingId === r.id ? t('reportCardsFull.downloading') : t('reportCardsFull.pdfBtn')}
            </Button>
          )}
          {r.status === 'PUBLISHED' && r.academicYear && (
            <Link to={`/reports/annual/${r.studentId}/${r.academicYear}`} target="_blank" rel="noreferrer">
              <Button size="sm" variant="ghost" title={t('reportCardsFull.annual')}>{t('reportCardsFull.annual')}</Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell title={t('reportCards.title')}>
      <PageHeader
        title={t('reportCards.title')}
        subtitle={t('reportCardsFull.subtitle', { count: filtered.length })}
        actions={<Button size="sm" onClick={() => setCreateOpen(true)}>{t('reportCards.newReports')}</Button>}
      />

      <div className="reports-page__toolbar">
        <Select
          id="class-filter"
          value={classFilter}
          placeholder={t('reportCards.filter.allClasses')}
          options={classOptions}
          onChange={(e) => setClass(e.target.value)}
          className="reports-page__filter"
        />
        <Select
          id="status-filter"
          value={statusFilter}
          placeholder={t('reportCards.filter.allStatuses')}
          options={STATUS_OPTIONS}
          onChange={(e) => setStatus(e.target.value)}
          className="reports-page__filter"
        />
        <Select
          id="year-filter"
          value={yearFilter}
          placeholder={t('reportCards.filter.allYears')}
          options={yearOptions}
          onChange={(e) => setYear(e.target.value)}
          className="reports-page__filter"
        />
        <Select
          id="term-filter"
          value={termFilter}
          placeholder={t('reportCards.filter.allTerms')}
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
            {bulkPublishing
              ? t('reportCardsFull.bulkPublishing')
              : t('reportCardsFull.publishAllBtn', { count: reviewCount })}
          </Button>
        )}
        {isAdmin && (
          <Button
            variant="ghost"
            onClick={handleBulkZip}
            disabled={!canZip || zipping}
          >
            {zipping
              ? t('reportCardsFull.zipping')
              : classFilter
                ? t('reportCardsFull.zipClass')
                : t('reportCardsFull.zipEcole')}
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        rows={filtered}
        loading={isLoading}
        emptyMessage={t('reportCards.noReports')}
      />

      <ConfirmDialog
        open={!!confirmPublish}
        onClose={() => setConfirmPublish(null)}
        onConfirm={() => publishMut.mutate(confirmPublish.id)}
        loading={publishMut.isPending}
        title={t('reportCardsFull.publishTitle')}
        message={t('reportCardsFull.publishMessage', {
          name: confirmPublish?.student?.user?.name ?? confirmPublish?.student?.admissionNumber ?? '…',
          term: confirmPublish?.termName ?? '',
        })}
        confirmLabel={t('reportCardsFull.publish')}
        variant="primary"
      />
      <ConfirmDialog
        open={confirmBulkPublish}
        onClose={() => setConfirmBulkPublish(false)}
        onConfirm={handleBulkPublish}
        loading={bulkPublishing}
        title={t('reportCardsFull.bulkPublishTitle')}
        message={t('reportCardsFull.bulkPublishMessage', { count: reviewCount })}
        confirmLabel={t('reportCardsFull.bulkPublishBtn', { count: reviewCount })}
        variant="primary"
      />

      <OffCanvas
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateForm(EMPTY_CREATE); setCreateErrors({}); }}
        title={t('reportCardsFull.newReportTitle')}
        subtitle={t('reportCardsFull.newReportSubtitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? t('reportCardsFull.creating') : t('reportCardsFull.createBtn')}
            </Button>
          </>
        }
      >
        <div className="create-report-form">
          <Select
            id="cr-classId"
            label={t('reportCards.class')}
            required
            value={createForm.classId}
            error={createErrors.classId}
            placeholder={t('reportCards.filter.allClasses')}
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(e) => setCreate('classId', e.target.value)}
          />

          <Input
            id="cr-academicYear"
            label={t('reportCards.academicYear')}
            required
            value={createForm.academicYear}
            error={createErrors.academicYear}
            placeholder="ex : 2024-2025"
            onChange={(e) => setCreate('academicYear', e.target.value)}
          />

          <div className="create-report-form__row">
            <div className="form-field">
              <label className="form-field__label">{t('reportCards.termType')} <span style={{color:'#ef4444'}}>*</span></label>
              <select
                className="create-report-form__select"
                value={createForm.termType}
                onChange={(e) => { setCreate('termType', e.target.value); setCreate('termNumber', '1'); }}
              >
                {TERM_TYPES.map((tt) => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
              </select>
              {createErrors.termType && <span className="create-report-form__error">{createErrors.termType}</span>}
            </div>

            {createForm.termType !== 'CUSTOM' ? (
              <div className="form-field">
                <label className="form-field__label">{t('reportCards.currentPeriod')} <span style={{color:'#ef4444'}}>*</span></label>
                <select
                  className="create-report-form__select"
                  value={createForm.termNumber}
                  onChange={(e) => setCreate('termNumber', e.target.value)}
                >
                  {(createForm.termType === 'SEMESTRE' ? SEMESTRE_NAMES : TRIMESTRE_NAMES)
                    .map((tt) => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
                </select>
                {createErrors.termNumber && <span className="create-report-form__error">{createErrors.termNumber}</span>}
              </div>
            ) : (
              <Input
                id="cr-termName"
                label={t('reportCardsFull.customPeriodName')}
                required
                value={createForm.termName}
                error={createErrors.termNumber}
                placeholder={t('reportCardsFull.customPeriodPlaceholder')}
                onChange={(e) => { setCreate('termName', e.target.value); setCreate('termNumber', '1'); }}
              />
            )}
          </div>

          {createForm.termType !== 'CUSTOM' && (
            <Input
              id="cr-termLabel"
              label={t('reportCardsFull.termPeriodLabel')}
              value={createForm.termName}
              placeholder={`ex : ${createForm.termType === 'SEMESTRE' ? t('reportCardsFull.semestreNames.1') + ' 2024' : t('reportCardsFull.trimestreNames.1') + ' 2024'}`}
              onChange={(e) => setCreate('termName', e.target.value)}
            />
          )}
        </div>
      </OffCanvas>
    </AppShell>
  );
}

export default ReportCardsPage;
