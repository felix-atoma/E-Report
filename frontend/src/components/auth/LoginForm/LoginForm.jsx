import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import './LoginForm.css';

function LoginForm({ onSuccess }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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
    <form className="login-form" onSubmit={handleSubmit} noValidate translate="no">

      {/* Dismissible alert — ZDesk style */}
      {error && (
        <div className="login-form__alert" role="alert">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-form__alert-icon">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span className="login-form__alert-text">{error}</span>
          <button type="button" className="login-form__alert-close" onClick={() => setError('')} aria-label="Fermer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Email field with icon prefix */}
      <div className="login-form__field">
        <label htmlFor="email" className="login-form__label">
          Adresse email <span className="login-form__required">*</span>
        </label>
        <div className="login-form__input-group">
          <span className="login-form__input-prefix">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </span>
          <input
            id="email"
            type="email"
            className="login-form__input"
            placeholder="votre@email.com"
            value={form.email}
            onChange={set('email')}
            autoComplete="email"
            required
          />
        </div>
      </div>

      {/* Password field with icon prefix + show/hide toggle */}
      <div className="login-form__field">
        <label htmlFor="password" className="login-form__label">
          Mot de passe <span className="login-form__required">*</span>
        </label>
        <div className="login-form__input-group">
          <span className="login-form__input-prefix">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            className="login-form__input login-form__input--has-suffix"
            placeholder="••••••••"
            value={form.password}
            onChange={set('password')}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="login-form__input-suffix"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Remember me toggle */}
      <div className="login-form__remember">
        <label className="login-form__toggle-label">
          <div className="login-form__toggle">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="login-form__toggle-input"
            />
            <span className="login-form__toggle-track">
              <span className="login-form__toggle-thumb" />
            </span>
          </div>
          <span className="login-form__remember-text">Rester connecté</span>
        </label>
      </div>

      {/* Submit button with icon + spinner */}
      <button type="submit" className="login-form__btn" disabled={loading}>
        {loading ? (
          <>
            <span className="login-form__spinner" />
            <span>Authentification…</span>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            <span>Se connecter</span>
          </>
        )}
      </button>

      <p className="login-form__forgot">
        Mot de passe oublié ?{' '}
        <Link to="/forgot-password">Réinitialiser</Link>
      </p>
    </form>
  );
}

export default LoginForm;
