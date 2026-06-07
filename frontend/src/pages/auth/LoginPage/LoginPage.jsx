import { useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import LoginForm from '../../../components/auth/LoginForm/LoginForm';
import logoIcon from '../../../assets/images/novaBulletin-icon.svg';
import './LoginPage.css';

const ROLE_HOME = {
  SUPERADMIN: '/superadmin',
  ADMIN: '/admin', TEACHER: '/teacher',
  BURSAR: '/bursar', PARENT: '/parent', STUDENT: '/student',
};

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

/* Dashboard illustration — school stats cards */
function DashboardIllustration() {
  const bars = [38, 55, 42, 68, 52, 75, 60, 80, 58, 70, 85, 65];
  return (
    <div className="asl-illustration">
      {/* Main stats card */}
      <div className="asl-card asl-card--main">
        <div className="asl-card__header">
          <span className="asl-card__title">Résultats scolaires</span>
          <div className="asl-card__legend">
            <span className="asl-dot asl-dot--blue" />Moyenne
            <span className="asl-dot asl-dot--gray" />Classe
          </div>
        </div>
        <div className="asl-bars">
          {bars.map((h, i) => (
            <div key={i} className="asl-bar-col">
              <div className="asl-bar asl-bar--bg" style={{ height: '72px' }} />
              <div className="asl-bar asl-bar--fg" style={{ height: `${h}px` }} />
            </div>
          ))}
        </div>
        <div className="asl-months">
          {['Sep','Oct','Nov','Déc','Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû'].map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>
      {/* Overlay donut card */}
      <div className="asl-card asl-card--donut">
        <div className="asl-card__title asl-card__title--sm">Taux de réussite</div>
        <svg viewBox="0 0 80 80" className="asl-donut">
          <circle cx="40" cy="40" r="28" fill="none" stroke="#e5e7eb" strokeWidth="10"/>
          <circle cx="40" cy="40" r="28" fill="none" stroke="#4ade80" strokeWidth="10"
            strokeDasharray="123 176" strokeLinecap="round"
            transform="rotate(-90 40 40)"/>
          <circle cx="40" cy="40" r="28" fill="none" stroke="#fb923c" strokeWidth="10"
            strokeDasharray="35 176" strokeLinecap="round" strokeDashoffset="-123"
            transform="rotate(-90 40 40)"/>
          <text x="40" y="44" textAnchor="middle" fontSize="13" fontWeight="800" fill="white">78%</text>
        </svg>
        <div className="asl-donut-legend">
          <span><span className="asl-dot asl-dot--green"/>Admis</span>
          <span><span className="asl-dot asl-dot--orange"/>Redoublants</span>
        </div>
      </div>
    </div>
  );
}

function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const message = location.state?.message;

  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname;
      const dest = from ?? ROLE_HOME[user.role] ?? '/';
      navigate(dest, { replace: true });
    }
  }, [user, location.state, navigate]);

  return (
    <div className="asl-page">
      <div className="asl-card-wrap">

        {/* ── Left panel ─────────────────────────────────────── */}
        <div className="asl-left">
          <h1 className="asl-left__title">Bienvenue !</h1>
          <p className="asl-left__subtitle">Connectez-vous à votre espace</p>
          <p className="asl-left__desc">
            Gérez vos classes, bulletins, notes et communications avec les parents — tout en un seul endroit.
          </p>
          <DashboardIllustration />
          <div className="asl-dots">
            <span className="asl-dot-nav asl-dot-nav--active" />
            <span className="asl-dot-nav" />
            <span className="asl-dot-nav" />
          </div>
        </div>

        {/* ── Right panel ────────────────────────────────────── */}
        <div className="asl-right">
          {/* Brand */}
          <div className="asl-brand">
            <img src={logoIcon} alt="NovaBulletin" className="asl-brand__logo" />
            <div>
              <div className="asl-brand__name">NovaBulletin</div>
              <div className="asl-brand__role">Gestion scolaire</div>
            </div>
          </div>

          {/* Heading */}
          <h2 className="asl-heading">Connexion à votre compte</h2>
          <p className="asl-subheading">{t('login.subtitle')}</p>

          {/* Warning message (e.g. from redirect) */}
          {message && (
            <div className="asl-alert" role="alert">{message}</div>
          )}

          {/* Form — reuses existing LoginForm */}
          <LoginForm />

          {/* Sign-up CTA */}
          <Link to="/register-school" className="asl-signup-btn">
            Nouveau ? Inscrire votre établissement
          </Link>

          {/* Divider */}
          <div className="asl-divider"><span>ou</span></div>

          {/* Google */}
          <button
            type="button"
            className="asl-google-btn"
            onClick={() => { window.location.href = `${API_BASE}/api/auth/google`; }}
          >
            <GoogleIcon />
            Continuer avec Google
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
