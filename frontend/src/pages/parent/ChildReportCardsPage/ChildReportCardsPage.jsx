import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api';
import { studentsService } from '../../../services/studentsService';
import { reportsService } from '../../../services/reportsService';
import { feesService } from '../../../services/feesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Badge from '../../../components/common/Badge/Badge';
import PaywallNotice from '../../../components/parent/PaywallNotice/PaywallNotice';
import Loading from '../../../components/common/Loading/Loading';
import EmptyState from '../../../components/common/EmptyState/EmptyState';
import './ChildReportCardsPage.css';

const MENTION_VARIANT = (avg) => {
  if (avg >= 16) return 'success';
  if (avg >= 12) return 'info';
  if (avg >= 10) return 'warning';
  return 'danger';
};

async function downloadPdf(reportId, studentName, termNumber) {
  const res = await api.get(`/reports/${reportId}/pdf-download`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bulletin-${(studentName ?? reportId).replace(/[^a-zA-Z0-9]/g, '-')}-T${termNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportCard({ report, feeSummary }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const termLabel    = report.termName ?? `Trimestre ${report.termNumber}`;
  const isPaid       = !feeSummary || feeSummary.status === 'PAID' || feeSummary.status === 'EXEMPT';
  const isHeld       = report.deliveryStatus === 'HELD_UNPAID' || report.deliveryStatus === 'HELD_PARTIAL';
  const showPaywall  = !isPaid || isHeld;
  const avg          = report.overallAverage;

  return (
    <Card className="report-card-item">
      <div
        className="report-card-item__header"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="report-card-item__meta">
          <span className="report-card-item__term">{termLabel}</span>
          <span className="report-card-item__year">{report.academicYear}</span>
        </div>
        <div className="report-card-item__right">
          {avg != null && (
            <Badge variant={MENTION_VARIANT(avg)}>
              {String(avg).replace('.', ',')} / 20
            </Badge>
          )}
          {showPaywall ? (
            <Badge variant="warning">{t('reportCards.feesRequired')}</Badge>
          ) : (
            <Badge variant="success">{t('reportCards.available')}</Badge>
          )}
          <span className="report-card-item__chevron">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="report-card-item__body">
          {showPaywall ? (
            <PaywallNotice
              studentName={report.student?.user?.name ?? report.student?.admissionNumber ?? ''}
              termName={termLabel}
              balance={feeSummary?.balance ?? 0}
              onContact={() => window.location.href = 'tel:'}
            />
          ) : (
            <>
              <div className="report-card-item__pdf-actions">
                <Link
                  to={`/reports/${report.id}/print`}
                  target="_blank"
                  rel="noreferrer"
                  className="report-card-item__btn report-card-item__btn--download"
                >
                  {t('childReports.printBtn')}
                </Link>
                <button
                  className="report-card-item__btn report-card-item__btn--print"
                  disabled={downloading}
                  onClick={async () => {
                    setDownloading(true);
                    try {
                      await downloadPdf(
                        report.id,
                        report.student?.user?.name ?? report.student?.admissionNumber,
                        report.termNumber,
                      );
                    } finally {
                      setDownloading(false);
                    }
                  }}
                >
                  {downloading ? t('childReports.downloading') : t('childReports.downloadBtn')}
                </button>
              </div>

              {report.grades && report.grades.length > 0 && (
                <div className="report-card-item__grades">
                  <table className="report-grades-table">
                    <thead>
                      <tr>
                        <th>{t('gradeTable.subject')}</th>
                        <th>{t('gradeTable.coef')}</th>
                        <th>{t('gradeTable.score')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.grades.map((g) => (
                        <tr key={g.subjectId} className={g.score < 10 ? 'report-grades-table__row--fail' : ''}>
                          <td>{g.subject?.name ?? g.subjectId}</td>
                          <td>{g.coefficient}</td>
                          <td className="report-grades-table__score">
                            {String(g.score).replace('.', ',')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {avg != null && (
                      <tfoot>
                        <tr className="report-grades-table__avg-row">
                          <td colSpan={2}>{t('childReports.overallAvg')}</td>
                          <td className="report-grades-table__score">
                            <strong>{String(avg).replace('.', ',')} / 20</strong>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {report.teacherComment && (
                <div className="report-card-item__comment">
                  <span className="report-card-item__comment-label">{t('childReports.appreciation')}</span>
                  <p className="report-card-item__comment-text">{report.teacherComment}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function ChildReportCardsPage() {
  const { t } = useTranslation();
  const { id } = useParams();

  const { data: child, isLoading: l1 } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsService.get(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: reports = [], isLoading: l2 } = useQuery({
    queryKey: ['reports', { studentId: id }],
    queryFn: () => reportsService.list({ studentId: id }).then((r) => r.data),
    enabled: !!id,
  });

  const { data: feeSummary } = useQuery({
    queryKey: ['fee-summary', id],
    queryFn: () => feesService.getStudentSummary(id).then((r) => r.data),
    enabled: !!id,
  });

  if (l1 || l2) return <AppShell title={t('bulletins.title')}><Loading /></AppShell>;

  const published = reports.filter((r) => r.status === 'PUBLISHED');
  const childName = child ? (child.user?.name ?? child.admissionNumber ?? '—') : '—';

  return (
    <AppShell title={`${t('bulletins.title')} — ${childName}`}>
      <PageHeader
        title={childName}
        subtitle={child?.class?.name ?? ''}
      />

      {feeSummary && feeSummary.status !== 'PAID' && feeSummary.status !== 'EXEMPT' && (
        <div className={`fee-banner fee-banner--${feeSummary.status === 'PARTIAL' ? 'partial' : 'unpaid'}`}>
          <span className="fee-banner__icon">
            {feeSummary.status === 'PARTIAL' ? '🟡' : '🔴'}
          </span>
          <div>
            <div className="fee-banner__title">
              {feeSummary.status === 'PARTIAL' ? t('childReports.feesPartial') : t('childReports.feesUnpaid')}
            </div>
            <div className="fee-banner__desc">
              {t('childReports.feeBalance')} <strong>{(feeSummary.balance ?? 0).toLocaleString('fr-FR')} FCFA</strong>.{' '}
              {t('childReports.feePdfDesc')}
            </div>
          </div>
        </div>
      )}

      {published.length === 0 ? (
        <EmptyState
          icon="📋"
          message={t('childReports.noReports')}
          description={t('childReports.noReportsDesc')}
        />
      ) : (
        <div className="child-reports__list">
          {published.map((r) => (
            <ReportCard key={r.id} report={r} feeSummary={feeSummary} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

export default ChildReportCardsPage;
