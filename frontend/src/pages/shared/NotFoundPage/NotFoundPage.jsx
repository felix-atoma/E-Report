import { Link, useNavigate } from 'react-router-dom';
import '../ErrorPages.css';

function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="err">
      <div className="err__card">
        <img src="/error-404.svg" alt="404 — Page introuvable" className="err__illustration" />
        <div className="err__body">
          <h1 className="err__title">Page introuvable</h1>
          <p className="err__desc">
            Cette page a disparu dans les airs. Même notre fantôme ne la trouve plus.
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

export default NotFoundPage;
