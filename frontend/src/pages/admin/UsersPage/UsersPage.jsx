import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { usersService } from '../../../services/usersService';
import { subjectsService } from '../../../services/subjectsService';
import { classesService } from '../../../services/classesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Table from '../../../components/common/Table/Table';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import Avatar from '../../../components/common/Avatar/Avatar';
import Badge from '../../../components/common/Badge/Badge';
import SearchBar from '../../../components/common/SearchBar/SearchBar';
import './UsersPage.css';

const ROLE_KEYS = ['ADMIN', 'TEACHER', 'BURSAR', 'PARENT', 'STUDENT'];

const ROLE_VARIANT = {
  ADMIN: 'danger', TEACHER: 'info', BURSAR: 'warning', PARENT: 'success', STUDENT: 'default',
};

const EMPTY_FORM = {
  name: '', email: '', whatsappNumber: '', role: '', password: '',
  subjectIds: [], mainClassId: '',
};

function UserForm({ form, errors, onChange, isCreate, subjects, classes, roles }) {
  const { t } = useTranslation();
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
        id="name" label={t('users.fullName')} required
        value={form.name} error={errors.name}
        placeholder={t('users.namePlaceholder')}
        onChange={(e) => onChange('name', e.target.value)}
      />
      <Input
        id="email" label={t('users.email')} type="email" required
        value={form.email} error={errors.email}
        onChange={(e) => onChange('email', e.target.value)}
      />
      {isCreate && (
        <Input
          id="password" label={t('users.password')} type="password" required
          value={form.password} error={errors.password}
          placeholder={t('users.pwdPlaceholder')}
          onChange={(e) => onChange('password', e.target.value)}
        />
      )}
      <Input
        id="whatsappNumber" label={t('users.phone')}
        value={form.whatsappNumber}
        placeholder={t('users.phonePlaceholder')}
        onChange={(e) => onChange('whatsappNumber', e.target.value)}
      />
      <Select
        id="role" label={t('users.role')} required
        value={form.role} error={errors.role}
        placeholder={t('users.selectRole')}
        options={roles}
        onChange={(e) => onChange('role', e.target.value)}
      />

      {isCreate && isTeacher && (
        <>
          {/* Subject assignment */}
          <div className="user-form__section">
            <div className="user-form__section-title">{t('users.subjects')}</div>
            <div className="user-form__section-hint">
              {t('users.subjectsHint')}
            </div>
            {subjects.length === 0 ? (
              <p className="user-form__empty">—</p>
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
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal]           = useState(null);
  const [selected, setSelected]     = useState(null);
  const [confirm, setConfirm]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState({});

  const roles = ROLE_KEYS.map((k) => ({ value: k, label: t(`users.roles.${k}`) }));

  function validate(f, isCreate) {
    const errs = {};
    if (!f.name.trim())  errs.name  = t('users.errors.nameRequired');
    if (!f.email.trim()) errs.email = t('users.errors.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errs.email = t('users.errors.emailInvalid');
    if (!f.role)         errs.role  = t('users.errors.roleRequired');
    if (isCreate && !f.password.trim()) errs.password = t('users.errors.passwordRequired');
    return errs;
  }

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
      toast.success(t('action.create'));
      closeModal();
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('action.create')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('action.update'));
      closeModal();
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('action.update')),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, action }) =>
      action === 'deactivate' ? usersService.deactivate(id) : usersService.activate(id),
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(action === 'deactivate' ? t('action.deactivate') : t('action.activate'));
      setConfirm(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('action.confirm')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => usersService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('action.delete'));
      setConfirm(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de suppression'),
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
      label: t('users.fullName'),
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
      label: t('users.role'),
      render: (u) => (
        <Badge variant={ROLE_VARIANT[u.role] ?? 'default'}>
          {t(`users.roles.${u.role}`, u.role)}
        </Badge>
      ),
    },
    {
      key: 'phone',
      label: t('users.phone'),
      render: (u) => u.whatsappNumber ?? <span className="users-table__empty">—</span>,
    },
    {
      key: 'status',
      label: t('action.activate'),
      render: (u) => (
        <Badge variant={u.isActive !== false ? 'success' : 'default'}>
          {u.isActive !== false ? t('action.activate') : t('action.deactivate')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      style: { width: '160px', textAlign: 'right' },
      render: (u) => (
        <div className="users-table__actions">
          <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>{t('action.edit')}</Button>
          {u.isActive !== false ? (
            <Button size="sm" variant="ghost" onClick={() => setConfirm({ user: u, action: 'deactivate' })}>
              {t('action.deactivate')}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirm({ user: u, action: 'activate' })}>
              {t('action.activate')}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setConfirm({ user: u, action: 'delete' })}>
            {t('action.delete')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell title={t('nav.users')}>
      <PageHeader
        title={t('nav.users')}
        subtitle={`${users.length}`}
        actions={<Button icon="+" onClick={openCreate}>{t('action.create')}</Button>}
      />

      <div className="users-page__toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('action.search')}
          className="users-page__search"
        />
        <Select
          id="role-filter"
          value={roleFilter}
          placeholder={t('users.selectRole')}
          options={roles}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="users-page__role-filter"
        />
      </div>

      <Table
        columns={columns}
        rows={filtered}
        loading={isLoading}
        emptyMessage={t('action.search')}
      />

      <OffCanvas
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? t('action.create') : t('action.edit')}
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
        <UserForm
          form={form}
          errors={errors}
          onChange={handleChange}
          isCreate={modal === 'create'}
          subjects={subjects}
          classes={classes}
          roles={roles}
        />
      </OffCanvas>

      <ConfirmDialog
        open={!!confirm && confirm.action !== 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={() => toggleMutation.mutate({ id: confirm.user.id, action: confirm.action })}
        loading={toggleMutation.isPending}
        title={confirm?.action === 'deactivate' ? t('action.deactivate') : t('action.activate')}
        message={confirm?.user?.name ?? confirm?.user?.email ?? ''}
        confirmLabel={confirm?.action === 'deactivate' ? t('action.deactivate') : t('action.activate')}
        variant={confirm?.action === 'deactivate' ? 'danger' : 'primary'}
      />

      <ConfirmDialog
        open={!!confirm && confirm.action === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate(confirm.user.id)}
        loading={deleteMutation.isPending}
        title={t('action.delete')}
        message={confirm?.user?.name ?? confirm?.user?.email ?? ''}
        confirmLabel={t('action.delete')}
        variant="danger"
      />
    </AppShell>
  );
}

export default UsersPage;
