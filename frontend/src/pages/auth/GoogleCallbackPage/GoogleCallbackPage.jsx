import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import './GoogleCallbackPage.css';

const ROLE_HOME = {
  SUPERADMIN: '/superadmin',
  ADMIN: '/admin',
  TEACHER: '/teacher',
  BURSAR: '/bursar',
  PARENT: '/parent',
  STUDENT: '/student',
};

function GoogleCallbackPage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [errorType, setErrorType] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const role = params.get('role');
    const error = params.get('error');

    if (error) {
      setErrorType(error);
      return;
    }

    if (accessToken && refreshToken && role) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      // Sync auth context — fetch /me via useAuth on next render would
      // pick up the token, but we trigger a navigate immediately so
      // the ProtectedRoute will call /me itself.
      // We just redirect to the role dashboard; AuthContext re-hydrates.
      navigate(ROLE_HOME[role] ?? '/', { replace: true });
      return;
    }

    // Neither tokens nor error — something went wrong
    setErrorType('unknown');
  }, [navigate, updateUser]);

  if (errorType === 'no_account') {
    return (
      <div className="gcb-box">
        <div className="gcb-card">
          <div className="gcb-icon gcb-icon--warn" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 className="gcb-title">Compte introuvable</h2>
          <p className="gcb-body">
            Aucun compte n'est associé à cette adresse Google.
            Contactez votre établissement pour obtenir vos accès.
          </p>
          <Link to="/login" className="gcb-btn">Retour à la connexion</Link>
        </div>
      </div>
    );
  }

  if (errorType === 'inactive') {
    return (
      <div className="gcb-box">
        <div className="gcb-card">
          <div className="gcb-icon gcb-icon--warn" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h2 className="gcb-title">Compte inactif</h2>
          <p className="gcb-body">
            Votre compte est inactif ou votre établissement est en attente d'activation.
            Contactez l'administrateur.
          </p>
          <Link to="/login" className="gcb-btn">Retour à la connexion</Link>
        </div>
      </div>
    );
  }

  if (errorType) {
    return (
      <div className="gcb-box">
        <div className="gcb-card">
          <div className="gcb-icon gcb-icon--warn" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h2 className="gcb-title">Une erreur est survenue</h2>
          <p className="gcb-body">La connexion avec Google a échoué. Veuillez réessayer.</p>
          <Link to="/login" className="gcb-btn">Retour à la connexion</Link>
        </div>
      </div>
    );
  }

  // Processing / spinner state
  return (
    <div className="gcb-box">
      <div className="gcb-card">
        <div className="gcb-spinner" aria-label="Chargement" />
        <p className="gcb-body">Connexion en cours…</p>
      </div>
    </div>
  );
}

export default GoogleCallbackPage;
