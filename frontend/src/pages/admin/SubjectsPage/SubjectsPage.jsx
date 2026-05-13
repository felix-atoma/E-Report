import { useState, useMemo } from 'react';
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

const CATEGORIES = [
  { value: 'SCIENCES',   label: 'Sciences' },
  { value: 'LETTRES',    label: 'Lettres' },
  { value: 'MATHS',      label: 'Mathématiques' },
  { value: 'LANGUES',    label: 'Langues' },
  { value: 'ARTS',       label: 'Arts' },
  { value: 'EPS',        label: 'EPS' },
  { value: 'TECHNIQUES', label: 'Techniques' },
  { value: 'AUTRE',      label: 'Autre' },
];

const CATEGORY_VARIANT = {
  SCIENCES: 'info', LETTRES: 'success', MATHS: 'warning',
  LANGUES: 'danger', ARTS: 'default', EPS: 'info',
  TECHNIQUES: 'warning', AUTRE: 'default',
};

const EMPTY_FORM = { nameFr: '', code: '', category: '', description: '' };

function validate(form) {
  const errors = {};
  if (!form.nameFr.trim()) errors.nameFr = 'Nom de la matière requis';
  return errors;
}

function SubjectForm({ form, errors, onChange }) {
  return (
    <div className="subject-form">
      <div className="subject-form__row">
        <Input
          id="nameFr" label="Nom de la matière" required
          value={form.nameFr} error={errors.nameFr}
          placeholder="ex: Mathématiques, Français…"
          onChange={(e) => onChange('nameFr', e.target.value)}
        />
        <Input
          id="code" label="Code"
          value={form.code}
          placeholder="ex: MATH (auto si vide)"
          onChange={(e) => onChange('code', e.target.value)}
        />
      </div>
      <Select
        id="category" label="Catégorie"
        value={form.category}
        placeholder="Sélectionner une catégorie"
        options={CATEGORIES}
        onChange={(e) => onChange('category', e.target.value)}
      />
      <Input
        id="description" label="Description"
        value={form.description}
        placeholder="Optionnel"
        onChange={(e) => onChange('description', e.target.value)}
      />
    </div>
  );
}

function SubjectsPage() {
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); toast.success('Matière créée'); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur de création'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => subjectsService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); toast.success('Matière mise à jour'); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur de mise à jour'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => subjectsService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); toast.success('Matière supprimée'); setConfirm(null); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur de suppression'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => subjectsService.bulkDelete(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      toast.success(`${selectedIds.size} matière${selectedIds.size > 1 ? 's' : ''} supprimée${selectedIds.size > 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      setBulkConfirm(false);
    },
    onError: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); toast.error('Certaines suppressions ont échoué'); setBulkConfirm(false); setSelectedIds(new Set()); },
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setErrors({});
    setModal('create');
  }

  function openEdit(subject) {
    setSelected(subject);
    setForm({
      nameFr:      subject.nameFr      ?? '',
      code:        subject.code        ?? '',
      category:    subject.category    ?? '',
      description: subject.description ?? '',
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
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const payload = {
      nameFr:      form.nameFr,
      code:        form.code        || undefined,
      category:    form.category    || undefined,
      description: form.description || undefined,
    };
    if (modal === 'create') {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: selected.id, data: payload });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const columns = [
    {
      key: 'nameFr',
      label: 'Matière',
      render: (s) => (
        <Link to={`/admin/subjects/${s.id}`} className="subjects-table__profile-link">
          <div className="subjects-table__name">{s.nameFr}</div>
          {s.code && <div className="subjects-table__code">{s.code}</div>}
        </Link>
      ),
    },
    {
      key: 'category',
      label: 'Catégorie',
      render: (s) =>
        s.category
          ? <Badge variant={CATEGORY_VARIANT[s.category] ?? 'default'}>
              {CATEGORIES.find((c) => c.value === s.category)?.label ?? s.category}
            </Badge>
          : <span className="subjects-table__empty">—</span>,
    },
    {
      key: 'description',
      label: 'Description',
      render: (s) => s.description ?? <span className="subjects-table__empty">—</span>,
    },
    {
      key: 'actions',
      label: '',
      style: { width: '120px', textAlign: 'right' },
      render: (s) => (
        <div className="subjects-table__actions">
          <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>Modifier</Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(s)}>Supprimer</Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Matières">
      <PageHeader
        title="Matières"
        subtitle={`${subjects.length} matière${subjects.length !== 1 ? 's' : ''}`}
        actions={<Button icon="+" onClick={openCreate}>Nouvelle matière</Button>}
      />

      <div className="subjects-page__toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par nom ou code…"
          className="subjects-page__search"
        />
        <Select
          id="cat-filter"
          value={catFilter}
          placeholder="Toutes les catégories"
          options={CATEGORIES}
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
        emptyMessage="Aucune matière trouvée"
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <OffCanvas
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? 'Nouvelle matière' : 'Modifier la matière'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSaving}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <SubjectForm form={form} errors={errors} onChange={handleChange} />
      </OffCanvas>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate(confirm.id)}
        loading={deleteMutation.isPending}
        title="Supprimer la matière"
        message={`Supprimer "${confirm?.nameFr}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
      />

      <ConfirmDialog
        open={bulkConfirm}
        onClose={() => setBulkConfirm(false)}
        onConfirm={() => bulkDeleteMutation.mutate([...selectedIds])}
        loading={bulkDeleteMutation.isPending}
        title={`Supprimer ${selectedIds.size} matière${selectedIds.size > 1 ? 's' : ''}`}
        message={`Supprimer définitivement ${selectedIds.size} matière${selectedIds.size > 1 ? 's' : ''} ? Tous les cours, fiches de notes et données associées seront effacés. Cette action est irréversible.`}
        confirmLabel={`Supprimer ${selectedIds.size} matière${selectedIds.size > 1 ? 's' : ''}`}
        variant="danger"
      />
    </AppShell>
  );
}

export default SubjectsPage;
