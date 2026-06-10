import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import logoIcon from '../../../assets/images/novaBulletin-icon.svg';
import '../asl-auth.css';

const ROLE_HOME = {
  SUPERADMIN: '/superadmin', ADMIN: '/admin', TEACHER: '/teacher',
  BURSAR: '/bursar', PARENT: '/parent', STUDENT: '/student',
};

const STRENGTH_KEYS = ['', 'weak', 'fair', 'good', 'strong'];

function SetPasswordPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const name = sessionStorage.getItem('setupName') ?? '';
  const setupToken = sessionStorage.getItem('setupToken');

  useEffect(() => {
    if (!setupToken) navigate('/login-otp');
  }, [setupToken, navigate]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const strength = (p) => {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const s = strength(form.password);
  const strengthLabel = s > 0 ? t(`password.strength.${STRENGTH_KEYS[s]}`) : '';
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'][s];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError(t('password.tooShort')); return; }
    if (form.password !== form.confirm) { setError(t('password.noMatch')); return; }

    setLoading(true);
    try {
      const res = await api.post('/auth/set-password', { password: form.password }, {
        headers: { Authorization: `Bearer ${setupToken}` },
      });
      const { accessToken, refreshToken } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      sessionStorage.removeItem('setupToken');
      sessionStorage.removeItem('setupName');

      const me = await api.get('/auth/me');
      const role = me.data?.role ?? 'STUDENT';
      navigate(ROLE_HOME[role] ?? '/');
    } catch (err) {
      setError(err.response?.data?.message ?? t('common.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="asl-root">
      <div className="asl-left">
        <div className="asl-left__inner">
          <div className="asl-brand">
            <img src={logoIcon} alt="NovaBulletin" className="asl-brand__icon" />
            <span className="asl-brand__name">NovaBulletin</span>
          </div>
          <div className="asl-heading">
            <h1 className="asl-heading__title">
              {name ? `Bienvenue, ${name} 👋` : 'Définir votre mot de passe'}
            </h1>
            <p className="asl-heading__sub">Choisissez un mot de passe sécurisé pour votre compte.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="login-form__alert" role="alert">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-form__alert-icon">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span className="login-form__alert-text">{error}</span>
                <button type="button" className="login-form__alert-close" onClick={() => setError('')}>✕</button>
              </div>
            )}

            <div className="login-form__field">
              <label htmlFor="new-password" className="login-form__label">
                Nouveau mot de passe <span className="login-form__required">*</span>
              </label>
              <div className="login-form__input-group">
                <span className="login-form__input-prefix">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="new-password"
                  type={show ? 'text' : 'password'}
                  className="login-form__input login-form__input--has-suffix"
                  placeholder="Minimum 8 caractères"
                  value={form.password} onChange={set('password')}
                  autoComplete="new-password" required minLength={8}
                />
                <button type="button" className="login-form__input-suffix" onClick={() => setShow(v => !v)}>
                  {show
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              {form.password && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ height: '4px', borderRadius: '2px', background: '#e5e7eb', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s * 25}%`, background: strengthColor, transition: 'width 0.3s, background 0.3s', borderRadius: '2px' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
                </div>
              )}
            </div>

            <div className="login-form__field">
              <label htmlFor="confirm-password" className="login-form__label">
                Confirmer le mot de passe <span className="login-form__required">*</span>
              </label>
              <div className="login-form__input-group">
                <span className="login-form__input-prefix">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="confirm-password"
                  type={show ? 'text' : 'password'}
                  className="login-form__input"
                  placeholder="Répéter le mot de passe"
                  value={form.confirm} onChange={set('confirm')}
                  autoComplete="new-password" required
                />
              </div>
            </div>

            <button type="submit" className="login-form__btn" disabled={loading}>
              {loading ? (
                <><span className="login-form__spinner" /><span>Enregistrement…</span></>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg><span>Définir mon mot de passe</span></>
              )}
            </button>
          </form>
        </div>
      </div>
      <div className="asl-right" />
    </div>
  );
}

export default SetPasswordPage;
