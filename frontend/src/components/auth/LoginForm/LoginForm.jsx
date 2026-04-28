import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Input from '../../common/Input/Input';
import Button from '../../common/Button/Button';
import './LoginForm.css';

function LoginForm({ onSuccess }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      onSuccess?.(user);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <Input
        id="email"
        label="Adresse email"
        type="email"
        value={form.email}
        onChange={set('email')}
        autoComplete="email"
        required
      />
      <Input
        id="password"
        label="Mot de passe"
        type="password"
        value={form.password}
        onChange={set('password')}
        autoComplete="current-password"
        required
      />
      {error && <p className="login-form__error" role="alert">{error}</p>}
      <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Connexion…' : 'Se connecter'}
      </Button>
      <p className="login-form__forgot">
        <Link to="/forgot-password">Mot de passe oublié ?</Link>
      </p>
    </form>
  );
}

export default LoginForm;
