import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../ErrorPages.css';

function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="err">
      <div className="err__card">
        <img src="/error-404.svg" alt="404" className="err__illustration" />
        <div className="err__body">
          <h1 className="err__title">{t('error.404.title')}</h1>
          <p className="err__desc">{t('error.404.desc')}</p>
          <div className="err__actions">
            <button className="err__btn err__btn--secondary" onClick={() => navigate(-1)}>
              {t('error.back')}
            </button>
            <Link to="/" className="err__btn err__btn--primary">
              {t('error.home')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
