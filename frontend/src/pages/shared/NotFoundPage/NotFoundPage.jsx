import { Link } from 'react-router-dom';
import './NotFoundPage.css';

function NotFoundPage() {
  return (
    <div className="error-page">
      <span className="error-page__code">404</span>
      <h1 className="error-page__title">Page introuvable</h1>
      <p className="error-page__desc">Cette page n&apos;existe pas ou a été déplacée.</p>
      <Link to="/" className="error-page__btn">Retour à l&apos;accueil</Link>
    </div>
  );
}

export default NotFoundPage;
