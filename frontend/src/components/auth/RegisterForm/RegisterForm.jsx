import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../../services/authService';
import Input from '../../common/Input/Input';
import Select from '../../common/Select/Select';
import Button from '../../common/Button/Button';
import './RegisterForm.css';

const ROLE_OPTIONS = [
  { value: 'PARENT',  label: 'Parent' },
  { value: 'STUDENT', label: 'Élève' },
];

function validate(form) {
  const errors = {};
  if (!form.firstName.trim())  errors.firstName = 'Prénom requis';
  if (!form.lastName.trim())   errors.lastName  = 'Nom requis';
  if (!form.email.trim())      errors.email     = 'Email requis';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email invalide';
  if (!form.password)          errors.password  = 'Mot de passe requis';
  else if (form.password.length < 8) errors.password = 'Minimum 8 caractères';
  if (form.password !== form.confirm) errors.confirm = 'Les mots de passe ne correspondent pas';
  if (!form.role)              errors.role      = 'Rôle requis';
  return errors;
}

function RegisterForm({ onSuccess }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    password: '', confirm: '', role: 'PARENT', inviteToken: '',
  });
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      if (errors[field]) setErrors((err) => ({ ...err, [field]: undefined }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res = await authService.register({
        firstName:   form.firstName,
        lastName:    form.lastName,
        email:       form.email,
        password:    form.password,
        role:        form.role,
        inviteToken: form.inviteToken || undefined,
      });
      onSuccess?.(res.data);
    } catch (err) {
      setApiError(err?.response?.data?.message ?? 'Erreur lors de la création du compte.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="register-form" onSubmit={handleSubmit} noValidate>
      <div className="register-form__row">
        <Input
          id="firstName" label="Prénom" required autoComplete="given-name"
          value={form.firstName} error={errors.firstName} onChange={set('firstName')}
        />
        <Input
          id="lastName" label="Nom" required autoComplete="family-name"
          value={form.lastName} error={errors.lastName} onChange={set('lastName')}
        />
      </div>

      <Input
        id="reg-email" label="Adresse email" type="email" required autoComplete="email"
        value={form.email} error={errors.email} onChange={set('email')}
      />

      <Select
        id="role" label="Je suis" required
        value={form.role} error={errors.role}
        options={ROLE_OPTIONS}
        onChange={set('role')}
      />

      <Input
        id="inviteToken" label="Code d'invitation"
        value={form.inviteToken}
        placeholder="Fourni par l'établissement (optionnel)"
        onChange={set('inviteToken')}
        hint="Requis si votre école n'autorise pas l'auto-inscription."
      />

      <Input
        id="reg-password" label="Mot de passe" type="password" required autoComplete="new-password"
        value={form.password} error={errors.password} onChange={set('password')}
        hint="Minimum 8 caractères"
      />

      <Input
        id="confirm" label="Confirmer le mot de passe" type="password" required
        value={form.confirm} error={errors.confirm} onChange={set('confirm')}
      />

      {apiError && <p className="register-form__error" role="alert">{apiError}</p>}

      <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Création du compte…' : 'Créer mon compte'}
      </Button>

      <p className="register-form__login">
        Déjà un compte ? <Link to="/login">Se connecter</Link>
      </p>
    </form>
  );
}

export default RegisterForm;
