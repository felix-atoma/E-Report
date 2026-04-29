import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usersService } from '../../../services/usersService';
import { subjectsService } from '../../../services/subjectsService';
import { classesService } from '../../../services/classesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Table from '../../../components/common/Table/Table';
import Modal from '../../../components/common/Modal/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import Avatar from '../../../components/common/Avatar/Avatar';
import Badge from '../../../components/common/Badge/Badge';
import SearchBar from '../../../components/common/SearchBar/SearchBar';
import './UsersPage.css';

const ROLES = [
  { value: 'ADMIN',   label: 'Administrateur' },
  { value: 'TEACHER', label: 'Enseignant' },
  { value: 'BURSAR',  label: 'Gestionnaire' },
  { value: 'PARENT',  label: 'Parent' },
  { value: 'STUDENT', label: 'Élève' },
];

const ROLE_VARIANT = {
  ADMIN: 'danger', TEACHER: 'info', BURSAR: 'warning', PARENT: 'success', STUDENT: 'default',
};

const EMPTY_FORM = {
  name: '', email: '', whatsappNumber: '', role: '', password: '',
  subjectIds: [], mainClassId: '',
};

function validate(form, isCreate) {
  const errors = {};
  if (!form.name.trim())  errors.name  = 'Nom complet requis';
  if (!form.email.trim()) errors.email = 'Email requis';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email invalide';
  if (!form.role)         errors.role  = 'Rôle requis';
  if (isCreate && !form.password.trim()) errors.password = 'Mot de passe requis';
  return errors;
}

