import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../ErrorPages.css';

function UnauthorizedPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="err">
      <div className="err__card">
        <img src="/error-403.svg" alt="403" className="err__illustration" />
        <div className="err__body">
          <h1 className="err__title">{t('error.403.title')}</h1>
          <p className="err__desc">{t('error.403.desc')}</p>
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

export default UnauthorizedPage;
