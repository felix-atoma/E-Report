import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import api from '../../../services/api';
import { AuthContext } from '../../../context/AuthContext';
import Loading from '../../../components/common/Loading/Loading';
import './StudentCardsPage.css';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '—');
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** Une carte d'élève (format carte bancaire 85,6 × 54 mm). */
function StudentCard({ s, cls, inst, qr }) {
  return (
    <div className="scard" style={{ '--scard-primary': inst.primaryColor }}>
      <div className="scard__band">
        {inst.logo ? <img src={inst.logo} alt="" className="scard__logo" /> : <div className="scard__logo scard__logo--empty" />}
        <div className="scard__school">
          <div className="scard__school-name">{inst.name}</div>
          <div className="scard__title">CARTE D'IDENTITÉ SCOLAIRE · {cls.academicYear}</div>
        </div>
      </div>
      <div className="scard__body">
        <div className="scard__photo">
          {s.photo ? <img src={s.photo} alt="" /> : <span>{initials(s.name)}</span>}
        </div>
        <div className="scard__info">
          <div className="scard__name">{s.name}</div>
          <div className="scard__row"><span>Matricule</span><b>{s.admissionNumber}</b></div>
          <div className="scard__row"><span>Classe</span><b>{cls.name}</b></div>
          <div className="scard__row"><span>Né(e) le</span><b>{fmtDate(s.dateOfBirth)}</b></div>
          <div className="scard__row"><span>Sexe</span><b>{s.sex === 'F' ? 'Féminin' : s.sex === 'M' ? 'Masculin' : '—'}</b></div>
        </div>
        <div className="scard__qr">
          {qr ? <img src={qr} alt="QR de vérification" /> : <div className="scard__qr-empty" />}
          <div className="scard__qr-hint">Scanner pour vérifier</div>
        </div>
      </div>
      <div className="scard__foot">
        <div className="scard__auth">
          <div className="scard__auth-sign">
            {inst.stamp && <img src={inst.stamp} alt="" className="scard__stamp" />}
            {inst.directorSignature && <img src={inst.directorSignature} alt="Signature du directeur" className="scard__sig" />}
          </div>
          <div className="scard__auth-label">{inst.directorName || 'Le Directeur'}</div>
        </div>
        {inst.phone && <div className="scard__contact">☎ {inst.phone}</div>}
      </div>
    </div>
  );
}

/**
 * Cartes d'élève d'une classe à imprimer (10 par feuille A4, à découper) — photo d'identité, informations,
 * QR code de vérification signé et signature du directeur. `?student=<id>` : la carte d'un seul élève.
 */
export default function StudentCardsPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const only = params.get('student');
  const { user } = useContext(AuthContext);
  const [qrs, setQrs] = useState({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ['class-cards', id],
    queryFn: () => api.get(`/classes/${id}/cards`).then((r) => r.data),
    enabled: !!id,
  });

  const students = useMemo(() => (data?.students ?? []).filter((s) => !only || s.id === only), [data, only]);

  useEffect(() => {
    if (!students.length) return;
    let alive = true;
    (async () => {
      const out = {};
      for (const s of students) {
        out[s.id] = await QRCode.toDataURL(`${window.location.origin}/verify/carte/${s.code}`, { margin: 0, width: 220, errorCorrectionLevel: 'M' }).catch(() => null);
      }
      if (alive) setQrs(out);
    })();
    return () => { alive = false; };
  }, [students]);

  if (isLoading) return <div className="scards-loading"><Loading /></div>;
  if (isError || !data) return <div className="scards-loading"><p>Classe introuvable.</p></div>;

  const back = user?.role === 'ADMIN' ? `/admin/classes/${id}` : `/teacher/classes/${id}`;
  const missingPhotos = students.filter((s) => !s.photo).length;

  return (
    <div className="scards-screen">
      <div className="scards-toolbar no-print">
        <Link to={back} className="scards-toolbar__back">← Retour à la classe</Link>
        <span className="scards-toolbar__info">
          {students.length} carte(s) · {data.class.name} · {data.class.academicYear}
          {missingPhotos > 0 && ` · ${missingPhotos} sans photo`}
          {!data.institution.directorSignature && ' · signature du directeur non enregistrée'}
        </span>
        {!data.institution.directorSignature && user?.role === 'ADMIN' && (
          <Link to="/admin/signature-directeur" className="scards-toolbar__btn" style={{ textDecoration: 'none' }}>✍️ Ajouter la signature du directeur</Link>
        )}
        <button type="button" className="scards-toolbar__btn" onClick={() => window.print()} disabled={Object.keys(qrs).length < students.length}>
          🖨️ Imprimer les cartes
        </button>
      </div>
      <div className="scards-sheet">
        {students.map((s) => <StudentCard key={s.id} s={s} cls={data.class} inst={data.institution} qr={qrs[s.id]} />)}
        {students.length === 0 && <p className="scards-empty">Aucun élève inscrit dans cette classe pour {data.class.academicYear}.</p>}
      </div>
    </div>
  );
}
