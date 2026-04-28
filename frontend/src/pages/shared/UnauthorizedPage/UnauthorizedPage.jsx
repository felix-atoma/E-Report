import { Link } from 'react-router-dom';
import './UnauthorizedPage.css';

function UnauthorizedPage() {
  return (
    <div className="error-page">
      <span className="error-page__code">403</span>
      <h1 className="error-page__title">Accès refusé</h1>
      <p className="error-page__desc">Vous n&apos;avez pas les droits nécessaires pour accéder à cette page.</p>
      <Link to="/" className="error-page__btn">Retour à l&apos;accueil</Link>
    </div>
  );
}

export default UnauthorizedPage;
