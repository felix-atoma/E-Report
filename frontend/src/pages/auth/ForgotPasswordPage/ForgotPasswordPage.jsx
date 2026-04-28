import { Link } from 'react-router-dom';
import ForgotPasswordForm from '../../../components/auth/ForgotPasswordForm/ForgotPasswordForm';
import './ForgotPasswordPage.css';

function ForgotPasswordPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__title">Mot de passe oublié</h1>
        <p className="auth-card__subtitle">
          Entrez votre email pour recevoir un lien de réinitialisation.
        </p>
        <ForgotPasswordForm />
        <p className="auth-card__back">
          <Link to="/login">← Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
