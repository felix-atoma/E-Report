import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { classesService } from '../../../services/classesService';
import { usersService } from '../../../services/usersService';
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
import Loading from '../../../components/common/Loading/Loading';
import './ClassesPage.css';

const LEVELS = [
  { value: 'CI',        label: 'CI' },
  { value: 'CP',        label: 'CP' },
  { value: 'CE1',       label: 'CE1' },
  { value: 'CE2',       label: 'CE2' },
  { value: 'CM1',       label: 'CM1' },
  { value: 'CM2',       label: 'CM2' },
  { value: '6eme',      label: '6ème' },
  { value: '5eme',      label: '5ème' },
  { value: '4eme',      label: '4ème' },
  { value: '3eme',      label: '3ème' },
  { value: '2nde',      label: '2nde' },
  { value: '1ere',      label: '1ère' },
  { value: 'Terminale', label: 'Terminale' },
];

const LEVEL_VARIANT = {
  CI: 'info', CP: 'info', CE1: 'info', CE2: 'info', CM1: 'info', CM2: 'info',
  '6eme': 'success', '5eme': 'success', '4eme': 'success', '3eme': 'success',
  '2nde': 'warning', '1ere': 'warning', 'Terminale': 'danger',
};

const EMPTY_FORM = { name: '', level: '', academicYear: '', capacity: '', teacherId: '', subjects: [] };

function validate(form) {
  const errors = {};
  if (!form.name.trim())         errors.name         = 'Nom de classe requis';
  if (!form.level)               errors.level        = 'Niveau requis';
  if (!form.academicYear.trim()) errors.academicYear = 'Année scolaire requise';
  return errors;
}

