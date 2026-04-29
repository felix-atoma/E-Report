import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
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

const ROLE_LABEL = {
  ADMIN: 'Administrateur', TEACHER: 'Enseignant',
  BURSAR: 'Gestionnaire',  PARENT: 'Parent', STUDENT: 'Élève',
};

const ROLE_VARIANT = {
  ADMIN: 'danger', TEACHER: 'info', BURSAR: 'warning', PARENT: 'success', STUDENT: 'default',
};

function ProfilePage() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [infoForm, setInfo] = useState({ name: '', whatsappNumber: '' });
  const [infoErrors, setInfoErrors] = useState({});

  const [pwForm, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwErrors, setPwErrors] = useState({});

  const [preview, setPreview] = useState(null); // { file, dataUrl }

  useEffect(() => {
    if (!user) return;
    setInfo({ name: user.name ?? '', whatsappNumber: user.whatsappNumber ?? '' });
  }, [user]);

  const infoMutation = useMutation({
    mutationFn: (data) => usersService.update(user.id, data),
    onSuccess: (res) => {
      toast.success('Profil mis à jour');
      updateUser(res.data);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de mise à jour'),
  });

  const pwMutation = useMutation({
    mutationFn: (data) => usersService.update(user.id, data),
    onSuccess: () => {
      toast.success('Mot de passe modifié');
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwErrors({});
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Mot de passe actuel incorrect'),
  });

  const avatarMutation = useMutation({
    mutationFn: (file) => usersService.uploadAvatar(user.id, file),
    onSuccess: (res) => {
      toast.success('Photo de profil mise à jour');
      updateUser(res.data);
      setPreview(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur lors de l\'upload'),
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
    if (!infoForm.name.trim()) errors.name = 'Nom complet requis';
    if (Object.keys(errors).length) { setInfoErrors(errors); return; }
    infoMutation.mutate({
      name:           infoForm.name,
      whatsappNumber: infoForm.whatsappNumber || undefined,
    });
  }

  function handlePwSave() {
    const errors = {};
    if (!pwForm.currentPassword)   errors.currentPassword = 'Mot de passe actuel requis';
    if (!pwForm.newPassword)       errors.newPassword     = 'Nouveau mot de passe requis';
    else if (pwForm.newPassword.length < 8) errors.newPassword = 'Minimum 8 caractères';
    if (pwForm.newPassword !== pwForm.confirmPassword)
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    if (Object.keys(errors).length) { setPwErrors(errors); return; }
    pwMutation.mutate({ currentPassword: pwForm.currentPassword, password: pwForm.newPassword });
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
    reader.onload = (ev) => setPreview({ file, dataUrl: ev.target.result });
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function cancelPreview() {
    setPreview(null);
  }

  if (!user) return <AppShell title="Profil"><p className="profile__loading">Chargement…</p></AppShell>;

  return (
    <AppShell title="Mon profil">
      <PageHeader title="Mon profil" />

      <div className="profile__layout">
        {/* Identity card */}
        <Card className="profile__identity">
          {/* Avatar — click to upload */}
          <div
            className="profile__avatar-wrap"
            onClick={() => fileInputRef.current?.click()}
            title="Cliquer pour changer la photo"
          >
            <Avatar name={user.name ?? user.email} src={user.profileImage} size="xl" />
            <div className="profile__avatar-overlay">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Modifier
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
              {ROLE_LABEL[user.role] ?? user.role}
            </Badge>
          </div>
        </Card>

        {/* Photo preview + upload confirm */}
        {preview && (
          <Card className="profile__section">
            <h3 className="profile__section-title">Nouvelle photo de profil</h3>
            <div className="profile__avatar-preview">
              <img
                src={preview.dataUrl}
                alt="Aperçu"
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
                    {avatarMutation.isPending ? 'Envoi…' : 'Enregistrer la photo'}
                  </button>
                  <button
                    className="profile__avatar-cancel-btn"
                    onClick={cancelPreview}
                    disabled={avatarMutation.isPending}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
            <p className="profile__avatar-hint">JPG, PNG ou WebP — max 5 Mo</p>
          </Card>
        )}

        {/* Edit info */}
        <Card className="profile__section">
          <h3 className="profile__section-title">Informations personnelles</h3>
          <div className="profile__form">
            <Input
              id="p-name" label="Nom complet" required
              value={infoForm.name} error={infoErrors.name}
              onChange={setInfoField('name')}
            />
            <Input
              id="p-email" label="Adresse email" type="email"
              value={user.email}
              disabled
              hint="L'email ne peut pas être modifié."
            />
            <Input
              id="p-phone" label="Téléphone / WhatsApp"
              value={infoForm.whatsappNumber}
              placeholder="+228 XX XX XX XX"
              onChange={setInfoField('whatsappNumber')}
            />
            <div className="profile__actions">
              <Button onClick={handleInfoSave} disabled={infoMutation.isPending}>
                {infoMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Change password */}
        <Card className="profile__section">
          <h3 className="profile__section-title">Changer de mot de passe</h3>
          <div className="profile__form">
            <Input
              id="currentPw" label="Mot de passe actuel" type="password"
              value={pwForm.currentPassword} error={pwErrors.currentPassword}
              autoComplete="current-password"
              onChange={setPwField('currentPassword')}
            />
            <Input
              id="newPw" label="Nouveau mot de passe" type="password"
              value={pwForm.newPassword} error={pwErrors.newPassword}
              autoComplete="new-password"
              hint="Minimum 8 caractères"
              onChange={setPwField('newPassword')}
            />
            <Input
              id="confirmPw" label="Confirmer le nouveau mot de passe" type="password"
              value={pwForm.confirmPassword} error={pwErrors.confirmPassword}
              autoComplete="new-password"
              onChange={setPwField('confirmPassword')}
            />
            <div className="profile__actions">
              <Button onClick={handlePwSave} disabled={pwMutation.isPending}>
                {pwMutation.isPending ? 'Modification…' : 'Modifier le mot de passe'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

export default ProfilePage;
