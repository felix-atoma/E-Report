import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { subjectsService } from '../../../services/subjectsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Table from '../../../components/common/Table/Table';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog';
import BulkBar from '../../../components/common/BulkBar/BulkBar';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import Badge from '../../../components/common/Badge/Badge';
import SearchBar from '../../../components/common/SearchBar/SearchBar';
import './SubjectsPage.css';

const CATEGORY_KEYS = ['SCIENCES', 'LETTRES', 'MATHS', 'LANGUES', 'ARTS', 'EPS', 'TECHNIQUES', 'AUTRE'];

const CATEGORY_VARIANT = {
  SCIENCES: 'info', LETTRES: 'success', MATHS: 'warning',
  LANGUES: 'danger', ARTS: 'default', EPS: 'info',
  TECHNIQUES: 'warning', AUTRE: 'default',
};

const EMPTY_FORM = { nameFr: '', code: '', category: '', description: '', maxScore: 20, hasCoefficient: true };

function validate(form, t) {
  const errors = {};
  if (!form.nameFr.trim()) errors.nameFr = t('subjects.errors.nameRequired');
  return errors;
}

const MAX_SCORE_OPTIONS = [
  { value: 20, label: 'Sur 20  (/20)' },
  { value: 10, label: 'Sur 10  (/10)' },
];

