import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { staffProfilesService } from '../../../services/staffProfilesService';
import { usersService } from '../../../services/usersService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Textarea from '../../../components/common/Textarea/Textarea';
import Select from '../../../components/common/Select/Select';
import Loading from '../../../components/common/Loading/Loading';
import EmptyState from '../../../components/common/EmptyState/EmptyState';
import './StaffDirectoryPage.css';

const ROLE_VARIANTS = { ADMIN: 'role--admin', TEACHER: 'role--teacher', BURSAR: 'role--bursar' };

const CONTRACT_OPTIONS = [
  { value: '', label: 'Sélectionner' },
  { value: 'CDI', label: 'CDI' },
  { value: 'CDD', label: 'CDD' },
  { value: 'Vacataire', label: 'Vacataire' },
  { value: 'Fonctionnaire', label: 'Fonctionnaire' },
  { value: 'Autre', label: 'Autre' },
];

const QUALIFICATION_OPTIONS = [
  { value: '', label: 'Sélectionner' },
  { value: 'BEPC', label: 'BEPC' },
  { value: 'BAC', label: 'BAC' },
  { value: 'BTS', label: 'BTS' },
  { value: 'Licence', label: 'Licence' },
  { value: 'Master', label: 'Master' },
  { value: 'Doctorat', label: 'Doctorat' },
  { value: 'Autre', label: 'Autre' },
];

const EMPTY_FORM = {
  staffNumber: '', employmentDate: '', contractType: '', qualification: '',
  specialization: '', experienceYears: '', address: '', city: '',
  nationality: '', nationalId: '', emergencyContactName: '',
  emergencyContactPhone: '', notes: '',
};

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function StaffCard({ member, onEdit, t }) {
  const { user, staffProfile: profile } = member;
  const initials  = getInitials(user.name);
  const roleClass = ROLE_VARIANTS[user.role] ?? 'role--default';

  return (
    <div className="staff-card">
      <div className="staff-card__avatar">{initials}</div>
      <div className="staff-card__body">
        <div className="staff-card__header">
          <h3 className="staff-card__name">{user.name}</h3>
          <span className={`staff-card__role ${roleClass}`}>
            {t(`staffDir.roles.${user.role}`, user.role)}
          </span>
        </div>
        <div className="staff-card__meta">
          {user.email && (
            <span className="staff-card__meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              {user.email}
            </span>
          )}
          {user.whatsappNumber && (
            <span className="staff-card__meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.19h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l.95-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              {user.whatsappNumber}
            </span>
          )}
          {profile?.employmentDate && (
            <span className="staff-card__meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {t('staffDir.since')} {new Date(profile.employmentDate).toLocaleDateString('fr-FR')}
            </span>
          )}
          {profile?.qualification && (
            <span className="staff-card__meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              {profile.qualification}
            </span>
          )}
          {profile?.contractType && (
            <span className="staff-card__meta-item staff-card__meta-item--contract">
              {profile.contractType}
            </span>
          )}
        </div>
      </div>
      <button className="staff-card__edit-btn" onClick={() => onEdit(member)}>
        {t('staffDir.edit')}
      </button>
    </div>
  );
}

function StaffDirectoryPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.list().then((r) => r.data),
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['staff-profiles'],
    queryFn: () => staffProfilesService.list().then((r) => r.data),
  });

  const isLoading = usersLoading || profilesLoading;

  const staffMembers = users
    .filter((u) => ['ADMIN', 'TEACHER', 'BURSAR'].includes(u.role))
    .map((u) => ({
      user: u,
      staffProfile: profiles.find((p) => p.userId === u.id) ?? null,
    }))
    .filter((m) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return m.user.name?.toLowerCase().includes(q) || m.user.email?.toLowerCase().includes(q);
    });

  const upsertMutation = useMutation({
    mutationFn: ({ userId, data }) => staffProfilesService.upsert(userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-profiles'] });
      toast.success(t('staffDir.toast.updated'));
      setOpen(false);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('staffDir.toast.error')),
  });

  function openEdit(member) {
    const p = member.staffProfile;
    setSelectedUser(member.user);
    setForm({
      staffNumber:           p?.staffNumber ?? '',
      employmentDate:        p?.employmentDate ? p.employmentDate.slice(0, 10) : '',
      contractType:          p?.contractType ?? '',
      qualification:         p?.qualification ?? '',
      specialization:        p?.specialization ?? '',
      experienceYears:       p?.experienceYears != null ? String(p.experienceYears) : '',
      address:               p?.address ?? '',
      city:                  p?.city ?? '',
      nationality:           p?.nationality ?? '',
      nationalId:            p?.nationalId ?? '',
      emergencyContactName:  p?.emergencyContactName ?? '',
      emergencyContactPhone: p?.emergencyContactPhone ?? '',
      notes:                 p?.notes ?? '',
    });
    setOpen(true);
  }

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit() {
    const payload = {
      staffNumber:           form.staffNumber || undefined,
      employmentDate:        form.employmentDate || undefined,
      contractType:          form.contractType || undefined,
      qualification:         form.qualification || undefined,
      specialization:        form.specialization || undefined,
      experienceYears:       form.experienceYears ? Number(form.experienceYears) : undefined,
      address:               form.address || undefined,
      city:                  form.city || undefined,
      nationality:           form.nationality || undefined,
      nationalId:            form.nationalId || undefined,
      emergencyContactName:  form.emergencyContactName || undefined,
      emergencyContactPhone: form.emergencyContactPhone || undefined,
      notes:                 form.notes || undefined,
    };
    upsertMutation.mutate({ userId: selectedUser.id, data: payload });
  }

  return (
    <AppShell title={t('staffDir.title')}>
      <PageHeader
        title={t('staffDir.title')}
        subtitle={t('staffDir.subtitle', { count: staffMembers.length })}
      />

      <div className="staff-dir__toolbar">
        <input
          type="text"
          className="staff-dir__search"
          placeholder={t('staffDir.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Loading />
      ) : staffMembers.length === 0 ? (
        <EmptyState message={t('staffDir.empty')} />
      ) : (
        <div className="staff-dir__grid">
          {staffMembers.map((m) => (
            <StaffCard key={m.user.id} member={m} onEdit={openEdit} t={t} />
          ))}
        </div>
      )}

      <OffCanvas
        open={open}
        onClose={() => setOpen(false)}
        title={selectedUser ? t('staffDir.form.profileOf', { name: selectedUser.name }) : t('staffDir.form.editProfile')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={upsertMutation.isPending}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? t('action.saving') : t('action.save')}
            </Button>
          </>
        }
      >
        <div className="staff-profile-form">
          <div className="staff-profile-form__section-title">{t('staffDir.form.professionalInfo')}</div>
          <Input
            id="staffNumber"
            label={t('staffDir.form.staffNumber')}
            value={form.staffNumber}
            placeholder={t('staffDir.form.staffNumberPlaceholder')}
            onChange={(e) => handleChange('staffNumber', e.target.value)}
          />
          <div className="staff-profile-form__row">
            <Input
              id="employmentDate"
              label={t('staffDir.form.employmentDate')}
              type="date"
              value={form.employmentDate}
              onChange={(e) => handleChange('employmentDate', e.target.value)}
            />
            <Input
              id="experienceYears"
              label={t('staffDir.form.experienceYears')}
              type="number"
              value={form.experienceYears}
              min="0"
              onChange={(e) => handleChange('experienceYears', e.target.value)}
            />
          </div>
          <div className="staff-profile-form__row">
            <Select
              id="contractType"
              label={t('staffDir.form.contractType')}
              value={form.contractType}
              options={CONTRACT_OPTIONS}
              onChange={(e) => handleChange('contractType', e.target.value)}
            />
            <Select
              id="qualification"
              label={t('staffDir.form.qualification')}
              value={form.qualification}
              options={QUALIFICATION_OPTIONS}
              onChange={(e) => handleChange('qualification', e.target.value)}
            />
          </div>
          <Input
            id="specialization"
            label={t('staffDir.form.specialization')}
            value={form.specialization}
            placeholder={t('staffDir.form.specializationPlaceholder')}
            onChange={(e) => handleChange('specialization', e.target.value)}
          />

          <div className="staff-profile-form__section-title">{t('staffDir.form.addressIdentity')}</div>
          <div className="staff-profile-form__row">
            <Input
              id="address"
              label={t('staffDir.form.address')}
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
            <Input
              id="city"
              label={t('staffDir.form.city')}
              value={form.city}
              onChange={(e) => handleChange('city', e.target.value)}
            />
          </div>
          <div className="staff-profile-form__row">
            <Input
              id="nationality"
              label={t('staffDir.form.nationality')}
              value={form.nationality}
              onChange={(e) => handleChange('nationality', e.target.value)}
            />
            <Input
              id="nationalId"
              label={t('staffDir.form.nationalId')}
              value={form.nationalId}
              placeholder={t('staffDir.form.nationalIdPlaceholder')}
              onChange={(e) => handleChange('nationalId', e.target.value)}
            />
          </div>

          <div className="staff-profile-form__section-title">{t('staffDir.form.emergencyContact')}</div>
          <div className="staff-profile-form__row">
            <Input
              id="emergencyContactName"
              label={t('staffDir.form.emergencyName')}
              value={form.emergencyContactName}
              onChange={(e) => handleChange('emergencyContactName', e.target.value)}
            />
            <Input
              id="emergencyContactPhone"
              label={t('staffDir.form.emergencyPhone')}
              value={form.emergencyContactPhone}
              onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
            />
          </div>

          <Textarea
            label={t('staffDir.form.notes')}
            rows={4}
            placeholder={t('staffDir.form.notesPlaceholder')}
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
          />
        </div>
      </OffCanvas>
    </AppShell>
  );
}

export default StaffDirectoryPage;
