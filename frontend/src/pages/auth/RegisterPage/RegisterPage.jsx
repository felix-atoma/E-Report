import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import RegisterForm from '../../../components/auth/RegisterForm/RegisterForm';
import './RegisterPage.css';

const ROLE_HOME = {
  ADMIN: '/admin', TEACHER: '/teacher',
  BURSAR: '/bursar', PARENT: '/parent', STUDENT: '/student',
};

function RegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate(ROLE_HOME[user.role] ?? '/', { replace: true });
  }, [user, navigate]);

  function handleSuccess(data) {
    navigate('/login', {
      state: { message: 'Compte créé avec succès. Veuillez vous connecter.' },
      replace: true,
    });
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <div className="auth-card__logo">
          <span className="auth-card__logo-mark">NB</span>
        </div>
        <h1 className="auth-card__title">NovaBulletin</h1>
        <p className="auth-card__subtitle">Créez votre compte</p>
        <RegisterForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}

export default RegisterPage;
