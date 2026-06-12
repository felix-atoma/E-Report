import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { usersService } from '../../../services/usersService';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Input from '../../../components/common/Input/Input';
import Avatar from '../../../components/common/Avatar/Avatar';
import Badge from '../../../components/common/Badge/Badge';
import Button from '../../../components/common/Button/Button';
import './ProfilePage.css';

const ROLE_VARIANT = {
  ADMIN: 'danger', TEACHER: 'info', BURSAR: 'warning', PARENT: 'success', STUDENT: 'default',
};

function ProfilePage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [infoForm, setInfo] = useState({ name: '', whatsappNumber: '' });
  const [infoErrors, setInfoErrors] = useState({});

  const [pwForm, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwErrors, setPwErrors] = useState({});

  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!user) return;
    setInfo({ name: user.name ?? '', whatsappNumber: user.whatsappNumber ?? '' });
  }, [user]);

  const infoMutation = useMutation({
    mutationFn: (data) => usersService.update(user.id, data),
    onSuccess: (res) => {
      toast.success(t('profile.toast.updated'));
      updateUser(res.data);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('profile.toast.updateError')),
  });

  const pwMutation = useMutation({
    mutationFn: (data) => usersService.update(user.id, data),
    onSuccess: () => {
      toast.success(t('profile.toast.passwordUpdated'));
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwErrors({});
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('profile.toast.passwordError')),
  });

  const avatarMutation = useMutation({
    mutationFn: (file) => usersService.uploadAvatar(user.id, file),
    onSuccess: (res) => {
      toast.success(t('profile.toast.photoUpdated'));
      updateUser(res.data);
      setPreview(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('profile.toast.photoError')),
  });

  function setInfoField(field) {
    return (e) => {
      setInfo((f) => ({ ...f, [field]: e.target.value }));
      if (infoErrors[field]) setInfoErrors((err) => ({ ...err, [field]: undefined }));
    };
  }

  function setPwField(field) {
    return (e) => {
      setPw((f) => ({ ...f, [field]: e.target.value }));
      if (pwErrors[field]) setPwErrors((err) => ({ ...err, [field]: undefined }));
    };
  }

  function handleInfoSave() {
    const errors = {};
    if (!infoForm.name.trim()) errors.name = t('profile.errors.nameRequired');
    if (Object.keys(errors).length) { setInfoErrors(errors); return; }
    infoMutation.mutate({
      name:           infoForm.name,
      whatsappNumber: infoForm.whatsappNumber || undefined,
    });
  }

  function handlePwSave() {
    const errors = {};
    if (!pwForm.currentPassword)   errors.currentPassword = t('profile.errors.currentPwRequired');
    if (!pwForm.newPassword)       errors.newPassword     = t('profile.errors.newPwRequired');
    else if (pwForm.newPassword.length < 8) errors.newPassword = t('profile.errors.pwTooShort');
    if (pwForm.newPassword !== pwForm.confirmPassword)
      errors.confirmPassword = t('password.noMatch');
    if (Object.keys(errors).length) { setPwErrors(errors); return; }
    pwMutation.mutate({ currentPassword: pwForm.currentPassword, password: pwForm.newPassword });
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error(t('profile.toast.formatError'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.toast.sizeError'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPreview({ file, dataUrl: ev.target.result });
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  if (!user) return <AppShell title={t('profile.title')}><p className="profile__loading">{t('profile.loading')}</p></AppShell>;

  return (
    <AppShell title={t('profile.title')}>
      <PageHeader title={t('profile.title')} />

      <div className="profile__layout">
        <Card className="profile__identity">
          <div
            className="profile__avatar-wrap"
            onClick={() => fileInputRef.current?.click()}
            title={t('profile.changePhotoHint')}
          >
            <Avatar name={user.name ?? user.email} src={user.profileImage} size="xl" />
            <div className="profile__avatar-overlay">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              {t('action.edit')}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <div className="profile__identity-info">
            <div className="profile__full-name">{user.name ?? '—'}</div>
            <div className="profile__email">{user.email}</div>
            <Badge variant={ROLE_VARIANT[user.role] ?? 'default'}>
              {t(`role.${user.role}`, user.role)}
            </Badge>
          </div>
        </Card>

        {preview && (
          <Card className="profile__section">
            <h3 className="profile__section-title">{t('profile.newPhoto')}</h3>
            <div className="profile__avatar-preview">
              <img
                src={preview.dataUrl}
                alt={t('profile.newPhoto')}
                className="profile__avatar-preview-img"
              />
              <div className="profile__avatar-preview-info">
                <div className="profile__avatar-preview-name">{preview.file.name}</div>
                <div className="profile__avatar-hint">
                  {(preview.file.size / 1024).toFixed(0)} Ko
                </div>
                <div className="profile__avatar-preview-actions">
                  <button
                    className="profile__avatar-upload-btn"
                    onClick={() => avatarMutation.mutate(preview.file)}
                    disabled={avatarMutation.isPending}
                  >
                    {avatarMutation.isPending ? t('profile.uploadingPhoto') : t('profile.uploadPhoto')}
                  </button>
                  <button
                    className="profile__avatar-cancel-btn"
                    onClick={() => setPreview(null)}
                    disabled={avatarMutation.isPending}
                  >
                    {t('action.cancel')}
                  </button>
                </div>
              </div>
            </div>
            <p className="profile__avatar-hint">{t('profile.fileHint')}</p>
          </Card>
        )}

        <Card className="profile__section">
          <h3 className="profile__section-title">{t('profile.personalInfo')}</h3>
          <div className="profile__form">
            <Input
              id="p-name" label={t('users.fullName')} required
              value={infoForm.name} error={infoErrors.name}
              onChange={setInfoField('name')}
            />
            <Input
              id="p-email" label={t('users.email')} type="email"
              value={user.email}
              disabled
              hint={t('profile.emailHint')}
            />
            <Input
              id="p-phone" label={t('users.phone')}
              value={infoForm.whatsappNumber}
              placeholder="+228 XX XX XX XX"
              onChange={setInfoField('whatsappNumber')}
            />
            <div className="profile__actions">
              <Button onClick={handleInfoSave} disabled={infoMutation.isPending}>
                {infoMutation.isPending ? t('action.saving') : t('action.save')}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="profile__section">
          <h3 className="profile__section-title">{t('profile.changePassword')}</h3>
          <div className="profile__form">
            <Input
              id="currentPw" label={t('profile.currentPw')} type="password"
              value={pwForm.currentPassword} error={pwErrors.currentPassword}
              autoComplete="current-password"
              onChange={setPwField('currentPassword')}
            />
            <Input
              id="newPw" label={t('profile.newPw')} type="password"
              value={pwForm.newPassword} error={pwErrors.newPassword}
              autoComplete="new-password"
              hint={t('profile.pwHint')}
              onChange={setPwField('newPassword')}
            />
            <Input
              id="confirmPw" label={t('profile.confirmPw')} type="password"
              value={pwForm.confirmPassword} error={pwErrors.confirmPassword}
              autoComplete="new-password"
              onChange={setPwField('confirmPassword')}
            />
            <div className="profile__actions">
              <Button onClick={handlePwSave} disabled={pwMutation.isPending}>
                {pwMutation.isPending ? t('profile.changingPw') : t('profile.changePwBtn')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

export default ProfilePage;
