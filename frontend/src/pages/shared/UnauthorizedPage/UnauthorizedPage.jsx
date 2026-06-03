import { Link, useNavigate } from 'react-router-dom';
import '../ErrorPages.css';

function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div className="err">
      <div className="err__card">
        <img src="/error-403.svg" alt="403 — Accès refusé" className="err__illustration" />
        <div className="err__body">
          <h1 className="err__title">Accès refusé</h1>
          <p className="err__desc">
            L'ours dit non. Vous n'avez pas les droits nécessaires pour accéder à cette page.
            Contactez votre administrateur.
          </p>
          <div className="err__actions">
            <button className="err__btn err__btn--secondary" onClick={() => navigate(-1)}>
              ← Retour
            </button>
            <Link to="/" className="err__btn err__btn--primary">
              Accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
