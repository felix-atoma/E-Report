import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../../services/authService';
import Input from '../../common/Input/Input';
import Button from '../../common/Button/Button';
import './ResetPasswordForm.css';

function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authService.resetPassword(token, form.password);
      navigate('/login', { state: { message: 'Mot de passe réinitialisé. Connectez-vous.' } });
    } catch {
      setError('Le lien est expiré ou invalide. Demandez un nouveau lien.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="reset-password-form" onSubmit={handleSubmit} noValidate>
      <Input
        id="password"
        label="Nouveau mot de passe"
        type="password"
        value={form.password}
        onChange={set('password')}
        autoComplete="new-password"
        required
      />
      <Input
        id="confirm"
        label="Confirmer le mot de passe"
        type="password"
        value={form.confirm}
        onChange={set('confirm')}
        autoComplete="new-password"
        required
      />
      {error && <p className="reset-password-form__error" role="alert">{error}</p>}
      <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Enregistrement…' : 'Réinitialiser'}
      </Button>
    </form>
  );
}

export default ResetPasswordForm;
