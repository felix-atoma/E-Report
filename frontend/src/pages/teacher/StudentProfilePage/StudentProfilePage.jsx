import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { studentsService } from '../../../services/studentsService';
import { reportsService } from '../../../services/reportsService';
import { feesService } from '../../../services/feesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Avatar from '../../../components/common/Avatar/Avatar';
import Badge from '../../../components/common/Badge/Badge';
import Loading from '../../../components/common/Loading/Loading';
import './StudentProfilePage.css';

const STATUS_VARIANT = { PAID: 'success', PARTIAL: 'warning', UNPAID: 'danger', EXEMPT: 'info' };
const REPORT_VARIANT = { DRAFT: 'default', REVIEW: 'warning', PUBLISHED: 'success' };

function StudentProfilePage() {
  const { t } = useTranslation();
  const { id } = useParams();

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsService.get(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['reports', { studentId: id }],
    queryFn: () => reportsService.list({ studentId: id }).then((r) => r.data ?? []),
    enabled: !!id,
  });

  const { data: feeSummary } = useQuery({
    queryKey: ['fee-summary', id],
    queryFn: () => feesService.getStudentSummary(id).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) return <AppShell title={t('studentProfile.title')}><Loading /></AppShell>;

  const fullName = student
    ? (student.user?.name ?? student.admissionNumber ?? '—')
    : '—';

  const dob = student?.dateOfBirth
    ? new Date(student.dateOfBirth).toLocaleDateString('fr-FR')
    : '—';

  const payStatus = feeSummary?.status ?? 'UNPAID';

  const published = reports.filter((r) => r.status === 'PUBLISHED');
  const avgAll = published.length
    ? (published.reduce((s, r) => s + (r.average ?? 0), 0) / published.length).toFixed(2)
    : null;

  return (
    <AppShell title={t('studentProfile.title')}>
      <PageHeader
        title={fullName}
        subtitle={`${t('studentProfile.matricule')} ${student?.admissionNumber ?? '—'}`}
        actions={
          <Link
            to={`/teacher/reports/new?studentId=${id}`}
            className="sp-btn-primary"
          >
            {t('studentProfile.newReport')}
          </Link>
        }
      />

      <div className="sp-grid">
        {/* Identity card */}
        <Card className="sp-identity">
          <Avatar name={fullName} size="xl" />
          <div className="sp-identity__info">
            <h2 className="sp-identity__name">{fullName}</h2>
            <p className="sp-identity__sub">{student?.admissionNumber ?? '—'}</p>
            <Badge variant={STATUS_VARIANT[payStatus] ?? 'default'}>
              {t('studentProfile.fee.' + payStatus)}
            </Badge>
          </div>
        </Card>

        {/* Details */}
        <Card className="sp-section">
          <h3 className="sp-section__title">{t('studentProfile.sections.info')}</h3>
          <dl className="sp-details">
            <div className="sp-details__row">
              <dt>{t('studentProfile.identity.dob')}</dt><dd>{dob}</dd>
            </div>
            <div className="sp-details__row">
              <dt>{t('studentProfile.identity.gender')}</dt>
              <dd>{student?.gender === 'M' ? t('studentProfile.sex.M') : student?.gender === 'F' ? t('studentProfile.sex.F') : '—'}</dd>
            </div>
            <div className="sp-details__row">
              <dt>{t('studentProfile.identity.currentClass')}</dt>
              <dd>{student?.currentClass?.name ?? '—'}</dd>
            </div>
            <div className="sp-details__row">
              <dt>{t('studentProfile.identity.parent')}</dt>
              <dd>{student?.parent?.name ?? '—'}</dd>
            </div>
            <div className="sp-details__row">
              <dt>{t('studentProfile.identity.contact')}</dt>
              <dd>{student?.parent?.whatsappNumber ?? student?.parent?.email ?? '—'}</dd>
            </div>
          </dl>
        </Card>

        {/* Fee summary */}
        {feeSummary && (
          <Card className="sp-section">
            <h3 className="sp-section__title">{t('studentProfile.sections.finance')}</h3>
            <dl className="sp-details">
              <div className="sp-details__row">
                <dt>{t('studentProfile.finance.status')}</dt>
                <dd><Badge variant={STATUS_VARIANT[payStatus]}>{t(`studentProfile.fee.${payStatus}`)}</Badge></dd>
              </div>
              <div className="sp-details__row">
                <dt>{t('studentProfile.finance.totalDue')}</dt>
                <dd>{(feeSummary.totalDue ?? 0).toLocaleString('fr-FR')} XOF</dd>
              </div>
              <div className="sp-details__row">
                <dt>{t('studentProfile.finance.totalPaid')}</dt>
                <dd>{(feeSummary.totalPaid ?? 0).toLocaleString('fr-FR')} XOF</dd>
              </div>
              <div className="sp-details__row">
                <dt>{t('studentProfile.finance.balance')}</dt>
                <dd className={feeSummary.balance > 0 ? 'sp-text--danger' : ''}>
                  {(feeSummary.balance ?? 0).toLocaleString('fr-FR')} XOF
                </dd>
              </div>
            </dl>
          </Card>
        )}

        {/* Performance summary */}
        <Card className="sp-section">
          <h3 className="sp-section__title">{t('studentProfile.sections.results')}</h3>
          {published.length === 0 ? (
            <p className="sp-empty">{t('studentProfile.academic.noPublished')}</p>
          ) : (
            <>
              <div className="sp-avg-hero">
                <span className="sp-avg-hero__value">{avgAll}</span>
                <span className="sp-avg-hero__label">{t('studentProfile.academic.overallLabel')}</span>
              </div>
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>{t('studentProfile.academic.columns.term')}</th>
                    <th>{t('studentProfile.academic.columns.year')}</th>
                    <th>{t('studentProfile.academic.columns.avg')}</th>
                    <th>{t('studentProfile.academic.columns.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {published.map((r) => (
                    <tr key={r.id}>
                      <td>{r.termName ?? `T${r.termNumber}`}</td>
                      <td>{r.academicYear}</td>
                      <td><strong>{r.average != null ? Number(r.average).toFixed(2) : '—'}</strong></td>
                      <td>
                        <Badge variant={REPORT_VARIANT[r.status] ?? 'default'}>
                          {t(`studentProfile.academic.reportStatus.${r.status}`, r.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card>

        {/* All reports */}
        <Card className="sp-section sp-section--full">
          <h3 className="sp-section__title">{t('studentProfile.sections.allReports')}</h3>
          {reports.length === 0 ? (
            <p className="sp-empty">{t('studentProfile.academic.noReports')}</p>
          ) : (
            <table className="sp-table">
              <thead>
                <tr>
                  <th>{t('studentProfile.academic.columns.term')}</th>
                  <th>{t('studentProfile.academic.columns.year')}</th>
                  <th>{t('studentProfile.academic.columns.avg')}</th>
                  <th>{t('studentProfile.academic.columns.status')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>{r.termName ?? `T${r.termNumber}`}</td>
                    <td>{r.academicYear}</td>
                    <td>{r.average != null ? Number(r.average).toFixed(2) : '—'}</td>
                    <td>
                      <Badge variant={REPORT_VARIANT[r.status] ?? 'default'}>
                        {t(`studentProfile.academic.reportStatus.${r.status}`, r.status)}
                      </Badge>
                    </td>
                    <td>
                      <Link to={`/teacher/reports/${r.id}`} className="sp-link">
                        {t('studentProfile.open')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

export default StudentProfilePage;
