import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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

function validate(form, t) {
  const errors = {};
  if (!form.name.trim())         errors.name         = t('classes.errors.nameRequired');
  if (!form.level)               errors.level        = t('classes.level') + ' ' + t('common.required').toLowerCase();
  if (!form.academicYear.trim()) errors.academicYear = t('classes.errors.yearRequired');
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
  const { t } = useTranslation();
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); qc.invalidateQueries({ queryKey: ['analytics'] }); toast.success(t('classes.toast.created')); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? t('common.errorGeneric')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => classesService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); toast.success(t('classes.toast.updated')); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? t('common.errorGeneric')),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => classesService.deactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); toast.success(t('action.deactivate')); setConfirm(null); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? t('common.errorGeneric')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => classesService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); qc.invalidateQueries({ queryKey: ['analytics'] }); toast.success(t('classes.toast.deleted')); setConfirm(null); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? t('common.errorGeneric')),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => classesService.bulkDelete(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      toast.success(t('classes.toast.deleted'));
      setSelectedIds(new Set());
      setBulkConfirm(false);
    },
    onError: () => { qc.invalidateQueries({ queryKey: ['classes'] }); toast.error(t('common.errorGeneric')); setBulkConfirm(false); setSelectedIds(new Set()); },
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
    const errs = validate(form, t);
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
      label: t('classes.title'),
      render: (c) => (
        <Link to={`/admin/classes/${c.id}`} className="classes-table__name-link">
          {c.name}
        </Link>
      ),
    },
    {
      key: 'level',
      label: t('classes.level'),
      render: (c) => (
        <Badge variant={LEVEL_VARIANT[c.level] ?? 'default'}>
          {LEVELS.find((l) => l.value === c.level)?.label ?? c.level}
        </Badge>
      ),
    },
    {
      key: 'academicYear',
      label: t('classes.academicYear'),
      render: (c) => c.academicYear ?? '—',
    },
    {
      key: 'teacher',
      label: t('classes.teacher'),
      render: (c) =>
        c.teacher
          ? (c.teacher.name ?? c.teacher.email)
          : <span className="classes-table__empty">—</span>,
    },
    {
      key: 'subjects',
      label: t('classes.subjects'),
      render: (c) => c._count?.subjects ?? '—',
    },
    {
      key: 'students',
      label: t('classes.students'),
      render: (c) => {
        const count = c._count?.students ?? '—';
        const cap   = c.capacity ? ` / ${c.capacity}` : '';
        return `${count}${cap}`;
      },
    },
    {
      key: 'status',
      label: t('common.status'),
      render: (c) => (
        <Badge variant={c.isActive !== false ? 'success' : 'default'}>
          {c.isActive !== false ? t('common.active') : t('common.inactive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      style: { width: '220px', textAlign: 'right' },
      render: (c) => (
        <div className="classes-table__actions">
          <Button size="sm" variant="ghost" onClick={() => setManage(c)}>{t('classes.subjects')}</Button>
          <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>{t('action.edit')}</Button>
          {c.isActive !== false && (
            <Button size="sm" variant="ghost" onClick={() => setConfirm({ action: 'deactivate', cls: c })}>{t('action.deactivate')}</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setConfirm({ action: 'delete', cls: c })}>{t('action.delete')}</Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell title={t('classes.title')}>
      <PageHeader
        title={t('classes.title')}
        subtitle={`${classes.length} ${t('classes.title').toLowerCase()}`}
        actions={<Button icon="+" onClick={openCreate}>{t('classes.addClass')}</Button>}
      />

      <div className="classes-page__toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('common.search')}
          className="classes-page__search"
        />
        <Select
          id="level-filter"
          value={levelFilter}
          placeholder={t('common.all')}
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
        emptyMessage={t('classes.noClasses')}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Create / Edit off-canvas */}
      <OffCanvas
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? t('classes.addClass') : t('classes.editClass')}
        size={modal === 'create' ? 'lg' : 'md'}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSaving}>{t('action.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? t('action.saving') : t('action.save')}
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
        title={t('classes.deleteClass')}
        message={`${t('action.deactivate')} "${confirm?.cls?.name}" ?`}
        confirmLabel={t('action.deactivate')}
        variant="danger"
      />

      <ConfirmDialog
        open={!!confirm && confirm.action === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate(confirm.cls.id)}
        loading={deleteMutation.isPending}
        title={t('classes.deleteClass')}
        message={`${t('common.confirmDelete')} "${confirm?.cls?.name}" ? ${t('common.deleteWarning')}`}
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

export default ClassesPage;
