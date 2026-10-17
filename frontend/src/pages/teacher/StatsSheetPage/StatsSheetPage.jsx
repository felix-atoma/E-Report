import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../../services/analyticsService';
import Loading from '../../../components/common/Loading/Loading';
import './StatsSheetPage.css';

const fmt = (v) => (v == null ? '—' : Number(v).toFixed(2).replace('.', ','));
const pct = (v) => `${String(v).replace('.', ',')} %`;

/**
 * Fiche de statistiques du titulaire (une par classe et par trimestre), à imprimer sur une page A4 :
 * répartition des moyennes, moyennes extrêmes, moyenne de la classe, progrès, 5 premiers, signatures.
 */
export default function StatsSheetPage() {
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const back = pathname.startsWith('/council') ? '/council' : pathname.startsWith('/admin') ? '/admin/statistics' : '/teacher/statistics';
  const classId = params.get('classId');
  const academicYear = params.get('academicYear');
  const termNumber = params.get('termNumber');

  const { data: s, isLoading, isError } = useQuery({
    queryKey: ['stats-sheet', classId, academicYear, termNumber],
    queryFn: () => analyticsService.statsSheet(classId, academicYear, termNumber).then((r) => r.data),
    enabled: !!(classId && academicYear && termNumber),
  });

  if (isLoading) return <div className="ssheet-loading"><Loading /></div>;
  if (isError || !s) {
    return (
      <div className="ssheet-loading">
        <p>Impossible de préparer la fiche. Choisissez une classe, un trimestre et l'année scolaire.</p>
        <Link to={back}>← Retour</Link>
      </div>
    );
  }

  const inst = s.institution ?? {};
  const progressText = s.termNumber === 1 || s.progress == null
    ? 'Sans objet au 1er trimestre'
    : `${s.progress > 0 ? '+' : ''}${fmt(s.progress)} point(s) (${fmt(s.previousClassAverage)} → ${fmt(s.classAverage)})`;

  return (
    <div className="ssheet-screen">
      <div className="ssheet-toolbar no-print">
        <Link to={back} className="ssheet-toolbar__back">← Retour</Link>
        <button type="button" className="ssheet-toolbar__print" onClick={() => window.print()}>🖨️ Imprimer la fiche</button>
      </div>

      <div className="ssheet-page">
        <header className="ssheet-head">
          {(inst.logo || inst.crest) && <img src={inst.logo || inst.crest} alt="" className="ssheet-head__logo" />}
          <div className="ssheet-head__text">
            <div className="ssheet-head__school">{inst.name}</div>
            {inst.address && <div className="ssheet-head__line">{inst.address}</div>}
            {inst.website && <div className="ssheet-head__line">{inst.website}</div>}
          </div>
        </header>

        <h1 className="ssheet-title">FICHE DE STATISTIQUES</h1>
        <div className="ssheet-meta">
          <span><b>Classe :</b> {s.className}</span>
          <span><b>Période :</b> {s.termLabel}</span>
          <span><b>Année scolaire :</b> {s.academicYear}</span>
        </div>
        <div className="ssheet-meta">
          <span><b>Professeur titulaire :</b> {s.classTeacher ?? '……………………………'}</span>
          <span><b>Effectif :</b> {s.enrolled}</span>
          <span><b>Classés :</b> {s.classified}</span>
        </div>

        <h2 className="ssheet-h2">1. Répartition des moyennes</h2>
        <table className="ssheet-table">
          <thead><tr><th>Tranche de moyenne</th><th>Nombre d'élèves</th><th>Pourcentage</th></tr></thead>
          <tbody>
            {s.bands.map((b, i) => (
              <tr key={b.label} className={i === 0 ? 'ssheet-row--pass' : ''}>
                <td className="ssheet-left">{b.label}</td><td>{b.count}</td><td>{pct(b.percentage)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td className="ssheet-left">Total</td><td>{s.classified}</td><td>{s.classified ? '100 %' : '—'}</td></tr></tfoot>
        </table>

        <h2 className="ssheet-h2">2. Moyennes</h2>
        <table className="ssheet-table">
          <thead><tr><th></th><th>Moyenne</th><th>Obtenue par</th></tr></thead>
          <tbody>
            <tr><td className="ssheet-left">Moyenne la plus forte</td><td>{fmt(s.highest?.value)}</td><td className="ssheet-left">{s.highest?.names.join(', ') ?? '—'}</td></tr>
            <tr><td className="ssheet-left">Moyenne la plus faible</td><td>{fmt(s.lowest?.value)}</td><td className="ssheet-left">{s.lowest?.names.join(', ') ?? '—'}</td></tr>
            <tr className="ssheet-row--pass"><td className="ssheet-left">Moyenne de la classe</td><td>{fmt(s.classAverage)}</td><td className="ssheet-left">{!s.atClassAverage ? '—'
              : s.atClassAverage.exact ? s.atClassAverage.names.join(', ')
              : `Aucun élève exactement — le plus proche : ${s.atClassAverage.names.join(', ')} (${fmt(s.atClassAverage.value)})`}</td></tr>
            <tr><td className="ssheet-left">Progrès de la classe</td><td colSpan={2} className="ssheet-left">{progressText}</td></tr>
          </tbody>
        </table>

        <h2 className="ssheet-h2">3. Les cinq premiers</h2>
        <table className="ssheet-table">
          <thead><tr><th>Rang</th><th>Nom et prénoms</th><th>Moyenne</th><th>Appréciation</th></tr></thead>
          <tbody>
            {s.top5.length ? s.top5.map((t, i) => (
              <tr key={`${t.name}-${i}`}><td>{t.rank === 1 ? '1er' : `${t.rank}e`}</td><td className="ssheet-left">{t.name}</td><td>{fmt(t.average)}</td><td>{t.appreciation}</td></tr>
            )) : <tr><td colSpan={4}>Aucune moyenne enregistrée pour ce trimestre.</td></tr>}
          </tbody>
        </table>

        <div className="ssheet-signs">
          <div className="ssheet-sign">
            <div className="ssheet-sign__title">Le Professeur titulaire</div>
            <div className="ssheet-sign__name">{s.classTeacher ?? ''}</div>
          </div>
          <div className="ssheet-sign">
            <div className="ssheet-sign__title">Le Chef d'établissement</div>
            <div className="ssheet-sign__hint">Signature et cachet</div>
          </div>
        </div>
        <div className="ssheet-foot">Fait le ____ / ____ / ________ · NovaBulletin</div>
      </div>
    </div>
  );
}
