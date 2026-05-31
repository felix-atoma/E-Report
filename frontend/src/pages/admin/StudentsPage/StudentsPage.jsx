import { useState, useMemo, useRef, useCallback } from 'react';
import { downloadCSV } from '../../../utils/csvExport';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { studentsService } from '../../../services/studentsService';
import { classesService } from '../../../services/classesService';
import { usersService } from '../../../services/usersService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Table from '../../../components/common/Table/Table';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog';
import BulkBar from '../../../components/common/BulkBar/BulkBar';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import Avatar from '../../../components/common/Avatar/Avatar';
import Badge from '../../../components/common/Badge/Badge';
import SearchBar from '../../../components/common/SearchBar/SearchBar';
import './StudentsPage.css';

const EMPTY_FORM = {
  name: '', dateOfBirth: '', sex: '', classId: '', parentEmail: '',
  // Extended profile fields
  address: '', city: '',
  fatherName: '', fatherPhone: '',
  motherName: '', motherPhone: '',
  emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
  bloodType: '', medicalConditions: '',
  previousSchool: '', birthPlace: '',
  studentStatus: 'ACTIVE',
};

const STUDENT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'GRADUATED', label: 'Diplômé' },
  { value: 'TRANSFERRED', label: 'Transféré' },
  { value: 'WITHDRAWN', label: 'Retiré' },
  { value: 'SUSPENDED', label: 'Suspendu' },
];

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
  photoPreview, existingPhotoSrc, fileInputRef, onPhotoClick, showExtended, onToggleExtended }) {
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

      {/* Toggle extended fields */}
      <button
        type="button"
        className="student-form__toggle-extended"
        onClick={onToggleExtended}
      >
        {showExtended ? '▲ Moins d\'informations' : '▼ Plus d\'informations (adresse, famille, santé…)'}
      </button>

      {showExtended && (
        <>
          <div className="student-form__section-title">Statut &amp; Scolarité</div>
          <div className="student-form__row">
            <Select
              id="studentStatus"
              label="Statut"
              value={form.studentStatus}
              options={STUDENT_STATUS_OPTIONS}
              onChange={(e) => onChange('studentStatus', e.target.value)}
            />
            <Input
              id="previousSchool"
              label="École précédente"
              value={form.previousSchool}
              placeholder="Optionnel"
              onChange={(e) => onChange('previousSchool', e.target.value)}
            />
          </div>
          <div className="student-form__row">
            <Input
              id="birthPlace"
              label="Lieu de naissance"
              value={form.birthPlace}
              onChange={(e) => onChange('birthPlace', e.target.value)}
            />
            <Input
              id="bloodType"
              label="Groupe sanguin"
              value={form.bloodType}
              placeholder="ex: A+, O-, …"
              onChange={(e) => onChange('bloodType', e.target.value)}
            />
          </div>
          <Input
            id="medicalConditions"
            label="Conditions médicales"
            value={form.medicalConditions}
            placeholder="Allergies, maladies chroniques…"
            onChange={(e) => onChange('medicalConditions', e.target.value)}
          />

          <div className="student-form__section-title">Adresse</div>
          <div className="student-form__row">
            <Input
              id="address"
              label="Adresse"
              value={form.address}
              onChange={(e) => onChange('address', e.target.value)}
            />
            <Input
              id="city"
              label="Ville"
              value={form.city}
              onChange={(e) => onChange('city', e.target.value)}
            />
          </div>

          <div className="student-form__section-title">Père</div>
          <div className="student-form__row">
            <Input
              id="fatherName"
              label="Nom du père"
              value={form.fatherName}
              onChange={(e) => onChange('fatherName', e.target.value)}
            />
            <Input
              id="fatherPhone"
              label="Téléphone père"
              value={form.fatherPhone}
              onChange={(e) => onChange('fatherPhone', e.target.value)}
            />
          </div>

          <div className="student-form__section-title">Mère</div>
          <div className="student-form__row">
            <Input
              id="motherName"
              label="Nom de la mère"
              value={form.motherName}
              onChange={(e) => onChange('motherName', e.target.value)}
            />
            <Input
              id="motherPhone"
              label="Téléphone mère"
              value={form.motherPhone}
              onChange={(e) => onChange('motherPhone', e.target.value)}
            />
          </div>

          <div className="student-form__section-title">Contact d'urgence</div>
          <div className="student-form__row">
            <Input
              id="emergencyContactName"
              label="Nom"
              value={form.emergencyContactName}
              onChange={(e) => onChange('emergencyContactName', e.target.value)}
            />
            <Input
              id="emergencyContactPhone"
              label="Téléphone"
              value={form.emergencyContactPhone}
              onChange={(e) => onChange('emergencyContactPhone', e.target.value)}
            />
          </div>
          <Input
            id="emergencyContactRelation"
            label="Relation"
            value={form.emergencyContactRelation}
            placeholder="ex: Oncle, Tuteur…"
            onChange={(e) => onChange('emergencyContactRelation', e.target.value)}
          />
        </>
      )}
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
  const [confirm, setConfirm]     = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showExtended, setShowExtended] = useState(false);

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
      qc.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Élève ajouté');
      closeModal();
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de création'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => studentsService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); qc.invalidateQueries({ queryKey: ['analytics'] }); toast.success('Élève supprimé'); setConfirm(null); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur de suppression'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => studentsService.bulkDelete(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      toast.success(`${selectedIds.size} élève${selectedIds.size > 1 ? 's' : ''} supprimé${selectedIds.size > 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      setBulkConfirm(false);
    },
    onError: () => { qc.invalidateQueries({ queryKey: ['students'] }); toast.error('Certaines suppressions ont échoué'); setBulkConfirm(false); setSelectedIds(new Set()); },
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
      // Extended fields
      address:                  student.address ?? '',
      city:                     student.city ?? '',
      fatherName:               student.fatherName ?? '',
      fatherPhone:              student.fatherPhone ?? '',
      motherName:               student.motherName ?? '',
      motherPhone:              student.motherPhone ?? '',
      emergencyContactName:     student.emergencyContactName ?? '',
      emergencyContactPhone:    student.emergencyContactPhone ?? '',
      emergencyContactRelation: student.emergencyContactRelation ?? '',
      bloodType:                student.bloodType ?? '',
      medicalConditions:        student.medicalConditions ?? '',
      previousSchool:           student.previousSchool ?? '',
      birthPlace:               student.birthPlace ?? '',
      studentStatus:            student.studentStatus ?? 'ACTIVE',
    });
    setErrors({});
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowExtended(false);
    setModal('edit');
  }

  function closeModal() {
    setModal(null);
    setSelected(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowExtended(false);
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
      // Extended profile
      address:                  form.address                  || undefined,
      city:                     form.city                     || undefined,
      fatherName:               form.fatherName               || undefined,
      fatherPhone:              form.fatherPhone              || undefined,
      motherName:               form.motherName               || undefined,
      motherPhone:              form.motherPhone              || undefined,
      emergencyContactName:     form.emergencyContactName     || undefined,
      emergencyContactPhone:    form.emergencyContactPhone    || undefined,
      emergencyContactRelation: form.emergencyContactRelation || undefined,
      bloodType:                form.bloodType                || undefined,
      medicalConditions:        form.medicalConditions        || undefined,
      previousSchool:           form.previousSchool           || undefined,
      birthPlace:               form.birthPlace               || undefined,
      studentStatus:            form.studentStatus            || undefined,
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
          <Link to={`/admin/students/${s.id}`} className="students-table__profile-link">
            <Avatar name={displayName} src={s.user?.profileImage} size="sm" />
            <div>
              <div className="students-table__name">{displayName}</div>
              <div className="students-table__sub">{s.admissionNumber}</div>
            </div>
          </Link>
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
      style: { width: '160px', textAlign: 'right' },
      render: (s) => (
        <div className="students-table__actions">
          <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>Modifier</Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(s)}>Supprimer</Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Élèves">
      <PageHeader
        title="Élèves"
        subtitle={`${students.length} élève${students.length !== 1 ? 's' : ''}`}
        actions={
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <Button
              variant="secondary"
              onClick={() => {
                const rows = filtered.map((s) => ({
                  Matricule: s.admissionNumber,
                  Nom: s.user?.name ?? '',
                  Sexe: s.sex ?? '',
                  'Date naissance': s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('fr-FR') : '',
                  'Date inscription': s.enrollmentDate ? new Date(s.enrollmentDate).toLocaleDateString('fr-FR') : '',
                  Statut: s.studentStatus ?? 'ACTIVE',
                  Classe: s.classes?.[0]?.class?.name ?? '',
                  Ville: s.city ?? '',
                  'Tél père': s.fatherPhone ?? '',
                  'Tél mère': s.motherPhone ?? '',
                  'Contact urgence': s.emergencyContactPhone ?? '',
                }));
                downloadCSV(rows, `eleves-${new Date().toISOString().slice(0,10)}.csv`);
              }}
            >
              ↓ CSV
            </Button>
            <Button icon="+" onClick={openCreate}>Nouvel élève</Button>
          </div>
        }
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
        emptyMessage="Aucun élève trouvé"
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Hidden file input — lives outside the modal so ref is always mounted */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <OffCanvas
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
          showExtended={showExtended}
          onToggleExtended={() => setShowExtended((v) => !v)}
        />
      </OffCanvas>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate(confirm.id)}
        loading={deleteMutation.isPending}
        title="Supprimer définitivement"
        message={`Supprimer l'élève "${confirm?.user?.name ?? confirm?.admissionNumber}" ? Toutes ses notes, bulletins et données seront définitivement effacés.`}
        confirmLabel="Supprimer définitivement"
        variant="danger"
      />

      <ConfirmDialog
        open={bulkConfirm}
        onClose={() => setBulkConfirm(false)}
        onConfirm={() => bulkDeleteMutation.mutate([...selectedIds])}
        loading={bulkDeleteMutation.isPending}
        title={`Supprimer ${selectedIds.size} élève${selectedIds.size > 1 ? 's' : ''}`}
        message={`Supprimer définitivement ${selectedIds.size} élève${selectedIds.size > 1 ? 's' : ''} ? Toutes leurs notes, bulletins et données seront effacés. Cette action est irréversible.`}
        confirmLabel={`Supprimer ${selectedIds.size} élève${selectedIds.size > 1 ? 's' : ''}`}
        variant="danger"
      />
    </AppShell>
  );
}

export default StudentsPage;
