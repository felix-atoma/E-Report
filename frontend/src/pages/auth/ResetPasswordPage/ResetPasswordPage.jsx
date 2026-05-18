import { Link } from 'react-router-dom';
import ResetPasswordForm from '../../../components/auth/ResetPasswordForm/ResetPasswordForm';
import logoIcon from '../../../assets/images/novaBulletin-icon.svg';
import './ResetPasswordPage.css';

function ResetPasswordPage() {
  return (
    <div className="asl-page">
      <div className="asl-card-wrap">

        {/* ── Left panel ─────────────────────────────────────────── */}
        <div className="asl-left">
          <h1 className="asl-left__title">Nouveau mot de passe</h1>
          <p className="asl-left__subtitle">Sécurisez votre compte</p>
          <p className="asl-left__desc">
            Choisissez un mot de passe fort d'au moins 8 caractères incluant lettres et chiffres.
          </p>
          <div className="asl-illustration asl-illustration--lock" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <div className="asl-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', maxWidth: '200px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.85)" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: 0, textAlign: 'center' }}>
                Compte protégé
              </p>
              <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
                Votre nouveau mot de passe sera chiffré et sécurisé.
              </p>
            </div>
          </div>
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

          <h2 className="asl-heading">Créer un nouveau mot de passe</h2>
          <p className="asl-subheading">Saisissez votre nouveau mot de passe ci-dessous.</p>

          <ResetPasswordForm />

          <Link to="/login" className="asl-back-link">
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
