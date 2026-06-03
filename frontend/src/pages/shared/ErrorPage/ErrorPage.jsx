import { useNavigate, useRouteError } from 'react-router-dom';
import '../ErrorPages.css';

const CONFIG = {
  403: {
    img: '/error-403.svg',
    alt: '403 — Accès refusé',
    title: 'Accès refusé',
    desc: "L'ours dit non. Vous n'avez pas les droits pour accéder à cette page. Contactez votre administrateur.",
  },
  404: {
    img: '/error-404.svg',
    alt: '404 — Page introuvable',
    title: 'Page introuvable',
    desc: "Cette page a disparu dans les airs. Même notre fantôme ne la trouve plus.",
  },
  500: {
    img: '/error-500.svg',
    alt: '500 — Erreur serveur',
    title: 'Erreur serveur',
    desc: "Notre serveur a surchauffé. Nous sommes déjà en train de réparer — revenez dans quelques instants.",
  },
};

function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  const status = error?.status ?? error?.statusCode ?? 500;
  const cfg = CONFIG[status] ?? CONFIG[500];

  return (
    <div className="err">
      <div className="err__card">
        <img src={cfg.img} alt={cfg.alt} className="err__illustration" />
        <div className="err__body">
          <h1 className="err__title">{cfg.title}</h1>
          <p className="err__desc">{cfg.desc}</p>
          <div className="err__actions">
            <button className="err__btn err__btn--secondary" onClick={() => navigate(-1)}>
              ← Retour
            </button>
            <button className="err__btn err__btn--primary" onClick={() => navigate('/', { replace: true })}>
              Accueil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ErrorPage;
