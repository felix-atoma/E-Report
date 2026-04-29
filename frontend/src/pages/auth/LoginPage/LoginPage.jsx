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
    <div className="auth-box">
      <div className="auth-container">
        {/* Session / redirect message */}
        {message && (
          <div className="auth-alert auth-alert--warning" role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>{message}</span>
          </div>
        )}

        {/* ZDesk hard-card outer → embossed-card inner */}
        <div className="hard-card">
          <div className="login-card embossed-card">
            {/* Decorative corner element */}
            <div className="login-card__corner-deco" aria-hidden="true">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <circle cx="120" cy="0" r="80" fill="rgba(249,115,22,0.06)"/>
                <circle cx="120" cy="0" r="50" fill="rgba(249,115,22,0.06)"/>
                <circle cx="120" cy="0" r="25" fill="rgba(249,115,22,0.07)"/>
              </svg>
            </div>

            {/* Brand — centered stack matching ZDesk auth-brand text-center */}
            <div className="login-card__brand">
              <div className="login-card__logo-mark">NB</div>
              <span className="login-card__app-name">NovaBulletin</span>
              <p className="login-card__subtitle">
                Connectez-vous à votre espace
              </p>
            </div>

            <LoginForm onSuccess={handleSuccess} />
          </div>
        </div>

        <p className="auth-footer">
          © {new Date().getFullYear()} NovaBulletin — Tous droits réservés
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
