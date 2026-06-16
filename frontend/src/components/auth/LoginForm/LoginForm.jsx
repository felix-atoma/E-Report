import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { authService } from '../../../services/authService';
import './LoginForm.css';

function LoginForm() {
  const { login, loginWithTokens } = useAuth();
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [otp, setOtp] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (step === 'otp') {
      // Verify the 2FA OTP
      try {
        const res = await authService.verifyAdmin2fa(form.email, otp);
        loginWithTokens(res.data);
      } catch (err) {
        setError(err.response?.data?.message ?? 'Code OTP invalide');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Step 1: try regular login first; if admin 2FA required, go to OTP step
    const email = form.email.trim();
    const password = form.password.trim();
    try {
      await login(email, password);
    } catch (err) {
      const msg = err.response?.data?.message ?? '';
      // If backend signals 2FA is needed it will return 401 from regular login
      // Try admin-2fa-request to see if this is an admin user
      if (err.response?.status === 401) {
        try {
          const res2fa = await authService.requestAdmin2fa(email, password);
          if (res2fa.data?.requiresOtp) {
            setStep('otp');
            setLoading(false);
            return;
          }
        } catch {
          // Not an admin 2FA case — show original error
        }
      }
      setError(msg || t('login.invalidCredentials'));
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
          <button type="button" className="login-form__alert-close" onClick={() => setError('')} aria-label={t('action.close')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Email field with icon prefix */}
      <div className="login-form__field">
        <label htmlFor="email" className="login-form__label">
          {t('login.email')} <span className="login-form__required">*</span>
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
          {t('login.password')} <span className="login-form__required">*</span>
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
            aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
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

      {/* 2FA OTP step */}
      {step === 'otp' && (
        <div className="login-form__2fa-box">
          <p className="login-form__2fa-title">Vérification en deux étapes</p>
          <p className="login-form__2fa-desc">
            Un code à 6 chiffres a été envoyé à l'adresse <strong>{form.email}</strong>. Vérifiez les logs du serveur en développement.
          </p>
          <div className="login-form__field">
            <label htmlFor="otp" className="login-form__label">Code OTP *</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              className="login-form__input login-form__input--otp"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoFocus
              autoComplete="one-time-code"
            />
          </div>
          <button
            type="button"
            className="login-form__otp-back"
            onClick={() => { setStep('credentials'); setOtp(''); setError(''); }}
          >
            ← Retour
          </button>
        </div>
      )}

      {/* Remember me toggle — only on step 1 */}
      {step === 'credentials' && (
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
          <span className="login-form__remember-text">{t('login.rememberMe')}</span>
        </label>
      </div>
      )}

      {/* Submit button with icon + spinner */}
      <button type="submit" className="login-form__btn" disabled={loading}>
        {loading ? (
          <>
            <span className="login-form__spinner" />
            <span>{t('login.submitting')}</span>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            <span>{t('login.submit')}</span>
          </>
        )}
      </button>

      <p className="login-form__forgot">
        {t('login.forgotPassword')}{' '}
        <Link to="/forgot-password">{t('login.reset')}</Link>
      </p>

      <p className="login-form__forgot" style={{ marginTop: '8px' }}>
        Première connexion ?{' '}
        <Link to="/login-otp" style={{ color: '#6366f1', fontWeight: 600 }}>
          Connexion avec OTP
        </Link>
      </p>
    </form>
  );
}

export default LoginForm;
