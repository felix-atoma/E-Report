import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { schoolDocumentsService } from '../../../services/schoolDocumentsService';
import { uploadService } from '../../../services/uploadService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Textarea from '../../../components/common/Textarea/Textarea';
import Select from '../../../components/common/Select/Select';
import Loading from '../../../components/common/Loading/Loading';
import EmptyState from '../../../components/common/EmptyState/EmptyState';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import './SchoolDocumentsPage.css';

const CATEGORY_KEYS = ['CIRCULAR', 'REPORT', 'CONTRACT', 'SCHEDULE', 'FINANCIAL', 'EXAM', 'STAFF', 'STUDENT', 'OTHER'];

const CAT_ICONS = {
  CIRCULAR: '📢', REPORT: '📊', CONTRACT: '📝', SCHEDULE: '📅',
  FINANCIAL: '💰', EXAM: '🎓', STAFF: '👤', STUDENT: '🎒', OTHER: '📁',
};

const EMPTY_FORM = { title: '', category: 'OTHER', description: '', isPublic: false };

export default function SchoolDocumentsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const categoryOptions = CATEGORY_KEYS.map((k) => ({
    value: k, label: t(`schoolDocs.categories.${k}`),
  }));

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['school-documents', filter],
    queryFn: () => schoolDocumentsService.list(filter ? { category: filter } : {}).then((r) => r.data),
  });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: async () => {
      let fileUrl = form.fileUrl;
      if (file) {
        setUploading(true);
        const res = await uploadService.upload(file, 'document');
        fileUrl = res.data?.url ?? res.data;
        setUploading(false);
      }
      if (!fileUrl) throw new Error(t('schoolDocs.fileRequired'));
      return schoolDocumentsService.create({ ...form, fileUrl });
    },
    onSuccess: () => {
      toast.success(t('schoolDocs.toast.created'));
      qc.invalidateQueries(['school-documents']);
      setOpen(false);
      setForm(EMPTY_FORM);
      setFile(null);
    },
    onError: (e) => {
      setUploading(false);
      toast.error(e.message ?? t('schoolDocs.toast.saveError'));
    },
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id) => schoolDocumentsService.remove(id),
    onSuccess: () => { toast.success(t('schoolDocs.toast.deleted')); qc.invalidateQueries(['school-documents']); },
    onError: () => toast.error(t('schoolDocs.toast.deleteError')),
  });

  const { mutate: togglePublic } = useMutation({
    mutationFn: ({ id, isPublic }) => schoolDocumentsService.update(id, { isPublic }),
    onSuccess: () => qc.invalidateQueries(['school-documents']),
  });

  const closePanel = () => { setOpen(false); setForm(EMPTY_FORM); setFile(null); };

  const confirmDelete = (doc) => {
    if (window.confirm(t('schoolDocs.confirmDelete', { title: doc.title }))) remove(doc.id);
  };

  if (isLoading) return <AppShell title={t('schoolDocs.title')}><Loading /></AppShell>;

  const allFilters = [
    { value: '', label: t('schoolDocs.categories.all') },
    ...CATEGORY_KEYS.map((k) => ({ value: k, label: t(`schoolDocs.categories.${k}`) })),
  ];

  return (
    <AppShell title={t('schoolDocs.title')}>
      <PageHeader
        title={t('schoolDocs.title')}
        subtitle={t('schoolDocs.subtitle')}
        actions={<Button icon="+" onClick={() => setOpen(true)}>{t('schoolDocs.add')}</Button>}
      />

      <div className="sdoc-filters">
        {allFilters.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`sdoc-filter${filter === c.value ? ' active' : ''}`}
            onClick={() => setFilter(c.value)}
          >
            {c.value && <span>{CAT_ICONS[c.value]}</span>}
            {c.label}
          </button>
        ))}
      </div>

      {docs.length === 0 ? (
        <EmptyState message={t('schoolDocs.empty')} />
      ) : (
        <div className="sdoc-grid">
          {docs.map((doc) => (
            <Card key={doc.id} className="sdoc-card">
              <div className="sdoc-card__icon">{CAT_ICONS[doc.category] ?? '📁'}</div>
              <div className="sdoc-card__body">
                <strong className="sdoc-card__title">{doc.title}</strong>
                {doc.description && <p className="sdoc-card__desc">{doc.description}</p>}
                <div className="sdoc-card__meta">
                  <span className="sdoc-badge">{t(`schoolDocs.categories.${doc.category}`, doc.category)}</span>
                  {doc.isPublic && <span className="sdoc-badge sdoc-badge--public">{t('schoolDocs.publicBadge')}</span>}
                  {doc.fileSize && <span className="sdoc-badge">{(doc.fileSize / 1024).toFixed(0)} KB</span>}
                </div>
              </div>
              <div className="sdoc-card__actions">
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="sdoc-action-btn sdoc-action-btn--view">
                  {t('schoolDocs.open')}
                </a>
                <button
                  type="button"
                  className={`sdoc-action-btn ${doc.isPublic ? 'sdoc-action-btn--unpublish' : 'sdoc-action-btn--publish'}`}
                  onClick={() => togglePublic({ id: doc.id, isPublic: !doc.isPublic })}
                >
                  {doc.isPublic ? t('schoolDocs.unpublish') : t('schoolDocs.publish')}
                </button>
                <button
                  type="button"
                  className="sdoc-action-btn sdoc-action-btn--delete"
                  onClick={() => confirmDelete(doc)}
                >
                  {t('schoolDocs.delete')}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <OffCanvas
        open={open}
        onClose={closePanel}
        title={t('schoolDocs.form.offcanvasTitle')}
        subtitle={t('schoolDocs.form.subtitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closePanel} disabled={saving || uploading}>
              {t('action.cancel')}
            </Button>
            <Button onClick={() => save()} disabled={saving || uploading || !form.title}>
              {uploading ? t('schoolDocs.form.uploading') : saving ? t('schoolDocs.form.saving') : t('schoolDocs.form.submit')}
            </Button>
          </>
        }
      >
        <div className="sdoc-form">
          <Input
            id="sdoc-title"
            label={t('schoolDocs.form.titleField')}
            required
            placeholder={t('schoolDocs.form.titlePlaceholder')}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Select
            id="sdoc-category"
            label={t('schoolDocs.form.category')}
            value={form.category}
            options={categoryOptions}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <Textarea
            id="sdoc-description"
            label={t('schoolDocs.form.description')}
            rows={3}
            placeholder="Description optionnelle…"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="form-field">
            <label className="form-field__label">{t('schoolDocs.form.fileLabel')} <span className="form-field__required"> *</span></label>
            <input
              type="file"
              className="sdoc-file-input"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
              onChange={(e) => setFile(e.target.files[0] ?? null)}
            />
            {file && <span className="sdoc-file-name">{file.name}</span>}
          </div>
          <label className="form-field__checkbox">
            <input
              id="sdoc-public"
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
            />
            {t('schoolDocs.form.visible')}
          </label>
        </div>
      </OffCanvas>
    </AppShell>
  );
}
