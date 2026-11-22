import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Loading from '../../../components/common/Loading/Loading';
import { mockExamsService } from '../../../services/mockExamsService';
import { examScale } from '../../../utils/examKinds';
import { getMockExamStatistics } from '../../../utils/mockExamStatistics';
import './MockExamStatisticsPage.css';

const TYPE_LABELS = {
  BLANC: 'Examen blanc',
  CEPE: 'CEPE blanc',
  BEPC: 'BEPC blanc',
  BAC1: 'Baccalauréat — première partie',
  BAC2: 'Baccalauréat — deuxième partie',
  DEVOIR_SURVEILLE: 'Devoir surveillé',
  COMPOSITION_MENSUELLE: 'Composition mensuelle',
  COMPOSITION_ANGLAIS: "Composition d'anglais",
};

const formatPercent = (value) => (
  value == null ? '—' : `${value.toFixed(2).replace('.', ',')} %`
);
const formatScore = (value, scale) => (
  value == null ? '—' : `${value.toFixed(2).replace('.', ',')} / ${scale}`
);

function MockExamStatisticsPage() {
  const { id } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['mock-exam-palmares', id],
    queryFn: () => mockExamsService.getPalmares(id).then((response) => response.data),
  });

  if (isLoading) return <Loading fullPage />;
  if (isError || !data) {
    return <div className="mest-error">Impossible de charger les statistiques de cet examen.</div>;
  }

  const { exam, students, summary, institution } = data;
  const scale = exam.scale ?? examScale(exam.examType);
  const stats = getMockExamStatistics(students, scale);
  const reached = stats.withAverage
    ? students.filter((student) => student.average != null && Number(student.average) >= scale / 2).length
    : 0;
  const below = stats.withAverage - reached;
  const metrics = [
    { label: 'Élèves inscrits', value: stats.total },
    { label: 'Moyennes disponibles', value: stats.withAverage },
    { label: 'Moyenne générale', value: formatPercent(stats.average), accent: true },
    {
      label: 'Plus forte moyenne obtenue',
      value: formatScore(stats.highest, scale),
      detail: formatPercent(stats.highestPercentage),
      students: stats.highestStudents,
    },
    {
      label: 'Plus faible moyenne obtenue',
      value: formatScore(stats.lowest, scale),
      detail: formatPercent(stats.lowestPercentage),
      students: stats.lowestStudents,
    },
    { label: 'Taux de réussite', value: `${summary.passingRate}%`, accent: true },
  ];

  return (
    <main className="mest-page">
      <nav className="mest-toolbar no-print" aria-label="Navigation des résultats">
        <Link to={`/mock-exams/${id}/releve`} className="mest-back">← Retour au relevé</Link>
        <span className="mest-toolbar__title">Statistiques générales</span>
        <Link to={`/mock-exams/${id}/palmares`} className="mest-toolbar__link">Palmarès</Link>
        <button type="button" className="mest-print" onClick={() => window.print()}>🖨 Imprimer</button>
      </nav>

      <div className="mest-content">
        <header className="mest-heading">
          {institution?.name && <p className="mest-school">{institution.name}</p>}
          <p className="mest-eyebrow">{TYPE_LABELS[exam.examType] ?? exam.examType}</p>
          <h1>{exam.label}</h1>
          <p className="mest-subtitle">
            {exam.class?.name} · Année scolaire {exam.academicYear}
            {exam.examDate && ` · ${new Date(exam.examDate).toLocaleDateString('fr-FR')}`}
          </p>
        </header>

        <section className="mest-metrics" aria-label="Résumé général de l'examen">
          {metrics.map((metric) => (
            <article key={metric.label} className={`mest-metric${metric.accent ? ' mest-metric--accent' : ''}`}>
              <span className="mest-metric__label">{metric.label}</span>
              <strong className="mest-metric__value">{metric.value}</strong>
              {metric.detail && <span className="mest-metric__detail">{metric.detail}</span>}
              {metric.students?.length > 0 && (
                <span className="mest-metric__detail">Obtenue par {metric.students.join(', ')}</span>
              )}
            </article>
          ))}
        </section>

        <section className="mest-card">
          <div className="mest-card__heading">
            <div>
              <h2>Répartition des moyennes obtenues</h2>
              <p>Chaque moyenne exacte, le pourcentage correspondant, l&apos;effectif et les élèves concernés.</p>
            </div>
            <span className="mest-total">{stats.withAverage} moyenne{stats.withAverage !== 1 ? 's' : ''}</span>
          </div>

          {stats.withAverage === 0 ? (
            <p className="mest-empty">Aucune moyenne disponible pour cette session.</p>
          ) : (
            <div className="mest-table-wrap">
              <table className="mest-table">
                <thead>
                  <tr>
                    <th>Moyenne obtenue</th>
                    <th>Équivalent en %</th>
                    <th>Effectif</th>
                    <th>Part des élèves</th>
                    <th>Obtenue par</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.distribution.map((result) => (
                    <tr key={result.score.toFixed(2)}>
                      <td><strong>{formatScore(result.score, scale)}</strong></td>
                      <td>{formatPercent(result.percentage)}</td>
                      <td>{result.count}</td>
                      <td>{formatPercent(result.share)}</td>
                      <td>{result.students.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mest-outcomes" aria-label="Résultats de l'examen">
          <article className="mest-outcome mest-outcome--pass">
            <span>Moyenne atteinte (≥ 50 %)</span>
            <strong>{reached}</strong>
          </article>
          <article className="mest-outcome mest-outcome--fail">
            <span>Sous la moyenne (&lt; 50 %)</span>
            <strong>{below}</strong>
          </article>
          <article className="mest-outcome">
            <span>Sans moyenne</span>
            <strong>{stats.total - stats.withAverage}</strong>
          </article>
        </section>
      </div>
    </main>
  );
}

export default MockExamStatisticsPage;
