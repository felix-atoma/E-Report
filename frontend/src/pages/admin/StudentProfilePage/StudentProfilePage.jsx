import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useInstitution } from '../../../context/InstitutionContext';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { studentsService } from '../../../services/studentsService';
import { feesService } from '../../../services/feesService';
import { disciplinaryService } from '../../../services/disciplinaryService';
import { transfersService } from '../../../services/transfersService';
import { alumniService } from '../../../services/alumniService';
import { nationalExamResultsService } from '../../../services/nationalExamResultsService';
import { libraryService } from '../../../services/libraryService';
import { healthRecordsService } from '../../../services/healthRecordsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Avatar from '../../../components/common/Avatar/Avatar';
import Badge from '../../../components/common/Badge/Badge';
import Loading from '../../../components/common/Loading/Loading';
import AttendanceInput from '../../../components/reports/AttendanceInput/AttendanceInput';
import './StudentProfilePage.css';

const FEE_VARIANT      = { PAID: 'success', PARTIAL: 'warning', UNPAID: 'danger', EXEMPT: 'info' };
const CONDUCT_VARIANT  = { TRES_BIEN: 'success', BIEN: 'info', PASSABLE: 'warning', MEDIOCRE: 'danger' };
const REPORT_VARIANT   = { DRAFT: 'default', REVIEW: 'warning', PUBLISHED: 'success' };

const DISC_TYPE_BG = {
  WARNING:      { bg: '#ffedd5', color: '#c2410c' },
  SUSPENSION:   { bg: '#fee2e2', color: '#b91c1c' },
  EXCLUSION:    { bg: '#fde8e8', color: '#7f1d1d' },
  NOTE:         { bg: '#dbeafe', color: '#1d4ed8' },
  COMMENDATION: { bg: '#dcfce7', color: '#15803d' },
  OTHER:        { bg: '#f3f4f6', color: '#4b5563' },
};

const EXAM_RESULT_COLORS = {
  ADMIS:   { color: '#15803d', bg: '#dcfce7' },
  AJOURNE: { color: '#b45309', bg: '#fef3c7' },
  ABSENT:  { color: '#6b7280', bg: '#f3f4f6' },
  ELIMINE: { color: '#b91c1c', bg: '#fee2e2' },
};

const HEALTH_BADGE_COLORS = {
  CONSULTATION: { color: '#1d4ed8', bg: '#dbeafe' },
  ACCIDENT:     { color: '#b91c1c', bg: '#fee2e2' },
  VACCINATION:  { color: '#15803d', bg: '#dcfce7' },
  DRESSING:     { color: '#a16207', bg: '#fef3c7' },
  EVACUATION:   { color: '#c2410c', bg: '#ffedd5' },
  OTHER:        { color: '#6b7280', bg: '#f3f4f6' },
};

function KpiCard({ icon, label, value, sub, colorClass }) {
  return (
    <Card className="asp-kpi">
      <span className={`asp-kpi__icon ${colorClass ?? ''}`}>{icon}</span>
      <div className="asp-kpi__body">
        <span className="asp-kpi__value">{value ?? '—'}</span>
        <span className="asp-kpi__label">{label}</span>
        {sub && <span className="asp-kpi__sub">{sub}</span>}
      </div>
    </Card>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="asp-detail-row">
      <dt className="asp-detail-row__label">{label}</dt>
      <dd className="asp-detail-row__value">{children ?? '—'}</dd>
    </div>
  );
}

function AdminStudentProfilePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { institution } = useInstitution();

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsService.get(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: feeSummary } = useQuery({
    queryKey: ['fee-summary', id],
    queryFn: () => feesService.getStudentSummary(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: disciplinaryRecords = [] } = useQuery({
    queryKey: ['disciplinary-student', id],
    queryFn: () => disciplinaryService.listByStudent(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ['transfers-student', id],
    queryFn: () => transfersService.list({ studentId: id }).then((r) => r.data),
    enabled: !!id,
  });

  const { data: alumniRecord } = useQuery({
    queryKey: ['alumni-student', id],
    queryFn: () => alumniService.findByStudent(id).then((r) => r.data).catch(() => null),
    enabled: !!id,
  });

  const { data: nationalExamResults = [] } = useQuery({
    queryKey: ['national-exams-student', id],
    queryFn: () => nationalExamResultsService.listByStudent(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: libraryLoans = [] } = useQuery({
    queryKey: ['library-loans-student', id],
    queryFn: () => libraryService.listByStudent(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: healthRecords = [] } = useQuery({
    queryKey: ['health-records-student', id],
    queryFn: () => healthRecordsService.listByStudent(id).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) return <AppShell title={t('studentProfile.title')}><Loading /></AppShell>;

  const name = student?.user?.name ?? student?.admissionNumber ?? '—';
  const reportCards = student?.reportCards ?? [];
  const published   = reportCards.filter((r) => r.status === 'PUBLISHED');

  const avgAll = published.length
    ? published.reduce((s, r) => s + Number(r.overallAverage ?? 0), 0) / published.length
    : null;

  const bestAvg = published.length
    ? Math.max(...published.map((r) => Number(r.overallAverage ?? 0)))
    : null;

  const avgRank = published.length
    ? Math.round(
        published.filter((r) => r.classRank).reduce((s, r) => s + r.classRank, 0)
        / (published.filter((r) => r.classRank).length || 1)
      )
    : null;

  const honorCount = published.filter((r) => r.honorCouncil).length;

  const withAtt      = published.filter((r) => r.attendanceDays != null);
  const totalJours   = withAtt.reduce((s, r) => s + (r.attendanceDays ?? 0), 0);
  const totalPresent = withAtt.reduce((s, r) => s + (r.attendancePresent ?? 0), 0);
  const totalAbsences = withAtt.reduce((s, r) => s + (r.attendanceAbsent ?? Math.max(0, (r.attendanceDays ?? 0) - (r.attendancePresent ?? 0))), 0);
  const totalRetards  = withAtt.reduce((s, r) => s + (r.attendanceLate ?? 0), 0);
  const tauxPresence  = totalJours > 0 ? Math.round((totalPresent / totalJours) * 100) : null;

  const totalAvert = published.reduce((s, r) => s + (r.warnings ?? 0), 0);
  const totalFel   = published.reduce((s, r) => s + (r.commendations ?? 0), 0);

  const currentClass = student?.classes?.[0]?.class;
  const dob = student?.dateOfBirth
    ? new Date(student.dateOfBirth).toLocaleDateString('fr-FR')
    : '—';
  const enrollment = student?.enrollmentDate
    ? new Date(student.enrollmentDate).toLocaleDateString('fr-FR')
    : '—';

  const payStatus = feeSummary?.status ?? 'UNPAID';

  async function downloadCertificate(type) {
    const labels = { enrollment: 'attestation-inscription', conduct: 'certificat-bonne-conduite' };
    try {
      const res = await studentsService.certificate(id, type);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${labels[type]}-${student?.admissionNumber ?? id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('studentProfile.certError'));
    }
  }

  return (
    <AppShell title={t('studentProfile.title')}>
      <PageHeader
        title={name}
        subtitle={`${t('studentProfile.matricule')} ${student?.admissionNumber ?? '—'}`}
        actions={
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button
              className="asp-back-btn"
              onClick={() => downloadCertificate('enrollment')}
              style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '.4rem .875rem', fontWeight: 600, cursor: 'pointer', fontSize: '.82rem' }}
            >
              {t('studentProfile.attestation')}
            </button>
            <button
              className="asp-back-btn"
              onClick={() => downloadCertificate('conduct')}
              style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '.4rem .875rem', fontWeight: 600, cursor: 'pointer', fontSize: '.82rem' }}
            >
              {t('studentProfile.conduct')}
            </button>
            <button className="asp-back-btn" onClick={() => navigate('/admin/students')}>
              {t('studentProfile.back')}
            </button>
          </div>
        }
      />

      <div className="asp-layout">

        {/* Identity */}
        <Card className="asp-identity">
          <Avatar name={name} src={student?.user?.profileImage} size="xl" />
          <div className="asp-identity__main">
            <h2 className="asp-identity__name">{name}</h2>
            <p className="asp-identity__matricule">{student?.admissionNumber ?? '—'}</p>
            <div className="asp-identity__badges">
              {student?.sex && (
                <Badge variant="info">{t(`studentProfile.sex.${student.sex}`)}</Badge>
              )}
              {currentClass && (
                <Badge variant="default">{currentClass.name}</Badge>
              )}
              {feeSummary && (
                <Badge variant={FEE_VARIANT[payStatus]}>{t(`studentProfile.fee.${payStatus}`)}</Badge>
              )}
            </div>
          </div>
          <dl className="asp-identity__details">
            <DetailRow label={t('studentProfile.identity.dob')}>{dob}</DetailRow>
            <DetailRow label={t('studentProfile.identity.enrollment')}>{enrollment}</DetailRow>
            <DetailRow label={t('studentProfile.identity.currentClass')}>
              {currentClass ? `${currentClass.name} (${currentClass.academicYear})` : '—'}
            </DetailRow>
            <DetailRow label={t('studentProfile.identity.parent')}>{student?.parent?.name ?? '—'}</DetailRow>
            <DetailRow label={t('studentProfile.identity.contact')}>
              {student?.parent?.whatsappNumber ?? student?.parent?.email ?? '—'}
            </DetailRow>
          </dl>
        </Card>

        {/* KPIs */}
        <div className="asp-kpis">
          <KpiCard
            icon="📊"
            label={t('studentProfile.kpi.overall')}
            value={avgAll != null ? avgAll.toFixed(2).replace('.', ',') : '—'}
            sub={t('studentProfile.kpi.overallSub')}
            colorClass="asp-kpi__icon--blue"
          />
          <KpiCard
            icon="🏅"
            label={t('studentProfile.kpi.best')}
            value={bestAvg != null ? bestAvg.toFixed(2).replace('.', ',') : '—'}
            sub={t('studentProfile.kpi.bestSub')}
            colorClass="asp-kpi__icon--gold"
          />
          <KpiCard
            icon="📈"
            label={t('studentProfile.kpi.rank')}
            value={avgRank ? `${avgRank}e` : '—'}
            sub={t('studentProfile.kpi.rankSub')}
            colorClass="asp-kpi__icon--purple"
          />
          <KpiCard
            icon="⭐"
            label={t('studentProfile.kpi.honor')}
            value={honorCount}
            sub={`${honorCount} / ${published.length}`}
            colorClass="asp-kpi__icon--star"
          />
        </div>

        {/* Attendance */}
        <Card className="asp-section">
          <h3 className="asp-section__title">{t('studentProfile.sections.attendance')}</h3>
          {withAtt.length === 0 ? (
            <p className="asp-empty">{t('studentProfile.attendance.noData')}</p>
          ) : (
            <>
              <div className="asp-attend-kpis">
                <div className="asp-attend-kpi asp-attend-kpi--absent">
                  <span className="asp-attend-kpi__num">{totalAbsences}</span>
                  <span className="asp-attend-kpi__lbl">{t('studentProfile.attendance.absences')}</span>
                </div>
                <div className="asp-attend-kpi asp-attend-kpi--late">
                  <span className="asp-attend-kpi__num">{totalRetards}</span>
                  <span className="asp-attend-kpi__lbl">{t('studentProfile.attendance.delays')}</span>
                </div>
                <div className="asp-attend-kpi asp-attend-kpi--present">
                  <span className="asp-attend-kpi__num">{tauxPresence != null ? `${tauxPresence}%` : '—'}</span>
                  <span className="asp-attend-kpi__lbl">{t('studentProfile.attendance.presence')}</span>
                </div>
                <div className="asp-attend-kpi asp-attend-kpi--total">
                  <span className="asp-attend-kpi__num">{totalJours}</span>
                  <span className="asp-attend-kpi__lbl">{t('studentProfile.attendance.days')}</span>
                </div>
              </div>
              {tauxPresence != null && (
                <div className="asp-attend-bar-wrap" title={`${tauxPresence}%`}>
                  <div className="asp-attend-bar" style={{ width: `${tauxPresence}%` }} />
                </div>
              )}
            </>
          )}
        </Card>

        {/* Daily attendance */}
        <Card className="asp-section">
          <h3 className="asp-section__title">{t('studentProfile.sections.dailyAttendance')}</h3>
          <AttendanceInput studentId={student.id} />
        </Card>

        {/* Discipline & Conduct */}
        <Card className="asp-section">
          <h3 className="asp-section__title">{t('studentProfile.sections.discipline')}</h3>
          <div className="asp-discipline-kpis">
            <div className="asp-disc-kpi asp-disc-kpi--warn">
              <span className="asp-disc-kpi__num">{totalAvert}</span>
              <span className="asp-disc-kpi__lbl">{t('studentProfile.discipline.warnings', { count: totalAvert })}</span>
            </div>
            <div className="asp-disc-kpi asp-disc-kpi--fel">
              <span className="asp-disc-kpi__num">{totalFel}</span>
              <span className="asp-disc-kpi__lbl">{t('studentProfile.discipline.commendations', { count: totalFel })}</span>
            </div>
            <div className="asp-disc-kpi asp-disc-kpi--honor">
              <span className="asp-disc-kpi__num">{honorCount}</span>
              <span className="asp-disc-kpi__lbl">{t('studentProfile.discipline.honor')}</span>
            </div>
          </div>

          {published.length > 0 && (
            <div className="asp-conduct-list">
              <p className="asp-conduct-list__label">{t('studentProfile.discipline.conductByTerm')}</p>
              {published.map((r) => (
                <div key={r.id} className="asp-conduct-row">
                  <span className="asp-conduct-row__period">
                    {r.termName ?? `T${r.termNumber}`} {r.academicYear}
                  </span>
                  {r.conductRating ? (
                    <Badge variant={CONDUCT_VARIANT[r.conductRating] ?? 'default'}>
                      {t(`studentProfile.discipline.conduct.${r.conductRating}`, r.conductRating)}
                    </Badge>
                  ) : (
                    <span className="asp-empty-inline">—</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Financial status */}
        {feeSummary && (
          <Card className="asp-section">
            <h3 className="asp-section__title">{t('studentProfile.sections.finance')}</h3>
            <dl className="asp-details">
              <DetailRow label={t('studentProfile.finance.status')}>
                <Badge variant={FEE_VARIANT[payStatus]}>{t(`studentProfile.fee.${payStatus}`)}</Badge>
              </DetailRow>
              <DetailRow label={t('studentProfile.finance.totalDue')}>
                {(feeSummary.totalDue ?? 0).toLocaleString('fr-FR')} XOF
              </DetailRow>
              <DetailRow label={t('studentProfile.finance.totalPaid')}>
                {(feeSummary.totalPaid ?? 0).toLocaleString('fr-FR')} XOF
              </DetailRow>
              <DetailRow label={t('studentProfile.finance.balance')}>
                <span className={feeSummary.balance > 0 ? 'asp-text--danger' : ''}>
                  {(feeSummary.balance ?? 0).toLocaleString('fr-FR')} XOF
                </span>
              </DetailRow>
            </dl>
          </Card>
        )}

        {/* Academic record */}
        <Card className="asp-section asp-section--full">
          <h3 className="asp-section__title">{t('studentProfile.sections.academic')}</h3>
          {reportCards.length === 0 ? (
            <p className="asp-empty">{t('studentProfile.academic.noReports')}</p>
          ) : (
            <div className="asp-table-wrap">
              <table className="asp-table">
                <thead>
                  <tr>
                    <th>{t('studentProfile.academic.columns.term')}</th>
                    <th>{t('studentProfile.academic.columns.year')}</th>
                    <th>{t('studentProfile.academic.columns.avg')}</th>
                    <th>{t('studentProfile.academic.columns.rank')}</th>
                    <th>{t('studentProfile.academic.columns.mention')}</th>
                    <th>{t('studentProfile.academic.columns.conduct')}</th>
                    <th>{t('studentProfile.academic.columns.absences')}</th>
                    <th>{t('studentProfile.academic.columns.delays')}</th>
                    <th>{t('studentProfile.academic.columns.warnings')}</th>
                    <th>{t('studentProfile.academic.columns.commendations')}</th>
                    <th>{t('studentProfile.academic.columns.status')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {reportCards.map((r) => {
                    const absences = r.attendanceAbsent
                      ?? (r.attendanceDays != null && r.attendancePresent != null
                          ? Math.max(0, r.attendanceDays - r.attendancePresent)
                          : null);
                    return (
                      <tr key={r.id}>
                        <td><strong>{r.termName ?? `T${r.termNumber}`}</strong></td>
                        <td>{r.academicYear}</td>
                        <td>
                          <strong className={Number(r.overallAverage) >= 10 ? 'asp-text--pass' : 'asp-text--fail'}>
                            {r.overallAverage != null ? Number(r.overallAverage).toFixed(2).replace('.', ',') : '—'}
                          </strong>
                        </td>
                        <td>{r.classRank ? `${r.classRank}e / ${r.classSize ?? '?'}` : '—'}</td>
                        <td>{r.mention ?? '—'}</td>
                        <td>
                          {r.conductRating ? (
                            <Badge variant={CONDUCT_VARIANT[r.conductRating] ?? 'default'}>
                              {t(`studentProfile.discipline.conduct.${r.conductRating}`, r.conductRating)}
                            </Badge>
                          ) : '—'}
                        </td>
                        <td className={absences > 0 ? 'asp-text--warn' : ''}>{absences != null ? absences : '—'}</td>
                        <td className={r.attendanceLate > 0 ? 'asp-text--warn' : ''}>{r.attendanceLate != null ? r.attendanceLate : '—'}</td>
                        <td className={r.warnings > 0 ? 'asp-text--danger' : ''}>{r.warnings ?? 0}</td>
                        <td className={r.commendations > 0 ? 'asp-text--success' : ''}>{r.commendations ?? 0}</td>
                        <td>
                          <Badge variant={REPORT_VARIANT[r.status] ?? 'default'}>
                            {t(`studentProfile.academic.reportStatus.${r.status}`, r.status)}
                          </Badge>
                        </td>
                        <td>
                          {r.status === 'PUBLISHED' && (
                            <Link to={`/admin/reports/${r.id}`} className="asp-link">
                              {t('studentProfile.academic.columns.view')}
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Disciplinary file */}
        <Card className="asp-section asp-section--full">
          <h3 className="asp-section__title">{t('studentProfile.sections.disciplinary')}</h3>
          {disciplinaryRecords.length === 0 ? (
            <p className="asp-empty">{t('studentProfile.discipline.noRecords')}</p>
          ) : (
            <div className="asp-disc-records">
              {disciplinaryRecords.map((rec) => {
                const cfg = DISC_TYPE_BG[rec.type] ?? DISC_TYPE_BG.OTHER;
                return (
                  <div key={rec.id} className={`asp-disc-record ${rec.resolved ? 'asp-disc-record--resolved' : ''}`}>
                    <div className="asp-disc-record__header">
                      <span
                        className="asp-disc-record__type"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {t(`studentProfile.discipline.types.${rec.type}`, rec.type)}
                      </span>
                      <span className="asp-disc-record__date">
                        {new Date(rec.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      {rec.resolved ? (
                        <span className="asp-disc-record__pill asp-disc-record__pill--ok">{t('studentProfile.discipline.resolved')}</span>
                      ) : (
                        <span className="asp-disc-record__pill asp-disc-record__pill--open">{t('studentProfile.discipline.open')}</span>
                      )}
                    </div>
                    <p className="asp-disc-record__desc">{rec.description}</p>
                    {rec.sanction && (
                      <div className="asp-disc-record__sanction">
                        <strong>{t('studentProfile.discipline.sanction')}</strong> {rec.sanction}
                        {rec.sanctionStart && (
                          <> ({new Date(rec.sanctionStart).toLocaleDateString('fr-FR')}
                          {rec.sanctionEnd && <> — {new Date(rec.sanctionEnd).toLocaleDateString('fr-FR')}</>})</>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Transfers */}
        {transfers.length > 0 && (
          <Card className="asp-section asp-section--full">
            <h3 className="asp-section__title">{t('studentProfile.sections.transfers')}</h3>
            <div className="asp-transfers">
              {transfers.map((tr) => (
                <div key={tr.id} className={`asp-transfer asp-transfer--${tr.direction.toLowerCase()}`}>
                  <span className={`asp-transfer__badge asp-transfer__badge--${tr.direction.toLowerCase()}`}>
                    {tr.direction === 'IN' ? t('studentProfile.transfers.in') : t('studentProfile.transfers.out')}
                  </span>
                  <span className="asp-transfer__school">{tr.otherSchool}</span>
                  <span className="asp-transfer__date">
                    {new Date(tr.transferDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  {tr.reason && <span className="asp-transfer__reason">{tr.reason}</span>}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Alumni */}
        {alumniRecord && (
          <Card className="asp-section asp-section--full">
            <h3 className="asp-section__title">{t('studentProfile.sections.alumni')}</h3>
            <div className="asp-alumni">
              <div className="asp-alumni__row">
                <span className="asp-alumni__label">{t('studentProfile.alumni.promo')}</span>
                <strong>{alumniRecord.graduationYear}</strong>
              </div>
              {alumniRecord.lastClass && (
                <div className="asp-alumni__row">
                  <span className="asp-alumni__label">{t('studentProfile.alumni.lastClass')}</span>
                  <span>{alumniRecord.lastClass}</span>
                </div>
              )}
              {alumniRecord.examType && (
                <div className="asp-alumni__row">
                  <span className="asp-alumni__label">{alumniRecord.examType}</span>
                  <span className={`asp-alumni__result ${alumniRecord.examResult === 'Ajourné' ? 'fail' : 'pass'}`}>
                    {alumniRecord.examResult ?? '—'}
                  </span>
                </div>
              )}
              {alumniRecord.furtherEducation && (
                <div className="asp-alumni__row">
                  <span className="asp-alumni__label">{t('studentProfile.alumni.further')}</span>
                  <span>{alumniRecord.furtherEducation}</span>
                </div>
              )}
              {alumniRecord.contactPhone && (
                <div className="asp-alumni__row">
                  <span className="asp-alumni__label">{t('studentProfile.alumni.contact')}</span>
                  <span>{alumniRecord.contactPhone}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* National exam results */}
        <Card className="asp-section asp-section--full">
          <h3 className="asp-section__title">{t('studentProfile.sections.nationalExams')}</h3>
          {nationalExamResults.length === 0 ? (
            <p className="asp-empty">{t('studentProfile.nationalExams.noResults')}</p>
          ) : (
            <div className="asp-table-wrap">
              <table className="asp-table">
                <thead>
                  <tr>
                    <th>{t('studentProfile.nationalExams.columns.exam')}</th>
                    <th>{t('studentProfile.nationalExams.columns.session')}</th>
                    <th>{t('studentProfile.nationalExams.columns.year')}</th>
                    <th>{t('studentProfile.nationalExams.columns.series')}</th>
                    <th>{t('studentProfile.nationalExams.columns.result')}</th>
                    <th>{t('studentProfile.nationalExams.columns.mention')}</th>
                    <th>{t('studentProfile.nationalExams.columns.score')}</th>
                  </tr>
                </thead>
                <tbody>
                  {nationalExamResults.map((r) => {
                    const cfg = EXAM_RESULT_COLORS[r.result] ?? EXAM_RESULT_COLORS.ABSENT;
                    return (
                      <tr key={r.id}>
                        <td><strong>{r.examType}</strong></td>
                        <td>{r.session}</td>
                        <td>{r.academicYear}</td>
                        <td>{r.series ?? '—'}</td>
                        <td>
                          <span style={{ fontSize: '.72rem', fontWeight: 700, padding: '.15rem .5rem', borderRadius: 6, color: cfg.color, background: cfg.bg }}>
                            {t(`studentProfile.nationalExams.results.${r.result}`, r.result)}
                          </span>
                        </td>
                        <td>{r.mention ?? '—'}</td>
                        <td>{r.totalScore != null ? r.totalScore : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Library loans */}
        <Card className="asp-section asp-section--full">
          <h3 className="asp-section__title">{t('studentProfile.sections.library')}</h3>
          {libraryLoans.length === 0 ? (
            <p className="asp-empty">{t('studentProfile.library.noLoans')}</p>
          ) : (
            <div className="asp-table-wrap">
              <table className="asp-table">
                <thead>
                  <tr>
                    <th>{t('studentProfile.library.columns.book')}</th>
                    <th>{t('studentProfile.library.columns.loanDate')}</th>
                    <th>{t('studentProfile.library.columns.dueDate')}</th>
                    <th>{t('studentProfile.library.columns.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {libraryLoans.map((loan) => {
                    const isOverdue = !loan.isReturned && new Date(loan.dueDate) < new Date();
                    return (
                      <tr key={loan.id}>
                        <td><strong>{loan.item?.name ?? loan.itemId}</strong></td>
                        <td>{loan.loanDate ? new Date(loan.loanDate).toLocaleDateString('fr-FR') : '—'}</td>
                        <td className={isOverdue ? 'asp-text--danger' : ''}>
                          {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString('fr-FR') : '—'}
                          {isOverdue && ` ${t('studentProfile.library.overdue')}`}
                        </td>
                        <td>
                          {loan.isReturned ? (
                            <Badge variant="success">{t('studentProfile.library.returned')}</Badge>
                          ) : (
                            <Badge variant={isOverdue ? 'danger' : 'info'}>{t('studentProfile.library.active')}</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Medical file */}
        <Card className="asp-section asp-section--full">
          <h3 className="asp-section__title">{t('studentProfile.sections.health')}</h3>
          {healthRecords.length === 0 ? (
            <p className="asp-empty">{t('studentProfile.health.noRecords')}</p>
          ) : (
            <div className="asp-health-records">
              {healthRecords.map((rec) => {
                const cfg = HEALTH_BADGE_COLORS[rec.visitType] ?? HEALTH_BADGE_COLORS.OTHER;
                return (
                  <div key={rec.id} className="asp-health-row">
                    <span className="asp-health-row__date">
                      {rec.date ? new Date(rec.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                    <span className="asp-health-row__badge" style={{ color: cfg.color, background: cfg.bg }}>
                      {t(`studentProfile.health.types.${rec.visitType}`, rec.visitType)}
                    </span>
                    {rec.complaint && (
                      <span className="asp-health-row__complaint">{rec.complaint}</span>
                    )}
                    {rec.treatment && (
                      <span className="asp-health-row__treatment">→ {rec.treatment}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

      </div>
    </AppShell>
  );
}

export default AdminStudentProfilePage;
