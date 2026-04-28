import ResetPasswordForm from '../../../components/auth/ResetPasswordForm/ResetPasswordForm';
import './ResetPasswordPage.css';

function ResetPasswordPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__title">Nouveau mot de passe</h1>
        <p className="auth-card__subtitle">Choisissez un mot de passe sécurisé.</p>
        <ResetPasswordForm />
      </div>
    </div>
  );
}

export default ResetPasswordPage;