function SubjectForm({ form, errors, onChange, t }) {
  const categories = CATEGORY_KEYS.map((k) => ({ value: k, label: t(`subjects.categories.${k}`) }));
  return (
    <div className="subject-form">
      <div className="subject-form__row">
        <Input
          id="nameFr" label={t('subjects.name')} required
          value={form.nameFr} error={errors.nameFr}
          placeholder={t('subjects.namePlaceholder')}
          onChange={(e) => onChange('nameFr', e.target.value)}
        />
        <Input
          id="code" label={t('subjects.code')}
          value={form.code}
          placeholder={t('subjects.codePlaceholder')}
          onChange={(e) => onChange('code', e.target.value)}
        />
      </div>
      <Select
        id="category" label={t('subjects.category')}
        value={form.category}
        placeholder={t('subjects.allCategories')}
        options={categories}
        onChange={(e) => onChange('category', e.target.value)}
      />
      <div className="subject-form__row">
        <Select
          id="maxScore"
          label={t('subjects.maxScore')}
          value={form.maxScore}
          options={MAX_SCORE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
          onChange={(e) => onChange('maxScore', Number(e.target.value))}
        />
        <div className="form-field">
          <label className="form-field__label">{t('subjects.hasCoefficient')}</label>
          <label className="subject-form__toggle">
            <input
              type="checkbox"
              checked={form.hasCoefficient}
              onChange={(e) => onChange('hasCoefficient', e.target.checked)}
            />
            <span>{form.hasCoefficient ? t('subjects.coefYes') : t('subjects.coefNo')}</span>
          </label>
        </div>
      </div>
      <Input
        id="description" label={t('subjects.description')}
        value={form.description}
        placeholder={t('common.optional')}
        onChange={(e) => onChange('description', e.target.value)}
      />
    </div>
  );
}

function SubjectsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch]     = useState('');
  const [catFilter, setCat]     = useState('');
  const [modal, setModal]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm]   = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsService.list().then((r) => r.data),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return subjects.filter((s) => {
      const matchSearch = !q
        || (s.nameFr ?? '').toLowerCase().includes(q)
        || (s.code  ?? '').toLowerCase().includes(q);
      const matchCat = !catFilter || s.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [subjects, search, catFilter]);

  const createMutation = useMutation({
    mutationFn: (data) => subjectsService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); toast.success(t('subjects.toast.created')); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? t('common.errorGeneric')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => subjectsService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); toast.success(t('subjects.toast.updated')); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? t('common.errorGeneric')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => subjectsService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); toast.success(t('subjects.toast.deleted')); setConfirm(null); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? t('common.errorGeneric')),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => subjectsService.bulkDelete(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      toast.success(t('subjects.toast.deleted'));
      setSelectedIds(new Set());
      setBulkConfirm(false);
    },
    onError: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); toast.error(t('common.errorGeneric')); setBulkConfirm(false); setSelectedIds(new Set()); },
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setErrors({});
    setModal('create');
  }

  function openEdit(subject) {
    setSelected(subject);
    setForm({
      nameFr:         subject.nameFr         ?? '',
      code:           subject.code           ?? '',
      category:       subject.category       ?? '',
      description:    subject.description    ?? '',
      maxScore:       subject.maxScore       ?? 20,
      hasCoefficient: subject.hasCoefficient ?? true,
    });
    setErrors({});
    setModal('edit');
  }

  function closeModal() {
    setModal(null);
    setSelected(null);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function handleSubmit() {
    const errs = validate(form, t);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const payload = {
      nameFr:         form.nameFr,
      code:           form.code        || undefined,
      category:       form.category    || undefined,
      description:    form.description || undefined,
      maxScore:       form.maxScore,
      hasCoefficient: form.hasCoefficient,
    };
    if (modal === 'create') {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: selected.id, data: payload });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const categoryOptions = CATEGORY_KEYS.map((k) => ({ value: k, label: t(`subjects.categories.${k}`) }));

  const columns = [
    {
      key: 'nameFr',
      label: t('subjects.name'),
      render: (s) => (
        <Link to={`/admin/subjects/${s.id}`} className="subjects-table__profile-link">
          <div className="subjects-table__name">{s.nameFr}</div>
          {s.code && <div className="subjects-table__code">{s.code}</div>}
        </Link>
      ),
    },
    {
      key: 'category',
      label: t('subjects.category'),
      render: (s) =>
        s.category
          ? <Badge variant={CATEGORY_VARIANT[s.category] ?? 'default'}>
              {t(`subjects.categories.${s.category}`, s.category)}
            </Badge>
          : <span className="subjects-table__empty">—</span>,
    },
    {
      key: 'description',
      label: t('subjects.description'),
      render: (s) => s.description ?? <span className="subjects-table__empty">—</span>,
    },
    {
      key: 'actions',
      label: '',
      style: { width: '120px', textAlign: 'right' },
      render: (s) => (
        <div className="subjects-table__actions">
          <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>{t('action.edit')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(s)}>{t('action.delete')}</Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell title={t('subjects.title')}>
      <PageHeader
        title={t('subjects.title')}
        subtitle={`${subjects.length} ${t('subjects.title').toLowerCase()}`}
        actions={<Button icon="+" onClick={openCreate}>{t('subjects.addSubject')}</Button>}
      />

      <div className="subjects-page__toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('subjects.searchPlaceholder')}
          className="subjects-page__search"
        />
        <Select
          id="cat-filter"
          value={catFilter}
          placeholder={t('subjects.allCategories')}
          options={categoryOptions}
          onChange={(e) => setCat(e.target.value)}
          className="subjects-page__cat-filter"
        />
      </div>

      <BulkBar
        count={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onDelete={() => setBulkConfirm(true)}
        loading={bulkDeleteMutation.isPending}
      />

      <Table
        columns={columns}
        rows={filtered}
        loading={isLoading}
        emptyMessage={t('subjects.noFound')}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <OffCanvas
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? t('subjects.addSubject') : t('subjects.editSubject')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSaving}>{t('action.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? t('action.saving') : t('action.save')}
            </Button>
          </>
        }
      >
        <SubjectForm form={form} errors={errors} onChange={handleChange} t={t} />
      </OffCanvas>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate(confirm.id)}
        loading={deleteMutation.isPending}
        title={t('subjects.deleteSubject')}
        message={`${t('common.confirmDelete')} "${confirm?.nameFr}" ? ${t('common.deleteWarning')}`}
        confirmLabel={t('action.delete')}
        variant="danger"
      />

      <ConfirmDialog
        open={bulkConfirm}
        onClose={() => setBulkConfirm(false)}
        onConfirm={() => bulkDeleteMutation.mutate([...selectedIds])}
        loading={bulkDeleteMutation.isPending}
        title={`${t('action.delete')} (${selectedIds.size})`}
        message={t('common.deleteWarning')}
        confirmLabel={t('action.delete')}
        variant="danger"
      />
    </AppShell>
  );
}

export default SubjectsPage;
