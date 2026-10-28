import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import api from '../../../services/api';
import './VerifyCardPage.css';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '—');

/** Page publique ouverte par le QR code d'une carte d'élève : la carte est-elle authentique ? */
export default function VerifyCardPage() {
  const { code } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['verify-card', code],
    queryFn: () => api.get(`/classes/cards/verify/${encodeURIComponent(code)}`).then((r) => r.data),
    retry: false,
  });

  return (
    <div className="vcard">
      <Helmet><title>Vérification de carte d'élève — NovaBulletin</title></Helmet>
      <div className="vcard__box">
        {isLoading ? (
          <p className="vcard__wait">Vérification de la carte…</p>
        ) : isError || !data?.valid ? (
          <div className="vcard__result vcard__result--bad">
            <div className="vcard__icon">✕</div>
            <h1>Carte non reconnue</h1>
            <p>Ce code ne correspond à aucune carte d'élève délivrée par une école sur NovaBulletin. La carte peut être falsifiée.</p>
          </div>
        ) : (
          <>
            <div className="vcard__result vcard__result--ok">
              <div className="vcard__icon">✓</div>
              <h1>Carte authentique</h1>
              <p>Délivrée par {data.school.name}</p>
            </div>
            <div className="vcard__student">
              {data.photo ? <img src={data.photo} alt="" className="vcard__photo" /> : <div className="vcard__photo vcard__photo--empty" />}
              <div className="vcard__info">
                <div className="vcard__name">{data.name}</div>
                <div><span>Matricule</span><b>{data.admissionNumber}</b></div>
                {data.className && <div><span>Classe</span><b>{data.className} · {data.academicYear}</b></div>}
                <div><span>Né(e) le</span><b>{fmtDate(data.dateOfBirth)}</b></div>
              </div>
            </div>
            <div className="vcard__school">
              {data.school.logo && <img src={data.school.logo} alt="" />}
              <div><b>{data.school.name}</b>{data.school.address && <div>{data.school.address}</div>}</div>
            </div>
            <p className="vcard__note">Comparez la photo avec la personne qui présente la carte.</p>
          </>
        )}
        <Link to="/home" className="vcard__brand">Vérifié par NovaBulletin</Link>
      </div>
    </div>
  );
}
