import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Loading from '../../../components/common/Loading/Loading';
import { reportsService } from '../../../services/reportsService';
import { getMockExamStatistics } from '../../../utils/mockExamStatistics';
import { isPrimaryLevel } from '../../../utils/examKinds';
import './ReportCardStatisticsPage.css';

const formatNumber = (value) => (
  value == null ? '—' : Number(value).toFixed(2).replace('.', ',')
);
const formatPercent = (value) => (value == null ? '—' : `${formatNumber(value)} %`);
const formatScore = (value, scale) => (value == null ? '—' : `${formatNumber(value)} / ${scale}`);

function ReportCardStatisticsPage() {
  const { id } = useParams();
  const {
    data: report,
    isLoading: isReportLoading,
    isError: isReportError,
  } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsService.get(id).then((response) => response.data),
    enabled: !!id,
  });
  const {
    data: reports = [],
    isLoading: areReportsLoading,
    isError: areReportsError,
  } = useQuery({
    queryKey: ['report-card-statistics', report?.classId, report?.academicYear, report?.termNumber, report?.termType, report?.termName],
    queryFn: () => reportsService.list({
      classId: report.classId,
      academicYear: report.academicYear,
      termNumber: report.termNumber,
    }).then((response) => response.data),
    enabled: !!report?.classId && !!report?.academicYear && !!report?.termNumber,
  });

  if (isReportLoading || (report && areReportsLoading)) return <Loading fullPage />;
  if (isReportError || !report || areReportsError) {
    return <div className="rcstats-error">Impossible de charger les statistiques de cette classe.</div>;
  }

  const samePeriodReports = reports.filter((item) => (
    item.classId === report.classId
    && item.academicYear === report.academicYear
    && item.termNumber === report.termNumber
    && item.termType === report.termType
    && item.termName === report.termName
  ));
  const scale = isPrimaryLevel(report.class?.level) ? 10 : 20;
  const stats = getMockExamStatistics(samePeriodReports.map((item) => ({
    average: item.overallAverage,
    studentName: item.student?.user?.name ?? item.student?.admissionNumber ?? 'Élève sans nom',
  })), scale);
  const period = report.termName ?? (
    report.termType === 'SEMESTRE' ? `Semestre ${report.termNumber}`
      : report.termType === 'CUSTOM' ? 'Période personnalisée'
        : `Trimestre ${report.termNumber}`
  );

  return (
    <main className="rcstats-page">
      <nav className="rcstats-toolbar no-print" aria-label="Navigation du bulletin">
        <Link to={`/reports/${id}/print`} className="rcstats-link">← Retour au bulletin</Link>
        <span className="rcstats-toolbar__title">Statistiques de la classe</span>
        <button type="button" className="rcstats-print" onClick={() => window.print()}>🖨 Imprimer</button>
      </nav>

      <div className="rcstats-content">
        <header className="rcstats-heading">
          <p className="rcstats-eyebrow">Bulletins scolaires</p>
          <h1>Statistiques des moyennes</h1>
          <p>{report.class?.name} · {report.class?.level} · {period} · Année scolaire {report.academicYear}</p>
          <span>Barème : /{scale}</span>
        </header>

        <section className="rcstats-metrics" aria-label="Résumé des moyennes de la classe">
          <article className="rcstats-metric">
            <span>Élèves de la classe</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="rcstats-metric">
            <span>Moyennes disponibles</span>
            <strong>{stats.withAverage}</strong>
          </article>
          <article className="rcstats-metric rcstats-metric--accent">
            <span>Moyenne générale de la classe</span>
            <strong>{formatPercent(stats.average)}</strong>
          </article>
          <article className="rcstats-metric">
            <span>Plus forte moyenne</span>
            <strong>{formatScore(stats.highest, scale)}</strong>
            <small>{stats.highestStudents.join(', ') || '—'}{stats.highestPercentage != null ? ` · ${formatPercent(stats.highestPercentage)}` : ''}</small>
          </article>
          <article className="rcstats-metric">
            <span>Plus faible moyenne</span>
            <strong>{formatScore(stats.lowest, scale)}</strong>
            <small>{stats.lowestStudents.join(', ') || '—'}{stats.lowestPercentage != null ? ` · ${formatPercent(stats.lowestPercentage)}` : ''}</small>
          </article>
          <article className="rcstats-metric">
            <span>Sans moyenne</span>
            <strong>{stats.total - stats.withAverage}</strong>
          </article>
        </section>

        <section className="rcstats-card">
          <header className="rcstats-card__heading">
            <div>
              <h2>Moyennes exactes obtenues par les élèves</h2>
              <p>Pourcentage calculé sur le barème de la classe, effectif et noms des élèves concernés.</p>
            </div>
            <span>{stats.withAverage} élève{stats.withAverage !== 1 ? 's' : ''} avec moyenne</span>
          </header>

          {stats.distribution.length === 0 ? (
            <p className="rcstats-empty">Aucune moyenne disponible pour cette période.</p>
          ) : (
            <div className="rcstats-table-wrap">
              <table className="rcstats-table">
                <thead>
                  <tr>
                    <th>Moyenne obtenue</th>
                    <th>Équivalent en %</th>
                    <th>Effectif</th>
                    <th>Part de la classe</th>
                    <th>Obtenue par</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.distribution.map((result) => (
                    <tr key={result.score.toFixed(2)}>
                      <td><strong>{formatNumber(result.score)} / {scale}</strong></td>
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
      </div>
    </main>
  );
}

export default ReportCardStatisticsPage;
