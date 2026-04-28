import { useNavigate, useRouteError } from 'react-router-dom';
import './ErrorPage.css';

function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  const status = error?.status ?? error?.statusCode ?? 500;
  const message =
    error?.statusText ??
    error?.message ??
    'Une erreur inattendue est survenue.';

  return (
    <div className="error-page">
      <span className="error-page__code">{status}</span>
      <h1 className="error-page__title">
        {status === 403 ? 'Accès refusé'
          : status === 404 ? 'Page introuvable'
          : 'Erreur serveur'}
      </h1>
      <p className="error-page__desc">{message}</p>
      <div className="error-page__actions">
        <button className="error-page__btn error-page__btn--secondary" onClick={() => navigate(-1)}>
          Retour
        </button>
        <button className="error-page__btn" onClick={() => navigate('/', { replace: true })}>
          Accueil
        </button>
      </div>
    </div>
  );
}

export default ErrorPage;
