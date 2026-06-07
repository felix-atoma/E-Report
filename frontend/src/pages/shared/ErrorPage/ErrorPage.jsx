import { useNavigate, useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../ErrorPages.css';

function ErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();
  const navigate = useNavigate();

  const status = error?.status ?? error?.statusCode ?? 500;
  const validStatus = [403, 404, 500].includes(status) ? status : 500;

  return (
    <div className="err">
      <div className="err__card">
        <img src={`/error-${validStatus}.svg`} alt={String(validStatus)} className="err__illustration" />
        <div className="err__body">
          <h1 className="err__title">{t(`error.${validStatus}.title`)}</h1>
          <p className="err__desc">{t(`error.${validStatus}.desc`)}</p>
          <div className="err__actions">
            <button className="err__btn err__btn--secondary" onClick={() => navigate(-1)}>
              {t('error.back')}
            </button>
            <button className="err__btn err__btn--primary" onClick={() => navigate('/', { replace: true })}>
              {t('error.home')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ErrorPage;
