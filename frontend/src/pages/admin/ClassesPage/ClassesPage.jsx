import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { classesService } from '../../../services/classesService';
import { usersService } from '../../../services/usersService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Table from '../../../components/common/Table/Table';
import Modal from '../../../components/common/Modal/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import Badge from '../../../components/common/Badge/Badge';
import SearchBar from '../../../components/common/SearchBar/SearchBar';
import './ClassesPage.css';

const LEVELS = [
  { value: 'MATERNELLE', label: 'Maternelle' },
  { value: 'PRIMAIRE',   label: 'Primaire' },
  { value: 'COLLEGE',    label: 'Collège' },
  { value: 'LYCEE',      label: 'Lycée' },
];

const LEVEL_VARIANT = {
  MATERNELLE: 'info',
  PRIMAIRE:   'success',
  COLLEGE:    'warning',
  LYCEE:      'danger',
};

const EMPTY_FORM = { name: '', level: '', academicYear: '', capacity: '', teacherId: '' };

function validate(form) {
  const errors = {};
  if (!form.name.trim())         errors.name         = 'Nom de classe requis';
  if (!form.level)               errors.level        = 'Niveau requis';
  if (!form.academicYear.trim()) errors.academicYear = 'Année scolaire requise';
  return errors;
}

function ClassForm({ form, errors, onChange, teachers }) {
  const teacherOptions = teachers.map((t) => ({
    value: t.id,
    label: `${t.firstName} ${t.lastName}`,
  }));

  return (
    <div className="class-form">
      <Input
        id="name" label="Nom de la classe" required
        value={form.name} error={errors.name}
        placeholder="ex: 6ème A, Terminale D1"
        onChange={(e) => onChange('name', e.target.value)}
      />
      <div className="class-form__row">
        <Select
          id="level" label="Niveau" required
          value={form.level} error={errors.level}
          placeholder="Sélectionner un niveau"
          options={LEVELS}
          onChange={(e) => onChange('level', e.target.value)}
        />
        <Input
          id="academicYear" label="Année scolaire" required
          value={form.academicYear} error={errors.academicYear}
          placeholder="ex: 2024-2025"
          onChange={(e) => onChange('academicYear', e.target.value)}
        />
      </div>
      <div className="class-form__row">
        <Input
          id="capacity" label="Capacité" type="number" min="1"
          value={form.capacity} error={errors.capacity}
          placeholder="Optionnel"
          onChange={(e) => onChange('capacity', e.target.value)}
        />
        <Select
          id="teacherId" label="Enseignant principal"
          value={form.teacherId}
          placeholder="Aucun"
          options={teacherOptions}
          onChange={(e) => onChange('teacherId', e.target.value)}
        />
      </div>
    </div>
  );
}

function ClassesPage() {
  const qc = useQueryClient();
  const [search, setSearch]     = useState('');
  const [levelFilter, setLevel] = useState('');
  const [modal, setModal]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm]   = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => usersService.listTeachers().then((r) => r.data),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return classes.filter((c) => {
      const matchSearch = !q || c.name.toLowerCase().includes(q);
      const matchLevel  = !levelFilter || c.level === levelFilter;
      return matchSearch && matchLevel;
    });
  }, [classes, search, levelFilter]);

  const createMutation = useMutation({
    mutationFn: (data) => classesService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); toast.success('Classe créée'); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur de création'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => classesService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); toast.success('Classe mise à jour'); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur de mise à jour'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => classesService.deactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); toast.success('Classe désactivée'); setConfirm(null); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setErrors({});
    setModal('create');
  }

  function openEdit(cls) {
    setSelected(cls);
    setForm({
      name:         cls.name         ?? '',
      level:        cls.level        ?? '',
      academicYear: cls.academicYear ?? '',
      capacity:     cls.capacity     ?? '',
      teacherId:    cls.teacher?.id  ?? '',
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
      ...form,
      capacity:  form.capacity  ? Number(form.capacity) : undefined,
      teacherId: form.teacherId || undefined,
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
      key: 'name',
      label: 'Classe',
      render: (c) => <span className="classes-table__name">{c.name}</span>,
    },
    {
      key: 'level',
      label: 'Niveau',
      render: (c) => (
        <Badge variant={LEVEL_VARIANT[c.level] ?? 'default'}>
          {LEVELS.find((l) => l.value === c.level)?.label ?? c.level}
        </Badge>
      ),
    },
    {
      key: 'academicYear',
      label: 'Année scolaire',
      render: (c) => c.academicYear ?? '—',
    },
    {
      key: 'teacher',
      label: 'Enseignant principal',
      render: (c) =>
        c.teacher
          ? `${c.teacher.firstName} ${c.teacher.lastName}`
          : <span className="classes-table__empty">—</span>,
    },
    {
      key: 'students',
      label: 'Élèves',
      render: (c) => {
        const count = c._count?.students ?? c.studentsCount ?? '—';
        const cap   = c.capacity ? ` / ${c.capacity}` : '';
        return `${count}${cap}`;
      },
    },
    {
      key: 'status',
      label: 'Statut',
      render: (c) => (
        <Badge variant={c.isActive !== false ? 'success' : 'default'}>
          {c.isActive !== false ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      style: { width: '120px', textAlign: 'right' },
      render: (c) => (
        <div className="classes-table__actions">
          <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Modifier</Button>
          {c.isActive !== false && (
            <Button size="sm" variant="ghost" onClick={() => setConfirm(c)}>Désactiver</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Classes">
      <PageHeader
        title="Classes"
        subtitle={`${classes.length} classe${classes.length !== 1 ? 's' : ''}`}
        actions={<Button icon="+" onClick={openCreate}>Nouvelle classe</Button>}
      />

      <div className="classes-page__toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par nom…"
          className="classes-page__search"
        />
        <Select
          id="level-filter"
          value={levelFilter}
          placeholder="Tous les niveaux"
          options={LEVELS}
          onChange={(e) => setLevel(e.target.value)}
          className="classes-page__level-filter"
        />
      </div>

      <Table
        columns={columns}
        rows={filtered}
        loading={isLoading}
        emptyMessage="Aucune classe trouvée"
      />

      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? 'Nouvelle classe' : 'Modifier la classe'}
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
        <ClassForm form={form} errors={errors} onChange={handleChange} teachers={teachers} />
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => deactivateMutation.mutate(confirm.id)}
        loading={deactivateMutation.isPending}
        title="Désactiver la classe"
        message={`Désactiver la classe "${confirm?.name}" ? Les données seront conservées.`}
        confirmLabel="Désactiver"
        variant="danger"
      />
    </AppShell>
  );
}

export default ClassesPage;
