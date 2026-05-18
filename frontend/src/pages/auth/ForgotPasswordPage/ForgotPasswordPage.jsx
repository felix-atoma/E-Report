import { Link } from 'react-router-dom';
import ForgotPasswordForm from '../../../components/auth/ForgotPasswordForm/ForgotPasswordForm';
import logoIcon from '../../../assets/images/novaBulletin-icon.svg';
import './ForgotPasswordPage.css';

function LockIllustration() {
  return (
    <div className="asl-illustration asl-illustration--lock">
      <div className="asl-card asl-card--lock">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.9)" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <p className="asl-lock-label">Réinitialisation sécurisée</p>
        <p className="asl-lock-hint">
          Un lien de réinitialisation sera envoyé à votre adresse email.
        </p>
      </div>
      <div className="asl-card asl-card--steps">
        {['Entrez votre email', 'Ouvrez le lien reçu', 'Créez un nouveau mot de passe'].map((step, i) => (
          <div key={i} className="asl-step">
            <span className="asl-step__num">{i + 1}</span>
            <span className="asl-step__text">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ForgotPasswordPage() {
  return (
    <div className="asl-page">
      <div className="asl-card-wrap">

        {/* ── Left panel ─────────────────────────────────────────── */}
        <div className="asl-left">
          <h1 className="asl-left__title">Mot de passe oublié ?</h1>
          <p className="asl-left__subtitle">Pas de panique, ça arrive !</p>
          <p className="asl-left__desc">
            Entrez votre adresse email ci-contre et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>
          <LockIllustration />
          <div className="asl-dots">
            <span className="asl-dot-nav" />
            <span className="asl-dot-nav asl-dot-nav--active" />
            <span className="asl-dot-nav" />
          </div>
        </div>

        {/* ── Right panel ────────────────────────────────────────── */}
        <div className="asl-right">
          <div className="asl-brand">
            <img src={logoIcon} alt="NovaBulletin" className="asl-brand__logo" />
            <div>
              <div className="asl-brand__name">NovaBulletin</div>
              <div className="asl-brand__role">Gestion scolaire</div>
            </div>
          </div>

          <h2 className="asl-heading">Réinitialiser le mot de passe</h2>
          <p className="asl-subheading">
            Saisissez l'email associé à votre compte et suivez les instructions.
          </p>

          <ForgotPasswordForm />

          <Link to="/login" className="asl-back-link">
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
