import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../../services/api';
import logoIcon from '../../../assets/images/novaBulletin-icon.svg';
import '../asl-auth.css';

function OtpLoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', otp: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email.trim() || !form.otp.trim()) {
      setError('Veuillez renseigner votre email et le code OTP.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login-otp', { email: form.email.trim(), otp: form.otp.trim() });
      const { setupToken, name } = res.data;
      // Store setup token temporarily for the set-password step
      sessionStorage.setItem('setupToken', setupToken);
      sessionStorage.setItem('setupName', name ?? '');
      navigate('/set-password');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Code OTP invalide ou expiré.');
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
            <h1 className="asl-heading__title">Première connexion</h1>
            <p className="asl-heading__sub">Entrez votre email et le code OTP reçu par email.</p>
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
              <label htmlFor="otp-email" className="login-form__label">
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
                  id="otp-email" type="email" className="login-form__input"
                  placeholder="votre@email.com"
                  value={form.email} onChange={set('email')}
                  autoComplete="email" required
                />
              </div>
            </div>

            <div className="login-form__field">
              <label htmlFor="otp-code" className="login-form__label">
                Code OTP (reçu par email) <span className="login-form__required">*</span>
              </label>
              <div className="login-form__input-group">
                <span className="login-form__input-prefix">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="otp-code" type="text" className="login-form__input"
                  placeholder="ex: A1B2C3D4E5F6..."
                  value={form.otp} onChange={set('otp')}
                  style={{ fontFamily: 'monospace', fontSize: '0.95em', letterSpacing: '0.1em' }}
                  autoComplete="off" required
                />
              </div>
            </div>

            <button type="submit" className="login-form__btn" disabled={loading}>
              {loading ? (
                <><span className="login-form__spinner" /><span>Vérification…</span></>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg><span>Valider le code</span></>
              )}
            </button>

            <p className="login-form__forgot" style={{ marginTop: '12px' }}>
              Vous avez déjà un mot de passe ?{' '}
              <Link to="/login">Se connecter normalement</Link>
            </p>
          </form>
        </div>
      </div>
      <div className="asl-right" />
    </div>
  );
}

export default OtpLoginPage;
