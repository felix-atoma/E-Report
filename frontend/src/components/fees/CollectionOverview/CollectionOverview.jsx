import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import './CollectionOverview.css';

const money = (v) => `${Math.round(v ?? 0).toLocaleString('fr-FR')} FCFA`;

/**
 * Suivi du recouvrement de l'année en temps réel : attendu, encaissé, reste à recouvrer, taux,
 * situation par classe et élèves les plus en retard. Données : GET /fees/collection-overview.
 */
export default function CollectionOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['collection-overview'],
    queryFn: () => api.get('/fees/collection-overview').then((r) => r.data),
    refetchInterval: 60_000,
  });

  if (isLoading) return <div className="coll coll--loading">Calcul du recouvrement…</div>;
  if (!data || data.expected === 0) {
    return (
      <div className="coll coll--empty">
        Aucun frais n'est encore attribué aux élèves pour {data?.academicYear ?? 'cette année'}.
        Créez les frais puis attribuez-les aux classes pour suivre le recouvrement.
      </div>
    );
  }
  const r = data.collectionRate;
  const tone = r >= 80 ? 'good' : r >= 50 ? 'mid' : 'low';

  return (
    <section className="coll">
      <div className="coll__head">
        <h3>Recouvrement {data.academicYear}</h3>
        <span className="coll__live">● en direct</span>
      </div>

      <div className="coll__kpis">
        <div className="coll__kpi">
          <span className="coll__kpi-label">Attendu</span>
          <strong>{money(data.expected)}</strong>
        </div>
        <div className="coll__kpi coll__kpi--good">
          <span className="coll__kpi-label">Encaissé</span>
          <strong>{money(data.collected)}</strong>
        </div>
        <div className="coll__kpi coll__kpi--low">
          <span className="coll__kpi-label">Reste à recouvrer</span>
          <strong>{money(data.outstanding)}</strong>
          {data.arrears > 0 && <small>dont {money(data.arrears)} d'arriérés repris</small>}
        </div>
        <div className={`coll__kpi coll__kpi--rate coll__kpi--${tone}`}>
          <span className="coll__kpi-label">Taux de recouvrement</span>
          <strong>{r.toString().replace('.', ',')} %</strong>
          <div className="coll__bar"><span style={{ width: `${Math.min(100, r)}%` }} /></div>
          <small>{data.students.paid} à jour · {data.students.partial} partiel(s) · {data.students.unpaid} impayé(s)</small>
        </div>
      </div>

      <div className="coll__grid">
        <div className="coll__panel">
          <h4>Par classe</h4>
          <ul className="coll__classes">
            {data.byClass.map((c) => (
              <li key={c.classId}>
                <span className="coll__class-name">{c.name}</span>
                <span className="coll__mini-bar"><span style={{ width: `${Math.min(100, c.rate)}%` }} /></span>
                <span className="coll__class-rate">{c.rate.toString().replace('.', ',')} %</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="coll__panel">
          <h4>Plus gros soldes à recouvrer</h4>
          {data.topDebtors.length === 0 ? (
            <p className="coll__none">Tous les élèves sont à jour. 🎉</p>
          ) : (
            <table className="coll__table">
              <tbody>
                {data.topDebtors.map((d) => (
                  <tr key={d.studentId}>
                    <td>
                      <div className="coll__debtor">{d.name}</div>
                      <div className="coll__debtor-sub">{d.className} · {d.admissionNumber}</div>
                    </td>
                    <td className="coll__balance">{money(d.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
