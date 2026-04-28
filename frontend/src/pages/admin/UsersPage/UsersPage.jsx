import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usersService } from '../../../services/usersService';
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
  ADMIN: 'danger',
  TEACHER: 'info',
  BURSAR: 'warning',
  PARENT: 'success',
  STUDENT: 'default',
};

const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', role: '' };

function validate(form) {
  const errors = {};
  if (!form.firstName.trim()) errors.firstName = 'Prénom requis';
  if (!form.lastName.trim())  errors.lastName  = 'Nom requis';
  if (!form.email.trim())     errors.email     = 'Email requis';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email invalide';
  if (!form.role)             errors.role      = 'Rôle requis';
  return errors;
}

function UserForm({ form, errors, onChange }) {
  return (
    <div className="user-form">
      <div className="user-form__row">
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
      <Input
        id="email" label="Email" type="email" required
        value={form.email} error={errors.email}
        onChange={(e) => onChange('email', e.target.value)}
      />
      <Input
        id="phone" label="Téléphone"
        value={form.phone} error={errors.phone}
        placeholder="+228 XX XX XX XX"
        onChange={(e) => onChange('phone', e.target.value)}
      />
      <Select
        id="role" label="Rôle" required
        value={form.role} error={errors.role}
        placeholder="Sélectionner un rôle"
        options={ROLES}
        onChange={(e) => onChange('role', e.target.value)}
      />
    </div>
  );
}

function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal]         = useState(null); // null | 'create' | 'edit'
  const [selected, setSelected]   = useState(null);
  const [confirm, setConfirm]     = useState(null); // null | { user, action }
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.list().then((r) => r.data),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const name = `${u.firstName} ${u.lastName}`.toLowerCase();
      const matchSearch = !q || name.includes(q) || u.email.toLowerCase().includes(q);
      const matchRole   = !roleFilter || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const createMutation = useMutation({
    mutationFn: (data) => usersService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
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
      firstName: user.firstName ?? '',
      lastName:  user.lastName  ?? '',
      email:     user.email     ?? '',
      phone:     user.phone     ?? '',
      role:      user.role      ?? '',
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
    if (modal === 'create') {
      createMutation.mutate(form);
    } else {
      updateMutation.mutate({ id: selected.id, data: form });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const columns = [
    {
      key: 'name',
      label: 'Utilisateur',
      render: (u) => (
        <div className="users-table__user">
          <Avatar name={`${u.firstName} ${u.lastName}`} size="sm" />
          <div>
            <div className="users-table__name">{u.firstName} {u.lastName}</div>
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
      render: (u) => u.phone ?? <span className="users-table__empty">—</span>,
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
        actions={
          <Button icon="+" onClick={openCreate}>Nouvel utilisateur</Button>
        }
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

      {/* Create / Edit modal */}
      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? 'Nouvel utilisateur' : 'Modifier l\'utilisateur'}
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
        <UserForm form={form} errors={errors} onChange={handleChange} />
      </Modal>

      {/* Deactivate / Activate confirm */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => toggleMutation.mutate({ id: confirm.user.id, action: confirm.action })}
        loading={toggleMutation.isPending}
        title={confirm?.action === 'deactivate' ? 'Désactiver le compte' : 'Activer le compte'}
        message={
          confirm?.action === 'deactivate'
            ? `Désactiver le compte de ${confirm?.user.firstName} ${confirm?.user.lastName} ? L'utilisateur ne pourra plus se connecter.`
            : `Réactiver le compte de ${confirm?.user.firstName} ${confirm?.user.lastName} ?`
        }
        confirmLabel={confirm?.action === 'deactivate' ? 'Désactiver' : 'Activer'}
        variant={confirm?.action === 'deactivate' ? 'danger' : 'primary'}
      />
    </AppShell>
  );
}

export default UsersPage;
