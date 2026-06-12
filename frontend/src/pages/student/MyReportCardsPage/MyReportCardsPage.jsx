import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { reportsService } from '../../../services/reportsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Badge from '../../../components/common/Badge/Badge';
import Loading from '../../../components/common/Loading/Loading';
import EmptyState from '../../../components/common/EmptyState/EmptyState';
import './MyReportCardsPage.css';

async function downloadPdf(reportId, termNumber) {
  const res = await api.get(`/reports/${reportId}/pdf-download`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bulletin-T${termNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

const MENTION_VARIANT = (avg) => {
  if (avg >= 16) return 'success';
  if (avg >= 12) return 'info';
  if (avg >= 10) return 'warning';
  return 'danger';
};

function ReportItem({ report }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
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
                  <th>{t('gradeTable.subject')}</th>
                  <th>{t('gradeTable.coef')}</th>
                  <th>{t('gradeTable.score')}</th>
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
                    <td colSpan={2}>{t('myReports.overallAvg')}</td>
                    <td className="student-grades-table__score">
                      <strong>{String(avg).replace('.', ',')} / 20</strong>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}

          <div className="student-report-item__pdf-actions">
            <Link
              to={`/reports/${report.id}/print`}
              target="_blank"
              rel="noreferrer"
              className="student-report-item__btn student-report-item__btn--download"
            >
              {t('reportCards.printPdf')}
            </Link>
            <button
              className="student-report-item__btn student-report-item__btn--print"
              disabled={downloading}
              onClick={async () => {
                setDownloading(true);
                try {
                  await downloadPdf(report.id, report.termNumber);
                } catch {
                  toast.error(t('myReports.downloadError'));
                } finally {
                  setDownloading(false);
                }
              }}
            >
              {downloading ? '⏳ …' : t('myReports.download')}
            </button>
          </div>

          {report.teacherComment && (
            <div className="student-report-item__comment">
              <span className="student-report-item__comment-label">{t('myReports.appreciation')} :</span>
              <p>"{report.teacherComment}"</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function MyReportCardsPage() {
  const { t } = useTranslation();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['student-reports'],
    queryFn: () => reportsService.list().then((r) => r.data),
  });

  const published = reports.filter((r) => r.status === 'PUBLISHED');

  if (isLoading) return <AppShell title={t('myReports.title')}><Loading /></AppShell>;

  return (
    <AppShell title={t('myReports.title')}>
      <PageHeader
        title={t('myReports.title')}
        subtitle={t('myReports.subtitle', { count: published.length })}
      />

      {published.length === 0 ? (
        <EmptyState
          icon="📋"
          message={t('myReports.empty')}
          description={t('myReports.emptyDesc')}
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
