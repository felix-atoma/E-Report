import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsService } from '../../../services/reportsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Badge from '../../../components/common/Badge/Badge';
import PdfViewer from '../../../components/common/PdfViewer/PdfViewer';
import Loading from '../../../components/common/Loading/Loading';
import EmptyState from '../../../components/common/EmptyState/EmptyState';
import './MyReportCardsPage.css';

const MENTION_VARIANT = (avg) => {
  if (avg >= 16) return 'success';
  if (avg >= 12) return 'info';
  if (avg >= 10) return 'warning';
  return 'danger';
};

function ReportItem({ report }) {
  const [expanded, setExpanded] = useState(false);
  const termLabel = report.termName ?? `Trimestre ${report.termNumber}`;
  const avg       = report.overallAverage;

  return (
    <Card className="student-report-item">
      <div
        className="student-report-item__header"
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div>
          <div className="student-report-item__term">{termLabel}</div>
          <div className="student-report-item__year">{report.academicYear}</div>
        </div>
        <div className="student-report-item__right">
          {avg != null && (
            <Badge variant={MENTION_VARIANT(avg)}>
              {String(avg).replace('.', ',')} / 20
            </Badge>
          )}
          <span className="student-report-item__chevron">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="student-report-item__body">
          {report.grades && report.grades.length > 0 && (
            <table className="student-grades-table">
              <thead>
                <tr>
                  <th>Matière</th>
                  <th>Coef.</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {report.grades.map((g) => (
                  <tr key={g.subjectId} className={g.score < 10 ? 'student-grades-table__row--fail' : ''}>
                    <td>{g.subject?.name ?? g.subjectId}</td>
                    <td>{g.coefficient}</td>
                    <td className="student-grades-table__score">
                      {String(g.score).replace('.', ',')}
                    </td>
                  </tr>
                ))}
              </tbody>
              {avg != null && (
                <tfoot>
                  <tr className="student-grades-table__avg-row">
                    <td colSpan={2}>Moyenne générale</td>
                    <td className="student-grades-table__score">
                      <strong>{String(avg).replace('.', ',')} / 20</strong>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}

          {report.pdfUrl && (
            <div className="student-report-item__pdf-actions">
              <a
                href={report.pdfUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="student-report-item__btn student-report-item__btn--download"
              >
                Télécharger PDF ↓
              </a>
              <a
                href={report.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="student-report-item__btn student-report-item__btn--print"
                onClick={(e) => { e.preventDefault(); const w = window.open(report.pdfUrl, '_blank'); w && w.focus(); }}
              >
                Imprimer ⎙
              </a>
            </div>
          )}

          {report.teacherComment && (
            <div className="student-report-item__comment">
              <span className="student-report-item__comment-label">Appréciation :</span>
              <p>"{report.teacherComment}"</p>
            </div>
          )}

          {report.pdfUrl && (
            <PdfViewer url={report.pdfUrl} title={`Bulletin ${termLabel}`} />
          )}
        </div>
      )}
    </Card>
  );
}

function MyReportCardsPage() {
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['student-reports'],
    queryFn: () => reportsService.list().then((r) => r.data),
  });

  const published = reports.filter((r) => r.status === 'PUBLISHED');

  if (isLoading) return <AppShell title="Mes bulletins"><Loading /></AppShell>;

  return (
    <AppShell title="Mes bulletins">
      <PageHeader
        title="Mes bulletins de notes"
        subtitle={`${published.length} bulletin${published.length !== 1 ? 's' : ''} disponible${published.length !== 1 ? 's' : ''}`}
      />

      {published.length === 0 ? (
        <EmptyState
          icon="📋"
          message="Aucun bulletin disponible"
          description="Vos bulletins apparaîtront ici une fois publiés par votre enseignant."
        />
      ) : (
        <div className="student-reports__list">
          {published.map((r) => <ReportItem key={r.id} report={r} />)}
        </div>
      )}
    </AppShell>
  );
}

export default MyReportCardsPage;
