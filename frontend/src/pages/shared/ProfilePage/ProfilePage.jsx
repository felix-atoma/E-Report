import { useState, useEffect } from 'react';
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
  const { user } = useAuth();

  const [infoForm, setInfo] = useState({ firstName: '', lastName: '', phone: '' });
  const [infoErrors, setInfoErrors] = useState({});

  const [pwForm, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwErrors, setPwErrors] = useState({});

  useEffect(() => {
    if (!user) return;
    setInfo({
      firstName: user.firstName ?? '',
      lastName:  user.lastName  ?? '',
      phone:     user.phone     ?? '',
    });
  }, [user]);

  const infoMutation = useMutation({
    mutationFn: (data) => usersService.update(user.id, data),
    onSuccess: () => toast.success('Profil mis à jour'),
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur de mise à jour'),
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
    if (!infoForm.firstName.trim()) errors.firstName = 'Prénom requis';
    if (!infoForm.lastName.trim())  errors.lastName  = 'Nom requis';
    if (Object.keys(errors).length) { setInfoErrors(errors); return; }
    infoMutation.mutate({
      firstName: infoForm.firstName,
      lastName:  infoForm.lastName,
      phone:     infoForm.phone || undefined,
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
    pwMutation.mutate({
      currentPassword: pwForm.currentPassword,
      password:        pwForm.newPassword,
    });
  }

  if (!user) return <AppShell title="Profil"><p className="profile__loading">Chargement…</p></AppShell>;

  return (
    <AppShell title="Mon profil">
      <PageHeader title="Mon profil" />

      <div className="profile__layout">
        {/* Identity card */}
        <Card className="profile__identity">
          <Avatar
            name={`${user.firstName} ${user.lastName}`}
            size="xl"
            className="profile__avatar"
          />
          <div className="profile__identity-info">
            <div className="profile__full-name">{user.firstName} {user.lastName}</div>
            <div className="profile__email">{user.email}</div>
            <Badge variant={ROLE_VARIANT[user.role] ?? 'default'}>
              {ROLE_LABEL[user.role] ?? user.role}
            </Badge>
          </div>
        </Card>

        {/* Edit info */}
        <Card className="profile__section">
          <h3 className="profile__section-title">Informations personnelles</h3>
          <div className="profile__form">
            <div className="profile__row">
              <Input
                id="p-firstName" label="Prénom" required
                value={infoForm.firstName} error={infoErrors.firstName}
                onChange={setInfoField('firstName')}
              />
              <Input
                id="p-lastName" label="Nom" required
                value={infoForm.lastName} error={infoErrors.lastName}
                onChange={setInfoField('lastName')}
              />
            </div>
            <Input
              id="p-email" label="Adresse email" type="email"
              value={user.email}
              disabled
              hint="L'email ne peut pas être modifié."
            />
            <Input
              id="p-phone" label="Téléphone"
              value={infoForm.phone}
              placeholder="+228 XX XX XX XX"
              onChange={setInfoField('phone')}
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
