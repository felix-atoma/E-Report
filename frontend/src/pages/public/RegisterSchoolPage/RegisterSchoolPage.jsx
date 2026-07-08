import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { institutionsService } from '../../../services/institutionsService';
import logoIcon from '../../../assets/images/novaBulletin-icon.svg';
import './RegisterSchoolPage.css';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'http://localhost:4000';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

function SchoolIllustration() {
  return (
    <div className="asl-illustration asl-illustration--school">
      <div className="asl-card asl-card--school-info">
        <div className="asl-si-icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.85)" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <p className="asl-si-title">Votre école, en ligne</p>
        <p className="asl-si-desc">
          Bulletins numériques, suivi des paiements, communications parents — tout en un seul endroit.
        </p>
      </div>
      <div className="asl-card asl-card--features">
        {[
          { icon: '📊', text: 'Bulletins PDF automatiques' },
          { icon: '💬', text: 'Notifications WhatsApp' },
          { icon: '💳', text: 'Gestion des frais' },
        ].map(({ icon, text }) => (
          <div key={text} className="asl-feature">
            <span className="asl-feature__icon">{icon}</span>
            <span className="asl-feature__text">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegisterSchoolPage() {
  const location = useLocation();

  const [form, setForm] = useState({
    schoolName: '',
    city: '',
    adminName: '',
    adminEmail: '',
    password: '',
    confirmPassword: '',
    declaredStudentCount: '',
  });

  const [emailFromGoogle, setEmailFromGoogle] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const name = params.get('name');
    const email = params.get('email');
    if (name || email) {
      setForm((prev) => ({
        ...prev,
        adminName: name ?? prev.adminName,
        adminEmail: email ?? prev.adminEmail,
      }));
      if (email) setEmailFromGoogle(true);
    }
  }, [location.search]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    const payload = {
      schoolName: form.schoolName.trim(),
      city: form.city.trim(),
      adminName: form.adminName.trim(),
      adminEmail: form.adminEmail.trim().toLowerCase(),
      password: form.password,
    };
    if (form.declaredStudentCount) {
      payload.declaredStudentCount = parseInt(form.declaredStudentCount, 10);
    }

    setLoading(true);
    try {
      await institutionsService.registerSchool(payload);
      setSuccess(true);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Une erreur est survenue. Veuillez réessayer.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="asl-page">
        <div className="asl-card-wrap asl-card-wrap--narrow">
          <div className="asl-right asl-right--centered">
            <div className="rsp-success">
              <div className="rsp-success__icon" aria-hidden="true">
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
                  stroke="#16a34a" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h2 className="rsp-success__title">Compte créé !</h2>
              <p className="rsp-success__body">
                Votre espace scolaire est prêt. Connectez-vous dès maintenant avec votre
                email et mot de passe pour commencer.
              </p>
              <p className="rsp-success__hint">
                Les établissements de moins de 50 élèves bénéficient d'un accès <strong>gratuit</strong>.
                Au-delà, un abonnement est requis.
              </p>
              <Link to="/login" className="rsp-btn rsp-btn--primary" style={{ marginTop: '0.5rem' }}>
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="asl-page asl-page--register">
      <div className="asl-card-wrap asl-card-wrap--wide">

        {/* ── Left panel ─────────────────────────────────────────── */}
        <div className="asl-left">
          <h1 className="asl-left__title">Rejoignez NovaBulletin</h1>
          <p className="asl-left__subtitle">Pour les écoles modernes</p>
          <p className="asl-left__desc">
            Inscrivez votre établissement et commencez à gérer vos bulletins, notes et communications en quelques minutes.
          </p>
          <SchoolIllustration />
          <div className="asl-dots">
            <span className="asl-dot-nav" />
            <span className="asl-dot-nav" />
            <span className="asl-dot-nav asl-dot-nav--active" />
          </div>
        </div>

        {/* ── Right panel ────────────────────────────────────────── */}
        <div className="asl-right">
          <div className="asl-brand">
            <img src={logoIcon} alt="NovaBulletin" className="asl-brand__logo" />
            <div>
              <div className="asl-brand__name">NovaBulletin</div>
              <div className="asl-brand__role">Inscription établissement</div>
            </div>
          </div>

          <h2 className="asl-heading">Créer votre espace scolaire</h2>
          <p className="asl-subheading">Accès immédiat. Gratuit jusqu'à 50 élèves.</p>

          {error && (
            <div className="asl-alert asl-alert--error" role="alert">{error}</div>
          )}

          {!emailFromGoogle && (
            <>
              <button
                type="button"
                className="asl-google-btn"
                onClick={() => { window.location.href = `${API_BASE}/api/auth/google/register`; }}
              >
                <GoogleIcon />
                Continuer avec Google
              </button>
              <div className="asl-divider"><span>ou</span></div>
            </>
          )}

          {emailFromGoogle && (
            <div className="rsp-google-badge" role="status">
              <GoogleIcon />
              <span>Informations pré-remplies depuis Google</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="rsp-form" noValidate>
            <div className="rsp-section-label">Informations de l'établissement</div>

            <div className="rsp-row">
              <div className="rsp-field">
                <label className="rsp-label" htmlFor="schoolName">
                  Nom de l'établissement <span className="rsp-required">*</span>
                </label>
                <input
                  id="schoolName" name="schoolName" type="text"
                  className="rsp-input"
                  placeholder="Ex : Lycée Saint-Joseph"
                  value={form.schoolName}
                  onChange={handleChange}
                  required autoFocus
                />
              </div>
              <div className="rsp-field">
                <label className="rsp-label" htmlFor="city">
                  Ville / Commune <span className="rsp-required">*</span>
                </label>
                <input
                  id="city" name="city" type="text"
                  className="rsp-input"
                  placeholder="Ex : Lomé, Kara…"
                  value={form.city}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="rsp-field">
              <label className="rsp-label" htmlFor="declaredStudentCount">
                Nombre d'élèves estimé <span className="rsp-optional">(optionnel)</span>
              </label>
              <input
                id="declaredStudentCount" name="declaredStudentCount" type="number"
                className="rsp-input"
                placeholder="Ex : 450" min="1"
                value={form.declaredStudentCount}
                onChange={handleChange}
              />
            </div>

            <div className="rsp-section-label rsp-section-label--mt">Compte administrateur</div>

            <div className="rsp-row">
              <div className="rsp-field">
                <label className="rsp-label" htmlFor="adminName">
                  Votre nom complet <span className="rsp-required">*</span>
                </label>
                <input
                  id="adminName" name="adminName" type="text"
                  className="rsp-input"
                  placeholder="Ex : Koffi Amétépé"
                  value={form.adminName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="rsp-field">
                <label className="rsp-label" htmlFor="adminEmail">
                  Email administrateur <span className="rsp-required">*</span>
                </label>
                <input
                  id="adminEmail" name="adminEmail" type="email"
                  className={`rsp-input${emailFromGoogle ? ' rsp-input--readonly' : ''}`}
                  placeholder="admin@monecole.tg"
                  value={form.adminEmail}
                  onChange={emailFromGoogle ? undefined : handleChange}
                  readOnly={emailFromGoogle}
                  required
                />
              </div>
            </div>

            <div className="rsp-row">
              <div className="rsp-field">
                <label className="rsp-label" htmlFor="password">
                  Mot de passe <span className="rsp-required">*</span>
                </label>
                <input
                  id="password" name="password" type="password"
                  className="rsp-input"
                  placeholder="Min. 6 caractères"
                  value={form.password}
                  onChange={handleChange}
                  required minLength={6}
                />
              </div>
              <div className="rsp-field">
                <label className="rsp-label" htmlFor="confirmPassword">
                  Confirmer <span className="rsp-required">*</span>
                </label>
                <input
                  id="confirmPassword" name="confirmPassword" type="password"
                  className="rsp-input"
                  placeholder="Répétez le mot de passe"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="rsp-btn rsp-btn--primary rsp-btn--full"
              disabled={loading}
            >
              {loading && <span className="rsp-spinner" aria-hidden="true" />}
              {loading ? 'Création en cours…' : 'Créer mon compte gratuitement'}
            </button>
          </form>

          <p className="rsp-footer-link">
            Vous avez déjà un compte ?{' '}
            <Link to="/login" className="rsp-link">Se connecter</Link>
          </p>
          <p className="rsp-legal-note">
            En soumettant ce formulaire, vous acceptez nos{' '}
            <Link to="/legal/tos" target="_blank" className="rsp-link">Conditions d'utilisation</Link>
            {' '}et notre{' '}
            <Link to="/legal/privacy" target="_blank" className="rsp-link">Politique de confidentialité</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterSchoolPage;