function ClassForm({ form, errors, onChange, teachers, allSubjects = [], isCreate = false }) {
  const [pendingSubjectId, setPendingSubjectId] = useState('');
  const [pendingTeacherId, setPendingTeacherId] = useState('');

  const teacherOptions = teachers.map((t) => ({ value: t.id, label: t.name ?? t.email }));
  const allTeacherOptions = [{ value: '', label: '— Aucun —' }, ...teacherOptions];

  const assignedIds = new Set((form.subjects ?? []).map((s) => s.subjectId));
  const available   = allSubjects.filter((s) => !assignedIds.has(s.id));
  const subjectOptions = available.map((s) => ({
    value: s.id,
    label: s.nameFr + (s.code ? ` (${s.code})` : ''),
  }));

  function addSubject() {
    if (!pendingSubjectId) return;
    onChange('subjects', [...(form.subjects ?? []), { subjectId: pendingSubjectId, teacherId: pendingTeacherId || null }]);
    setPendingSubjectId('');
    setPendingTeacherId('');
  }

  function removeSubject(sid) {
    onChange('subjects', (form.subjects ?? []).filter((s) => s.subjectId !== sid));
  }

  function updateSubjectTeacher(sid, tid) {
    onChange('subjects', (form.subjects ?? []).map((s) => s.subjectId === sid ? { ...s, teacherId: tid || null } : s));
  }

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
          id="teacherId" label="Professeur principal (titulaire)"
          value={form.teacherId}
          placeholder="Aucun"
          options={teacherOptions}
          onChange={(e) => onChange('teacherId', e.target.value)}
        />
      </div>

      {isCreate && (
        <div className="class-form__subjects-wrap">
          <div className="class-form__subjects-title">
            Matières enseignées
            {(form.subjects ?? []).length > 0 && (
              <span className="class-form__subjects-count">{(form.subjects ?? []).length}</span>
            )}
          </div>

          {/* List of already-added subjects */}
          <div className="cls-subjects__list">
            {(form.subjects ?? []).length === 0 ? (
              <div className="cls-subjects__empty">Aucune matière ajoutée — utilisez le formulaire ci-dessous</div>
            ) : (
              <>
                <div className="cls-subjects__header-row">
                  <span>Matière</span><span>Enseignant</span><span />
                </div>
                {(form.subjects ?? []).map((s) => {
                  const subj = allSubjects.find((sub) => sub.id === s.subjectId);
                  return (
                    <div key={s.subjectId} className="cls-subjects__row">
                      <div>
                        <div className="cls-subjects__name">{subj?.nameFr ?? s.subjectId}</div>
                        {subj?.code && <div className="cls-subjects__code">{subj.code}</div>}
                      </div>
                      <select
                        className="cls-subjects__teacher-select"
                        value={s.teacherId ?? ''}
                        onChange={(e) => updateSubjectTeacher(s.subjectId, e.target.value)}
                      >
                        {allTeacherOptions.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <button className="cls-subjects__remove" onClick={() => removeSubject(s.subjectId)}>✕</button>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Add a subject row */}
          <div className="cls-subjects__add">
            <Select
              id="pending-subject" label="Matière"
              value={pendingSubjectId}
              placeholder="Sélectionner une matière…"
              options={subjectOptions}
              onChange={(e) => setPendingSubjectId(e.target.value)}
            />
            <Select
              id="pending-teacher" label="Enseignant"
              value={pendingTeacherId}
              placeholder="— Aucun —"
              options={teacherOptions}
              onChange={(e) => setPendingTeacherId(e.target.value)}
            />
            <button
              type="button"
              className="cls-subjects__add-btn"
              onClick={addSubject}
              disabled={!pendingSubjectId}
            >
              + Ajouter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Manage Subjects modal ── */
function ManageSubjectsModal({ cls, teachers, allSubjects, onClose, qc }) {
  const [addSubjectId, setAddSubjectId] = useState('');
  const [addTeacherId, setAddTeacherId] = useState('');

  const { data: detail, isLoading } = useQuery({
    queryKey: ['class-detail', cls.id],
    queryFn: () => classesService.get(cls.id).then((r) => r.data),
  });

  const teacherOptions = [
    { value: '', label: '— Aucun —' },
    ...teachers.map((t) => ({ value: t.id, label: t.name ?? t.email })),
  ];

  const assignedIds  = new Set((detail?.subjects ?? []).map((cs) => cs.subjectId));
  const availableSubs = allSubjects.filter((s) => !assignedIds.has(s.id));
  const subjectOptions = availableSubs.map((s) => ({
    value: s.id,
    label: s.nameFr ?? s.nameEn ?? s.code,
  }));

  const addMutation = useMutation({
    mutationFn: ({ subjectId, teacherId }) =>
      classesService.addSubject(cls.id, subjectId, teacherId || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class-detail', cls.id] });
      toast.success('Matière ajoutée');
      setAddSubjectId('');
      setAddTeacherId('');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const updateTeacherMutation = useMutation({
    mutationFn: ({ subjectId, teacherId }) =>
      classesService.updateSubjectTeacher(cls.id, subjectId, teacherId || null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class-detail', cls.id] });
      toast.success('Enseignant mis à jour');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const removeMutation = useMutation({
    mutationFn: (subjectId) => classesService.removeSubject(cls.id, subjectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class-detail', cls.id] });
      toast.success('Matière retirée');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  function handleAdd() {
    if (!addSubjectId) { toast.error('Sélectionner une matière'); return; }
    addMutation.mutate({ subjectId: addSubjectId, teacherId: addTeacherId });
  }

  const subjects = detail?.subjects ?? [];

  return (
    <OffCanvas
      open
      onClose={onClose}
      title={`Matières — ${cls.name}`}
      size="lg"
      footer={<Button onClick={onClose}>Fermer</Button>}
    >
      {isLoading ? (
        <Loading />
      ) : (
        <>
          {/* Subjects list */}
          <p className="cls-subjects__section-title">
            Matières enseignées ({subjects.length})
          </p>
          <div className="cls-subjects__list">
            <div className="cls-subjects__header-row">
              <span>Matière</span>
              <span>Enseignant</span>
              <span />
            </div>
            {subjects.length === 0 ? (
              <div className="cls-subjects__empty">
                Aucune matière assignée. Ajoutez-en ci-dessous.
              </div>
            ) : (
              subjects.map((cs) => (
                <div key={cs.subjectId} className="cls-subjects__row">
                  <div>
                    <div className="cls-subjects__name">
                      {cs.subject?.nameFr ?? cs.subject?.nameEn ?? cs.subjectId}
                    </div>
                    {cs.subject?.code && (
                      <div className="cls-subjects__code">{cs.subject.code}</div>
                    )}
                  </div>
                  <select
                    className="cls-subjects__teacher-select"
                    value={cs.teacher?.id ?? ''}
                    onChange={(e) =>
                      updateTeacherMutation.mutate({
                        subjectId: cs.subjectId,
                        teacherId: e.target.value,
                      })
                    }
                  >
                    <option value="">— Aucun —</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name ?? t.email}</option>
                    ))}
                  </select>
                  <button
                    className="cls-subjects__remove"
                    title="Retirer la matière"
                    onClick={() => removeMutation.mutate(cs.subjectId)}
                    disabled={removeMutation.isPending}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add subject row */}
          <p className="cls-subjects__section-title">Ajouter une matière</p>
          <div className="cls-subjects__add">
            <Select
              id="add-subject"
              label="Matière"
              value={addSubjectId}
              placeholder="Sélectionner…"
              options={subjectOptions}
              onChange={(e) => setAddSubjectId(e.target.value)}
            />
            <Select
              id="add-teacher"
              label="Enseignant"
              value={addTeacherId}
              placeholder="— Aucun —"
              options={teacherOptions}
              onChange={(e) => setAddTeacherId(e.target.value)}
            />
            <button
              className="cls-subjects__add-btn"
              onClick={handleAdd}
              disabled={addMutation.isPending || !addSubjectId}
            >
              {addMutation.isPending ? '…' : '+ Ajouter'}
            </button>
          </div>
        </>
      )}
    </OffCanvas>
  );
}

/* ── Main page ── */
function ClassesPage() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [levelFilter, setLevel]     = useState('');
  const [modal, setModal]           = useState(null);   // null | 'create' | 'edit'
  const [manageClass, setManage]    = useState(null);   // class object | null
  const [selected, setSelected]     = useState(null);
  const [confirm, setConfirm]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => usersService.listTeachers().then((r) => r.data),
  });

  const { data: allSubjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsService.list().then((r) => r.data),
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
    mutationFn: async (data) => {
      const { subjects, ...classPayload } = data;
      const res = await classesService.create(classPayload);
      const classId = res.data?.id;
      if (classId && subjects?.length) {
        await Promise.all(
          subjects.map((s) => classesService.addSubject(classId, s.subjectId, s.teacherId || undefined))
        );
      }
      return res;
    },
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

  const deleteMutation = useMutation({
    mutationFn: (id) => classesService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); toast.success('Classe supprimée'); setConfirm(null); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur de suppression'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => classesService.bulkDelete(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      toast.success(`${selectedIds.size} classe${selectedIds.size > 1 ? 's' : ''} supprimée${selectedIds.size > 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      setBulkConfirm(false);
    },
    onError: () => { qc.invalidateQueries({ queryKey: ['classes'] }); toast.error('Certaines suppressions ont échoué'); setBulkConfirm(false); setSelectedIds(new Set()); },
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
      subjects:     [],
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
      name:         form.name,
      level:        form.level,
      academicYear: form.academicYear,
      capacity:     form.capacity  ? Number(form.capacity) : undefined,
      teacherId:    form.teacherId || undefined,
      subjects:     form.subjects ?? [],
    };
    if (modal === 'create') createMutation.mutate(payload);
    else updateMutation.mutate({ id: selected.id, data: { ...payload, subjects: undefined } });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const columns = [
    {
      key: 'name',
      label: 'Classe',
      render: (c) => (
        <Link to={`/admin/classes/${c.id}`} className="classes-table__name-link">
          {c.name}
        </Link>
      ),
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
      label: 'Prof. principal',
      render: (c) =>
        c.teacher
          ? (c.teacher.name ?? c.teacher.email)
          : <span className="classes-table__empty">—</span>,
    },
    {
      key: 'subjects',
      label: 'Matières',
      render: (c) => c._count?.subjects ?? '—',
    },
    {
      key: 'students',
      label: 'Élèves',
      render: (c) => {
        const count = c._count?.students ?? '—';
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
      style: { width: '220px', textAlign: 'right' },
      render: (c) => (
        <div className="classes-table__actions">
          <Button size="sm" variant="ghost" onClick={() => setManage(c)}>Matières</Button>
          <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Modifier</Button>
          {c.isActive !== false && (
            <Button size="sm" variant="ghost" onClick={() => setConfirm({ action: 'deactivate', cls: c })}>Désactiver</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setConfirm({ action: 'delete', cls: c })}>Supprimer</Button>
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
        emptyMessage="Aucune classe trouvée"
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Create / Edit off-canvas */}
      <OffCanvas
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? 'Nouvelle classe' : 'Modifier la classe'}
        size={modal === 'create' ? 'lg' : 'md'}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSaving}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <ClassForm
          form={form}
          errors={errors}
          onChange={handleChange}
          teachers={teachers}
          allSubjects={allSubjects}
          isCreate={modal === 'create'}
        />
      </OffCanvas>

      {/* Manage subjects modal */}
      {manageClass && (
        <ManageSubjectsModal
          cls={manageClass}
          teachers={teachers}
          allSubjects={allSubjects}
          onClose={() => setManage(null)}
          qc={qc}
        />
      )}

      <ConfirmDialog
        open={!!confirm && confirm.action === 'deactivate'}
        onClose={() => setConfirm(null)}
        onConfirm={() => deactivateMutation.mutate(confirm.cls.id)}
        loading={deactivateMutation.isPending}
        title="Désactiver la classe"
        message={`Désactiver la classe "${confirm?.cls?.name}" ? Les données seront conservées.`}
        confirmLabel="Désactiver"
        variant="danger"
      />

      <ConfirmDialog
        open={!!confirm && confirm.action === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate(confirm.cls.id)}
        loading={deleteMutation.isPending}
        title="Supprimer définitivement"
        message={`Supprimer la classe "${confirm?.cls?.name}" ? Toutes les notes, bulletins et données associées seront définitivement effacés.`}
        confirmLabel="Supprimer définitivement"
        variant="danger"
      />

      <ConfirmDialog
        open={bulkConfirm}
        onClose={() => setBulkConfirm(false)}
        onConfirm={() => bulkDeleteMutation.mutate([...selectedIds])}
        loading={bulkDeleteMutation.isPending}
        title={`Supprimer ${selectedIds.size} classe${selectedIds.size > 1 ? 's' : ''}`}
        message={`Supprimer définitivement ${selectedIds.size} classe${selectedIds.size > 1 ? 's' : ''} ? Toutes les notes, bulletins et données associées seront effacés. Cette action est irréversible.`}
        confirmLabel={`Supprimer ${selectedIds.size} classe${selectedIds.size > 1 ? 's' : ''}`}
        variant="danger"
      />
    </AppShell>
  );
}

export default ClassesPage;
