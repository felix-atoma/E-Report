import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { studentsService } from '../../../services/studentsService';
import { classesService } from '../../../services/classesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Table from '../../../components/common/Table/Table';
import Modal from '../../../components/common/Modal/Modal';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import Avatar from '../../../components/common/Avatar/Avatar';
import Badge from '../../../components/common/Badge/Badge';
import SearchBar from '../../../components/common/SearchBar/SearchBar';
import './StudentsPage.css';

const GENDER_OPTIONS = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
];

const EMPTY_FORM = {
  firstName: '', lastName: '', dateOfBirth: '', gender: '',
  classId: '', matricule: '', parentEmail: '',
};

function validate(form) {
  const errors = {};
  if (!form.firstName.trim()) errors.firstName = 'Prénom requis';
  if (!form.lastName.trim())  errors.lastName  = 'Nom requis';
  if (!form.classId)          errors.classId   = 'Classe requise';
  if (form.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail)) {
    errors.parentEmail = 'Email invalide';
  }
  return errors;
}

function StudentForm({ form, errors, onChange, classes }) {
  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="student-form">
      <div className="student-form__row">
        <Input
          id="firstName" label="Prénom" required
          value={form.firstName} error={errors.firstName}
          onChange={(e) => onChange('firstName', e.target.value)}
        />
        <Input
          id="lastName" label="Nom" required
          value={form.lastName} error={errors.lastName}
          onChange={(e) => onChange('lastName', e.target.value)}
        />
      </div>
      <div className="student-form__row">
        <Input
          id="dateOfBirth" label="Date de naissance" type="date"
          value={form.dateOfBirth} error={errors.dateOfBirth}
          onChange={(e) => onChange('dateOfBirth', e.target.value)}
        />
        <Select
          id="gender" label="Sexe"
          value={form.gender} error={errors.gender}
          placeholder="Sélectionner"
          options={GENDER_OPTIONS}
          onChange={(e) => onChange('gender', e.target.value)}
        />
      </div>
      <div className="student-form__row">
        <Select
          id="classId" label="Classe" required
          value={form.classId} error={errors.classId}
          placeholder="Sélectionner une classe"
          options={classOptions}
          onChange={(e) => onChange('classId', e.target.value)}
        />
        <Input
          id="matricule" label="Matricule"
          value={form.matricule}
          placeholder="Optionnel"
          onChange={(e) => onChange('matricule', e.target.value)}
        />
      </div>
      <Input
        id="parentEmail" label="Email du parent"
        value={form.parentEmail} error={errors.parentEmail}
        placeholder="Optionnel — invite le parent à créer un compte"
        onChange={(e) => onChange('parentEmail', e.target.value)}
      />
    </div>
  );
}

function StudentsPage() {
  const qc = useQueryClient();
  const [search, setSearch]     = useState('');
  const [classFilter, setClass] = useState('');
  const [modal, setModal]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentsService.list().then((r) => r.data),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => {
      const name = `${s.firstName} ${s.lastName}`.toLowerCase();
      const matchSearch = !q || name.includes(q) || (s.matricule ?? '').toLowerCase().includes(q);
      const matchClass  = !classFilter || s.classId === classFilter;
      return matchSearch && matchClass;
    });
  }, [students, search, classFilter]);

  const createMutation = useMutation({
    mutationFn: (data) => studentsService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); toast.success('Élève ajouté'); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur de création'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => studentsService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); toast.success('Élève mis à jour'); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur de mise à jour'),
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setErrors({});
    setModal('create');
  }

  function openEdit(student) {
    setSelected(student);
    setForm({
      firstName:   student.firstName   ?? '',
      lastName:    student.lastName    ?? '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
      gender:      student.gender      ?? '',
      classId:     student.classId     ?? '',
      matricule:   student.matricule   ?? '',
      parentEmail: student.parentEmail ?? '',
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
      dateOfBirth: form.dateOfBirth || undefined,
      gender:      form.gender      || undefined,
      matricule:   form.matricule   || undefined,
      parentEmail: form.parentEmail || undefined,
    };
    if (modal === 'create') {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: selected.id, data: payload });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));

  const columns = [
    {
      key: 'name',
      label: 'Élève',
      render: (s) => (
        <div className="students-table__student">
          <Avatar name={`${s.firstName} ${s.lastName}`} size="sm" />
          <div>
            <div className="students-table__name">{s.firstName} {s.lastName}</div>
            {s.matricule && <div className="students-table__sub">{s.matricule}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'class',
      label: 'Classe',
      render: (s) => s.class?.name ?? classes.find((c) => c.id === s.classId)?.name ?? '—',
    },
    {
      key: 'gender',
      label: 'Sexe',
      render: (s) => s.gender === 'M' ? 'M' : s.gender === 'F' ? 'F' : '—',
    },
    {
      key: 'dateOfBirth',
      label: 'Naissance',
      render: (s) =>
        s.dateOfBirth
          ? new Date(s.dateOfBirth).toLocaleDateString('fr-FR')
          : <span className="students-table__empty">—</span>,
    },
    {
      key: 'parent',
      label: 'Parent',
      render: (s) =>
        s.parent
          ? `${s.parent.firstName} ${s.parent.lastName}`
          : s.parentEmail
            ? <Badge variant="info">Invité</Badge>
            : <span className="students-table__empty">—</span>,
    },
    {
      key: 'actions',
      label: '',
      style: { width: '80px', textAlign: 'right' },
      render: (s) => (
        <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>Modifier</Button>
      ),
    },
  ];

  return (
    <AppShell title="Élèves">
      <PageHeader
        title="Élèves"
        subtitle={`${students.length} élève${students.length !== 1 ? 's' : ''}`}
        actions={<Button icon="+" onClick={openCreate}>Nouvel élève</Button>}
      />

      <div className="students-page__toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par nom ou matricule…"
          className="students-page__search"
        />
        <Select
          id="class-filter"
          value={classFilter}
          placeholder="Toutes les classes"
          options={classOptions}
          onChange={(e) => setClass(e.target.value)}
          className="students-page__class-filter"
        />
      </div>

      <Table
        columns={columns}
        rows={filtered}
        loading={isLoading}
        emptyMessage="Aucun élève trouvé"
      />

      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? 'Nouvel élève' : "Modifier l'élève"}
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
        <StudentForm form={form} errors={errors} onChange={handleChange} classes={classes} />
      </Modal>
    </AppShell>
  );
}

export default StudentsPage;
