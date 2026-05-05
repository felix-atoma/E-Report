import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { studentsService } from '../../../services/studentsService';
import { classesService } from '../../../services/classesService';
import { usersService } from '../../../services/usersService';
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

const EMPTY_FORM = {
  name: '', dateOfBirth: '', sex: '', classId: '', parentEmail: '',
};

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Nom complet requis';
  if (form.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail)) {
    errors.parentEmail = 'Email invalide';
  }
  return errors;
}

function PhotoPicker({ preview, existingSrc, name, fileInputRef, onPhotoClick }) {
  return (
    <div className="student-form__photo-row">
      <div
        className="student-form__photo-wrap"
        onClick={onPhotoClick}
        title="Cliquer pour ajouter une photo"
      >
        {preview ? (
          <img src={preview} alt="Aperçu" className="student-form__photo-img" />
        ) : existingSrc ? (
          <img src={existingSrc} alt={name} className="student-form__photo-img" />
        ) : (
          <div className="student-form__photo-placeholder">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
        )}
        <div className="student-form__photo-overlay">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          {preview ? 'Changer' : 'Ajouter'}
        </div>
      </div>
      <div className="student-form__photo-info">
        <span className="student-form__photo-label">Photo d'identité</span>
        <span className="student-form__photo-hint">JPG, PNG ou WebP — max 5 Mo</span>
        {preview && <span className="student-form__photo-ready">✓ Photo prête</span>}
      </div>
    </div>
  );
}

function StudentForm({ form, errors, onChange, classes, isCreate, existingAdmissionNumber,
  photoPreview, existingPhotoSrc, fileInputRef, onPhotoClick }) {
  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="student-form">
      <PhotoPicker
        preview={photoPreview}
        existingSrc={existingPhotoSrc}
        name={form.name}
        fileInputRef={fileInputRef}
        onPhotoClick={onPhotoClick}
      />

      <Input
        id="name" label="Nom complet" required
        value={form.name} error={errors.name}
        placeholder="ex: Kofi Ama"
        onChange={(e) => onChange('name', e.target.value)}
      />

      {isCreate ? (
        <div className="student-form__matricule-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Le numéro matricule sera généré automatiquement à la création.
        </div>
      ) : (
        <div className="student-form__matricule-display">
          <span className="student-form__matricule-label">Numéro matricule</span>
          <span className="student-form__matricule-value">{existingAdmissionNumber}</span>
        </div>
      )}

      <div className="student-form__row">
        <Input
          id="dateOfBirth" label="Date de naissance" type="date"
          value={form.dateOfBirth} error={errors.dateOfBirth}
          onChange={(e) => onChange('dateOfBirth', e.target.value)}
        />
        <Select
          id="sex" label="Sexe"
          value={form.sex}
          placeholder="Sélectionner"
          options={[{ value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }]}
          onChange={(e) => onChange('sex', e.target.value)}
        />
      </div>
      <Select
        id="classId" label="Classe"
        value={form.classId} error={errors.classId}
        placeholder="Sélectionner une classe"
        options={classOptions}
        onChange={(e) => onChange('classId', e.target.value)}
      />
      <Input
        id="parentEmail" label="Email du parent"
        value={form.parentEmail} error={errors.parentEmail}
        placeholder="Optionnel — lie le compte parent"
        onChange={(e) => onChange('parentEmail', e.target.value)}
      />
    </div>
  );
}

function StudentsPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);

  const [search, setSearch]       = useState('');
  const [classFilter, setClass]   = useState('');
  const [modal, setModal]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

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
      const name = (s.user?.name ?? s.admissionNumber ?? '').toLowerCase();
      const matchSearch = !q || name.includes(q) || s.admissionNumber.toLowerCase().includes(q);
      const matchClass  = !classFilter || s.classes?.some((cs) => cs.classId === classFilter);
      return matchSearch && matchClass;
    });
  }, [students, search, classFilter]);

  async function uploadPhotoIfNeeded(userId) {
    if (!photoFile || !userId) return;
    try {
      await usersService.uploadAvatar(userId, photoFile);
    } catch {
      toast.error('Élève créé, mais échec de l\'envoi de la photo.');
    }
  }

  const createMutation = useMutation({
    mutationFn: (data) => studentsService.create(data),
    onSuccess: async (res) => {
      await uploadPhotoIfNeeded(res.data?.user?.id);
      qc.invalidateQueries({ queryKey: ['students'] });
      toast.success('Élève ajouté');
      closeModal();
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de création'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => studentsService.update(id, data),
    onSuccess: async (res) => {
      const userId = res.data?.user?.id ?? selected?.user?.id;
      await uploadPhotoIfNeeded(userId);
      qc.invalidateQueries({ queryKey: ['students'] });
      toast.success('Élève mis à jour');
      closeModal();
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de mise à jour'),
  });

  function handlePhotoClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop lourde (max 5 Mo).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
    setPhotoFile(file);
    e.target.value = '';
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setErrors({});
    setPhotoFile(null);
    setPhotoPreview(null);
    setModal('create');
  }

  function openEdit(student) {
    setSelected(student);
    setForm({
      name:        student.user?.name ?? '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
      sex:         student.sex ?? '',
      classId:     student.classes?.[0]?.classId ?? '',
      parentEmail: student.parent?.email ?? '',
    });
    setErrors({});
    setPhotoFile(null);
    setPhotoPreview(null);
    setModal('edit');
  }

  function closeModal() {
    setModal(null);
    setSelected(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function handleSubmit() {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const payload = {
      name:        form.name,
      dateOfBirth: form.dateOfBirth || undefined,
      sex:         form.sex         || undefined,
      classId:     form.classId     || undefined,
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
      render: (s) => {
        const displayName = s.user?.name ?? s.admissionNumber ?? '—';
        return (
          <div className="students-table__student">
            <Avatar name={displayName} src={s.user?.profileImage} size="sm" />
            <div>
              <div className="students-table__name">{displayName}</div>
              <div className="students-table__sub">{s.admissionNumber}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'class',
      label: 'Classe',
      render: (s) => s.classes?.[0]?.class?.name ?? <span className="students-table__empty">—</span>,
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
        s.parent ? s.parent.name : <span className="students-table__empty">—</span>,
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

      {/* Hidden file input — lives outside the modal so ref is always mounted */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
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
        <StudentForm
          form={form}
          errors={errors}
          onChange={handleChange}
          classes={classes}
          isCreate={modal === 'create'}
          existingAdmissionNumber={selected?.admissionNumber}
          photoPreview={photoPreview}
          existingPhotoSrc={modal === 'edit' ? selected?.user?.profileImage : null}
          fileInputRef={fileInputRef}
          onPhotoClick={handlePhotoClick}
        />
      </Modal>
    </AppShell>
  );
}

export default StudentsPage;