function UserForm({ form, errors, onChange, isCreate, subjects, classes }) {
  const isTeacher = form.role === 'TEACHER';

  function toggleSubject(id) {
    const next = form.subjectIds.includes(id)
      ? form.subjectIds.filter((s) => s !== id)
      : [...form.subjectIds, id];
    onChange('subjectIds', next);
  }

  return (
    <div className="user-form">
      <Input
        id="name" label="Nom complet" required
        value={form.name} error={errors.name}
        placeholder="ex: Koffi Amevor"
        onChange={(e) => onChange('name', e.target.value)}
      />
      <Input
        id="email" label="Email" type="email" required
        value={form.email} error={errors.email}
        onChange={(e) => onChange('email', e.target.value)}
      />
      {isCreate && (
        <Input
          id="password" label="Mot de passe" type="password" required
          value={form.password} error={errors.password}
          placeholder="Minimum 8 caractères"
          onChange={(e) => onChange('password', e.target.value)}
        />
      )}
      <Input
        id="whatsappNumber" label="Téléphone / WhatsApp"
        value={form.whatsappNumber}
        placeholder="+228 XX XX XX XX"
        onChange={(e) => onChange('whatsappNumber', e.target.value)}
      />
      <Select
        id="role" label="Rôle" required
        value={form.role} error={errors.role}
        placeholder="Sélectionner un rôle"
        options={ROLES}
        onChange={(e) => onChange('role', e.target.value)}
      />

      {isCreate && isTeacher && (
        <>
          {/* Subject assignment */}
          <div className="user-form__section">
            <div className="user-form__section-title">Matières enseignées</div>
            <div className="user-form__section-hint">
              L'enseignant sera automatiquement assigné aux classes concernées.
            </div>
            {subjects.length === 0 ? (
              <p className="user-form__empty">Aucune matière disponible</p>
            ) : (
              <div className="user-form__subject-grid">
                {subjects.map((s) => (
                  <label key={s.id} className="user-form__subject-item">
                    <input
                      type="checkbox"
                      className="user-form__subject-checkbox"
                      checked={form.subjectIds.includes(s.id)}
                      onChange={() => toggleSubject(s.id)}
                    />
                    <span className="user-form__subject-name">{s.nameFr}</span>
                    <span className="user-form__subject-code">{s.code}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Main class (professeur principal) */}
          <div className="user-form__section">
            <div className="user-form__section-title">Classe principale <span className="user-form__optional">(optionnel)</span></div>
            <div className="user-form__section-hint">
              Désigne cet enseignant comme professeur principal de la classe.
            </div>
            <select
              className="user-form__class-select"
              value={form.mainClassId}
              onChange={(e) => onChange('mainClassId', e.target.value)}
            >
              <option value="">— Aucune —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.teacher ? ` (${c.teacher.name ?? c.teacher.email})` : ''}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}

function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal]           = useState(null);
  const [selected, setSelected]     = useState(null);
  const [confirm, setConfirm]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState({});

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.list().then((r) => r.data),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsService.list().then((r) => r.data),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch = !q || (u.name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole   = !roleFilter || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const createMutation = useMutation({
    mutationFn: (data) => usersService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Utilisateur créé');
      closeModal();
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de création'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur mis à jour');
      closeModal();
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de mise à jour'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, action }) =>
      action === 'deactivate' ? usersService.deactivate(id) : usersService.activate(id),
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(action === 'deactivate' ? 'Compte désactivé' : 'Compte activé');
      setConfirm(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setErrors({});
    setModal('create');
  }

  function openEdit(user) {
    setSelected(user);
    setForm({
      name:           user.name           ?? '',
      email:          user.email          ?? '',
      whatsappNumber: user.whatsappNumber ?? '',
      role:           user.role           ?? '',
      password:       '',
      subjectIds:     [],
      mainClassId:    '',
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
    const isCreate = modal === 'create';
    const errs = validate(form, isCreate);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const payload = {
      name:           form.name,
      email:          form.email,
      role:           form.role,
      whatsappNumber: form.whatsappNumber || undefined,
      ...(isCreate ? { password: form.password } : {}),
    };

    if (isCreate && form.role === 'TEACHER') {
      if (form.subjectIds.length) payload.subjectIds = form.subjectIds;
      if (form.mainClassId)       payload.mainClassId = form.mainClassId;
    }

    if (isCreate) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: selected.id, data: payload });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const columns = [
    {
      key: 'name',
      label: 'Utilisateur',
      render: (u) => (
        <div className="users-table__user">
          <Avatar name={u.name ?? u.email} size="sm" />
          <div>
            <div className="users-table__name">{u.name ?? '—'}</div>
            <div className="users-table__email">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Rôle',
      render: (u) => (
        <Badge variant={ROLE_VARIANT[u.role] ?? 'default'}>
          {ROLES.find((r) => r.value === u.role)?.label ?? u.role}
        </Badge>
      ),
    },
    {
      key: 'phone',
      label: 'Téléphone',
      render: (u) => u.whatsappNumber ?? <span className="users-table__empty">—</span>,
    },
    {
      key: 'status',
      label: 'Statut',
      render: (u) => (
        <Badge variant={u.isActive !== false ? 'success' : 'default'}>
          {u.isActive !== false ? 'Actif' : 'Inactif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      style: { width: '120px', textAlign: 'right' },
      render: (u) => (
        <div className="users-table__actions">
          <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>Modifier</Button>
          {u.isActive !== false ? (
            <Button size="sm" variant="ghost" onClick={() => setConfirm({ user: u, action: 'deactivate' })}>
              Désactiver
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirm({ user: u, action: 'activate' })}>
              Activer
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Utilisateurs">
      <PageHeader
        title="Utilisateurs"
        subtitle={`${users.length} compte${users.length !== 1 ? 's' : ''}`}
        actions={<Button icon="+" onClick={openCreate}>Nouvel utilisateur</Button>}
      />

      <div className="users-page__toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par nom ou email…"
          className="users-page__search"
        />
        <Select
          id="role-filter"
          value={roleFilter}
          placeholder="Tous les rôles"
          options={ROLES}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="users-page__role-filter"
        />
      </div>

      <Table
        columns={columns}
        rows={filtered}
        loading={isLoading}
        emptyMessage="Aucun utilisateur trouvé"
      />

      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? 'Nouvel utilisateur' : "Modifier l'utilisateur"}
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
        <UserForm
          form={form}
          errors={errors}
          onChange={handleChange}
          isCreate={modal === 'create'}
          subjects={subjects}
          classes={classes}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => toggleMutation.mutate({ id: confirm.user.id, action: confirm.action })}
        loading={toggleMutation.isPending}
        title={confirm?.action === 'deactivate' ? 'Désactiver le compte' : 'Activer le compte'}
        message={
          confirm?.action === 'deactivate'
            ? `Désactiver le compte de ${confirm?.user.name ?? confirm?.user.email} ? L'utilisateur ne pourra plus se connecter.`
            : `Réactiver le compte de ${confirm?.user.name ?? confirm?.user.email} ?`
        }
        confirmLabel={confirm?.action === 'deactivate' ? 'Désactiver' : 'Activer'}
        variant={confirm?.action === 'deactivate' ? 'danger' : 'primary'}
      />
    </AppShell>
  );
}

export default UsersPage;
