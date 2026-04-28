import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import LoginForm from '../../../components/auth/LoginForm/LoginForm';
import './LoginPage.css';

const ROLE_HOME = {
  ADMIN: '/admin', TEACHER: '/teacher',
  BURSAR: '/bursar', PARENT: '/parent', STUDENT: '/student',
};

function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const message = location.state?.message;

  useEffect(() => {
    if (user) navigate(ROLE_HOME[user.role] ?? '/', { replace: true });
  }, [user, navigate]);

  const handleSuccess = (u) => {
    const from = location.state?.from?.pathname;
    navigate(from ?? ROLE_HOME[u.role] ?? '/', { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">
          <span className="auth-card__logo-mark">NB</span>
        </div>
        <h1 className="auth-card__title">NovaBulletin</h1>
        <p className="auth-card__subtitle">Connectez-vous à votre espace</p>
        {message && <p className="auth-card__info">{message}</p>}
        <LoginForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}

export default LoginPage;
