import { useParams, Link, useNavigate } from 'react-router-dom';
import { useInstitution } from '../../../context/InstitutionContext';
import { useQuery } from '@tanstack/react-query';
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

/* ── Constants ── */
const FEE_VARIANT = { PAID: 'success', PARTIAL: 'warning', UNPAID: 'danger', EXEMPT: 'info' };
const FEE_LABEL   = { PAID: 'Payé', PARTIAL: 'Partiel', UNPAID: 'Impayé', EXEMPT: 'Exempté' };

const DISC_TYPE_CONFIG = {
  WARNING:     { label: 'Avertissement', bg: '#ffedd5', color: '#c2410c' },
  SUSPENSION:  { label: 'Suspension',    bg: '#fee2e2', color: '#b91c1c' },
  EXCLUSION:   { label: 'Exclusion',     bg: '#fde8e8', color: '#7f1d1d' },
  NOTE:        { label: 'Note',          bg: '#dbeafe', color: '#1d4ed8' },
  COMMENDATION:{ label: 'Félicitation',  bg: '#dcfce7', color: '#15803d' },
  OTHER:       { label: 'Autre',         bg: '#f3f4f6', color: '#4b5563' },
};

const CONDUCT_LABEL   = { TRES_BIEN: 'Très Bien', BIEN: 'Bien', PASSABLE: 'Passable', MEDIOCRE: 'Médiocre' };
const CONDUCT_VARIANT = { TRES_BIEN: 'success', BIEN: 'info', PASSABLE: 'warning', MEDIOCRE: 'danger' };

const REPORT_VARIANT = { DRAFT: 'default', REVIEW: 'warning', PUBLISHED: 'success' };
const REPORT_LABEL   = { DRAFT: 'Brouillon', REVIEW: 'En révision', PUBLISHED: 'Publié' };

/* ── Sub-components ── */
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

/* ── Main page ── */
function AdminStudentProfilePage() {
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

  if (isLoading) return <AppShell title="Profil élève"><Loading /></AppShell>;

  const name = student?.user?.name ?? student?.admissionNumber ?? '—';
  const reportCards = student?.reportCards ?? [];
  const published   = reportCards.filter((r) => r.status === 'PUBLISHED');

  /* ── Computed stats ── */
  const avgAll = published.length
    ? (published.reduce((s, r) => s + Number(r.overallAverage ?? 0), 0) / published.length)
    : null;

  const bestAvg = published.length
    ? Math.max(...published.map((r) => Number(r.overallAverage ?? 0)))
    : null;

  const avgRank = published.length
    ? Math.round(published.filter((r) => r.classRank).reduce((s, r) => s + r.classRank, 0)
        / (published.filter((r) => r.classRank).length || 1))
    : null;

  const honorCount = published.filter((r) => r.honorCouncil).length;

  /* ── Attendance aggregated ── */
  const withAtt        = published.filter((r) => r.attendanceDays != null);
  const totalJours     = withAtt.reduce((s, r) => s + (r.attendanceDays ?? 0), 0);
  const totalPresent   = withAtt.reduce((s, r) => s + (r.attendancePresent ?? 0), 0);
  const totalAbsences  = withAtt.reduce((s, r) => s + (r.attendanceAbsent ?? Math.max(0, (r.attendanceDays ?? 0) - (r.attendancePresent ?? 0))), 0);
  const totalRetards   = withAtt.reduce((s, r) => s + (r.attendanceLate ?? 0), 0);
  const tauxPresence   = totalJours > 0 ? Math.round((totalPresent / totalJours) * 100) : null;

  /* ── Discipline aggregated ── */
  const totalAvert   = published.reduce((s, r) => s + (r.warnings    ?? 0), 0);
  const totalFel     = published.reduce((s, r) => s + (r.commendations ?? 0), 0);

  const currentClass = student?.classes?.[0]?.class;
  const dob = student?.dateOfBirth
    ? new Date(student.dateOfBirth).toLocaleDateString('fr-FR')
    : '—';
  const enrollment = student?.enrollmentDate
    ? new Date(student.enrollmentDate).toLocaleDateString('fr-FR')
    : '—';

  const payStatus = feeSummary?.status ?? 'UNPAID';

  function printCertificate() {
    const schoolName    = institution?.name ?? 'Établissement Scolaire';
    const schoolAddress = institution?.address ?? '';
    const academicYear  = institution?.academicSettings?.currentYear
      ?? institution?.academicYear
      ?? new Date().getFullYear() + '-' + (new Date().getFullYear() + 1);
    const className     = currentClass?.name ?? '—';
    const today         = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Attestation d'inscription</title>
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#111;font-size:13px}
  .cert{max-width:600px;margin:0 auto;border:3px double #1e2a78;padding:32px}
  .cert__header{text-align:center;margin-bottom:28px}
  .cert__school{font-size:20px;font-weight:800;color:#1e2a78;text-transform:uppercase;letter-spacing:1px}
  .cert__address{font-size:12px;color:#6b7280;margin-top:4px}
  .cert__divider{border:none;border-top:2px solid #1e2a78;margin:16px 0}
  .cert__title{font-size:16px;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:2px;margin:20px 0;color:#1e2a78}
  .cert__body{line-height:2.2;font-size:14px}
  .cert__name{font-weight:800;font-size:16px;text-decoration:underline}
  .cert__footer{margin-top:36px;display:flex;justify-content:space-between;align-items:flex-end}
  .cert__stamp-area{width:120px;height:80px;border:1px dashed #9ca3af;text-align:center;padding:8px;font-size:10px;color:#9ca3af;display:flex;align-items:center;justify-content:center}
  .cert__signature{text-align:right;font-size:12px;line-height:2}
  @media print{body{padding:0}}
</style></head><body>
<div class="cert">
  <div class="cert__header">
    <div class="cert__school">${schoolName}</div>
    ${schoolAddress ? `<div class="cert__address">${schoolAddress}</div>` : ''}
  </div>
  <hr class="cert__divider"/>
  <div class="cert__title">Attestation d'Inscription</div>
  <div class="cert__body">
    <p>Je soussigné(e), le Directeur/la Directrice de <strong>${schoolName}</strong>, certifie que :</p>
    <p>L'élève <span class="cert__name">${name}</span>,</p>
    <p>Matricule : <strong>${student?.admissionNumber ?? '—'}</strong></p>
    ${dob !== '—' ? `<p>Né(e) le : <strong>${dob}</strong></p>` : ''}
    <p>Est régulièrement inscrit(e) dans notre établissement en classe de :</p>
    <p style="font-size:16px;font-weight:700;text-align:center;margin:12px 0">${className}</p>
    <p>Pour l'année scolaire : <strong>${academicYear}</strong></p>
    <p>Cette attestation est délivrée pour servir et valoir ce que de droit.</p>
  </div>
  <div class="cert__footer">
    <div class="cert__stamp-area">Cachet de l'établissement</div>
    <div class="cert__signature">
      <p>Fait à ${schoolAddress || 'Lomé'}, le ${today}</p>
      <p><strong>Le Directeur / La Directrice</strong></p>
      <br/><br/>
      <p>_______________________</p>
      <p style="font-size:11px;color:#9ca3af">Signature &amp; Cachet</p>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print();window.close();}<\/script>
</body></html>`;

    const w = window.open('', '_blank', 'width=700,height=800');
    w.document.write(html);
    w.document.close();
  }

  return (
    <AppShell title="Profil élève">
      <PageHeader
        title={name}
        subtitle={`Matricule : ${student?.admissionNumber ?? '—'}`}
        actions={
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button
              className="asp-back-btn"
              onClick={printCertificate}
              title="Générer une attestation d'inscription"
              style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '.4rem .875rem', fontWeight: 600, cursor: 'pointer', fontSize: '.82rem' }}
            >
              📄 Attestation
            </button>
            <button className="asp-back-btn" onClick={() => navigate('/admin/students')}>
              ← Retour aux élèves
            </button>
          </div>
        }
      />

      <div className="asp-layout">

        {/* ── Identity card ── */}
        <Card className="asp-identity">
          <Avatar name={name} src={student?.user?.profileImage} size="xl" />
          <div className="asp-identity__main">
            <h2 className="asp-identity__name">{name}</h2>
            <p className="asp-identity__matricule">{student?.admissionNumber ?? '—'}</p>
            <div className="asp-identity__badges">
              {student?.sex && (
                <Badge variant="info">{student.sex === 'M' ? 'Masculin' : 'Féminin'}</Badge>
              )}
              {currentClass && (
                <Badge variant="default">{currentClass.name}</Badge>
              )}
              {feeSummary && (
                <Badge variant={FEE_VARIANT[payStatus]}>{FEE_LABEL[payStatus]}</Badge>
              )}
            </div>
          </div>
          <dl className="asp-identity__details">
            <DetailRow label="Date de naissance">{dob}</DetailRow>
            <DetailRow label="Date d'inscription">{enrollment}</DetailRow>
            <DetailRow label="Classe actuelle">{currentClass ? `${currentClass.name} (${currentClass.academicYear})` : '—'}</DetailRow>
            <DetailRow label="Parent / Tuteur">{student?.parent?.name ?? '—'}</DetailRow>
            <DetailRow label="Contact parent">
              {student?.parent?.whatsappNumber ?? student?.parent?.email ?? '—'}
            </DetailRow>
          </dl>
        </Card>

        {/* ── KPI row ── */}
        <div className="asp-kpis">
          <KpiCard
            icon="📊"
            label="Moyenne générale"
            value={avgAll != null ? avgAll.toFixed(2).replace('.', ',') : '—'}
            sub="sur tous les trimestres publiés"
            colorClass="asp-kpi__icon--blue"
          />
          <KpiCard
            icon="🏅"
            label="Meilleure moyenne"
            value={bestAvg != null ? bestAvg.toFixed(2).replace('.', ',') : '—'}
            sub="meilleur trimestre"
            colorClass="asp-kpi__icon--gold"
          />
          <KpiCard
            icon="📈"
            label="Rang moyen"
            value={avgRank ? `${avgRank}e` : '—'}
            sub="classement en classe"
            colorClass="asp-kpi__icon--purple"
          />
          <KpiCard
            icon="⭐"
            label="Tableau d'honneur"
            value={honorCount}
            sub={`fois sur ${published.length} trimestre${published.length !== 1 ? 's' : ''}`}
            colorClass="asp-kpi__icon--star"
          />
        </div>

        {/* ── Assiduité ── */}
        <Card className="asp-section">
          <h3 className="asp-section__title">Assiduité</h3>
          {withAtt.length === 0 ? (
            <p className="asp-empty">Aucune donnée d'assiduité disponible.</p>
          ) : (
            <>
              <div className="asp-attend-kpis">
                <div className="asp-attend-kpi asp-attend-kpi--absent">
                  <span className="asp-attend-kpi__num">{totalAbsences}</span>
                  <span className="asp-attend-kpi__lbl">Absences</span>
                </div>
                <div className="asp-attend-kpi asp-attend-kpi--late">
                  <span className="asp-attend-kpi__num">{totalRetards}</span>
                  <span className="asp-attend-kpi__lbl">Retards</span>
                </div>
                <div className="asp-attend-kpi asp-attend-kpi--present">
                  <span className="asp-attend-kpi__num">{tauxPresence != null ? `${tauxPresence}%` : '—'}</span>
                  <span className="asp-attend-kpi__lbl">Taux de présence</span>
                </div>
                <div className="asp-attend-kpi asp-attend-kpi--total">
                  <span className="asp-attend-kpi__num">{totalJours}</span>
                  <span className="asp-attend-kpi__lbl">Jours de cours</span>
                </div>
              </div>
              {tauxPresence != null && (
                <div className="asp-attend-bar-wrap" title={`${tauxPresence}% de présence`}>
                  <div className="asp-attend-bar" style={{ width: `${tauxPresence}%` }} />
                </div>
              )}
            </>
          )}
        </Card>

        {/* ── Daily Attendance Records ── */}
        <Card className="asp-section">
          <h3 className="asp-section__title">Présences journalières</h3>
          <AttendanceInput studentId={student.id} />
        </Card>

        {/* ── Discipline & Conduite ── */}
        <Card className="asp-section">
          <h3 className="asp-section__title">Discipline &amp; Conduite</h3>
          <div className="asp-discipline-kpis">
            <div className="asp-disc-kpi asp-disc-kpi--warn">
              <span className="asp-disc-kpi__num">{totalAvert}</span>
              <span className="asp-disc-kpi__lbl">Avertissement{totalAvert !== 1 ? 's' : ''}</span>
            </div>
            <div className="asp-disc-kpi asp-disc-kpi--fel">
              <span className="asp-disc-kpi__num">{totalFel}</span>
              <span className="asp-disc-kpi__lbl">Félicitation{totalFel !== 1 ? 's' : ''}</span>
            </div>
            <div className="asp-disc-kpi asp-disc-kpi--honor">
              <span className="asp-disc-kpi__num">{honorCount}</span>
              <span className="asp-disc-kpi__lbl">Tableau d'honneur</span>
            </div>
          </div>

          {published.length > 0 && (
            <div className="asp-conduct-list">
              <p className="asp-conduct-list__label">Conduite par trimestre</p>
              {published.map((r) => (
                <div key={r.id} className="asp-conduct-row">
                  <span className="asp-conduct-row__period">
                    {r.termName ?? `T${r.termNumber}`} {r.academicYear}
                  </span>
                  {r.conductRating ? (
                    <Badge variant={CONDUCT_VARIANT[r.conductRating] ?? 'default'}>
                      {CONDUCT_LABEL[r.conductRating] ?? r.conductRating}
                    </Badge>
                  ) : (
                    <span className="asp-empty-inline">—</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Situation financière ── */}
        {feeSummary && (
          <Card className="asp-section">
            <h3 className="asp-section__title">Situation financière</h3>
            <dl className="asp-details">
              <DetailRow label="Statut">
                <Badge variant={FEE_VARIANT[payStatus]}>{FEE_LABEL[payStatus]}</Badge>
              </DetailRow>
              <DetailRow label="Total dû">
                {(feeSummary.totalDue ?? 0).toLocaleString('fr-FR')} XOF
              </DetailRow>
              <DetailRow label="Total payé">
                {(feeSummary.totalPaid ?? 0).toLocaleString('fr-FR')} XOF
              </DetailRow>
              <DetailRow label="Solde restant">
                <span className={feeSummary.balance > 0 ? 'asp-text--danger' : ''}>
                  {(feeSummary.balance ?? 0).toLocaleString('fr-FR')} XOF
                </span>
              </DetailRow>
            </dl>
          </Card>
        )}

        {/* ── Parcours scolaire ── */}
        <Card className="asp-section asp-section--full">
          <h3 className="asp-section__title">Parcours scolaire</h3>
          {reportCards.length === 0 ? (
            <p className="asp-empty">Aucun bulletin créé pour cet élève.</p>
          ) : (
            <div className="asp-table-wrap">
              <table className="asp-table">
                <thead>
                  <tr>
                    <th>Période</th>
                    <th>Année</th>
                    <th>Moyenne</th>
                    <th>Rang</th>
                    <th>Mention</th>
                    <th>Conduite</th>
                    <th>Absences</th>
                    <th>Retards</th>
                    <th>Avert.</th>
                    <th>Fél.</th>
                    <th>Statut</th>
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
                              {CONDUCT_LABEL[r.conductRating]}
                            </Badge>
                          ) : '—'}
                        </td>
                        <td className={absences > 0 ? 'asp-text--warn' : ''}>
                          {absences != null ? absences : '—'}
                        </td>
                        <td className={r.attendanceLate > 0 ? 'asp-text--warn' : ''}>
                          {r.attendanceLate != null ? r.attendanceLate : '—'}
                        </td>
                        <td className={r.warnings > 0 ? 'asp-text--danger' : ''}>
                          {r.warnings ?? 0}
                        </td>
                        <td className={r.commendations > 0 ? 'asp-text--success' : ''}>
                          {r.commendations ?? 0}
                        </td>
                        <td>
                          <Badge variant={REPORT_VARIANT[r.status] ?? 'default'}>
                            {REPORT_LABEL[r.status] ?? r.status}
                          </Badge>
                        </td>
                        <td>
                          {r.status === 'PUBLISHED' && (
                            <Link to={`/admin/reports/${r.id}`} className="asp-link">
                              Voir →
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

        {/* ── Dossier disciplinaire ── */}
        <Card className="asp-section asp-section--full">
          <h3 className="asp-section__title">Dossier disciplinaire</h3>
          {disciplinaryRecords.length === 0 ? (
            <p className="asp-empty">Aucun dossier disciplinaire enregistré.</p>
          ) : (
            <div className="asp-disc-records">
              {disciplinaryRecords.map((rec) => {
                const cfg = DISC_TYPE_CONFIG[rec.type] ?? DISC_TYPE_CONFIG.OTHER;
                return (
                  <div key={rec.id} className={`asp-disc-record ${rec.resolved ? 'asp-disc-record--resolved' : ''}`}>
                    <div className="asp-disc-record__header">
                      <span
                        className="asp-disc-record__type"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                      <span className="asp-disc-record__date">
                        {new Date(rec.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      {rec.resolved ? (
                        <span className="asp-disc-record__pill asp-disc-record__pill--ok">Résolu</span>
                      ) : (
                        <span className="asp-disc-record__pill asp-disc-record__pill--open">En cours</span>
                      )}
                    </div>
                    <p className="asp-disc-record__desc">{rec.description}</p>
                    {rec.sanction && (
                      <div className="asp-disc-record__sanction">
                        <strong>Sanction :</strong> {rec.sanction}
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

        {/* ── Transferts ── */}
        {transfers.length > 0 && (
          <Card className="asp-section asp-section--full">
            <h3 className="asp-section__title">Transferts</h3>
            <div className="asp-transfers">
              {transfers.map((t) => (
                <div key={t.id} className={`asp-transfer asp-transfer--${t.direction.toLowerCase()}`}>
                  <span className={`asp-transfer__badge asp-transfer__badge--${t.direction.toLowerCase()}`}>
                    {t.direction === 'IN' ? '↓ Entrée' : '↑ Sortie'}
                  </span>
                  <span className="asp-transfer__school">{t.otherSchool}</span>
                  <span className="asp-transfer__date">
                    {new Date(t.transferDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  {t.reason && <span className="asp-transfer__reason">{t.reason}</span>}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Dossier Alumni ── */}
        {alumniRecord && (
          <Card className="asp-section asp-section--full">
            <h3 className="asp-section__title">Dossier Alumni</h3>
            <div className="asp-alumni">
              <div className="asp-alumni__row">
                <span className="asp-alumni__label">Promotion</span>
                <strong>{alumniRecord.graduationYear}</strong>
              </div>
              {alumniRecord.lastClass && (
                <div className="asp-alumni__row">
                  <span className="asp-alumni__label">Dernière classe</span>
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
                  <span className="asp-alumni__label">Poursuite</span>
                  <span>{alumniRecord.furtherEducation}</span>
                </div>
              )}
              {alumniRecord.contactPhone && (
                <div className="asp-alumni__row">
                  <span className="asp-alumni__label">Contact</span>
                  <span>{alumniRecord.contactPhone}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ── Résultats aux examens nationaux ── */}
        <Card className="asp-section asp-section--full">
          <h3 className="asp-section__title">Résultats aux examens nationaux</h3>
          {nationalExamResults.length === 0 ? (
            <p className="asp-empty">Aucun résultat d'examen national enregistré.</p>
          ) : (
            <div className="asp-table-wrap">
              <table className="asp-table">
                <thead>
                  <tr>
                    <th>Examen</th>
                    <th>Session</th>
                    <th>Année</th>
                    <th>Série</th>
                    <th>Résultat</th>
                    <th>Mention</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {nationalExamResults.map((r) => {
                    const resultColors = {
                      ADMIS:   { color: '#15803d', bg: '#dcfce7' },
                      AJOURNE: { color: '#b45309', bg: '#fef3c7' },
                      ABSENT:  { color: '#6b7280', bg: '#f3f4f6' },
                      ELIMINE: { color: '#b91c1c', bg: '#fee2e2' },
                    };
                    const resultLabels = { ADMIS: 'Admis', AJOURNE: 'Ajourné', ABSENT: 'Absent', ELIMINE: 'Éliminé' };
                    const cfg = resultColors[r.result] ?? resultColors.ABSENT;
                    return (
                      <tr key={r.id}>
                        <td><strong>{r.examType}</strong></td>
                        <td>{r.session}</td>
                        <td>{r.academicYear}</td>
                        <td>{r.series ?? '—'}</td>
                        <td>
                          <span style={{ fontSize: '.72rem', fontWeight: 700, padding: '.15rem .5rem', borderRadius: 6, color: cfg.color, background: cfg.bg }}>
                            {resultLabels[r.result] ?? r.result}
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

        {/* ── Prêts bibliothèque ── */}
        <Card className="asp-section asp-section--full">
          <h3 className="asp-section__title">Prêts bibliothèque</h3>
          {libraryLoans.length === 0 ? (
            <p className="asp-empty">Aucun prêt bibliothèque enregistré.</p>
          ) : (
            <div className="asp-table-wrap">
              <table className="asp-table">
                <thead>
                  <tr>
                    <th>Livre</th>
                    <th>Date prêt</th>
                    <th>Échéance</th>
                    <th>Statut</th>
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
                          {isOverdue && ' (retard)'}
                        </td>
                        <td>
                          {loan.isReturned ? (
                            <Badge variant="success">Rendu</Badge>
                          ) : (
                            <Badge variant={isOverdue ? 'danger' : 'info'}>En cours</Badge>
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

        {/* ── Dossier médical ── */}
        <Card className="asp-section asp-section--full">
          <h3 className="asp-section__title">Dossier médical</h3>
          {healthRecords.length === 0 ? (
            <p className="asp-empty">Aucune visite médicale enregistrée.</p>
          ) : (
            <div className="asp-health-records">
              {healthRecords.map((rec) => {
                const visitBadge = {
                  CONSULTATION: { label: 'Consultation', color: '#1d4ed8', bg: '#dbeafe' },
                  ACCIDENT:     { label: 'Accident',     color: '#b91c1c', bg: '#fee2e2' },
                  VACCINATION:  { label: 'Vaccination',  color: '#15803d', bg: '#dcfce7' },
                  DRESSING:     { label: 'Pansement',    color: '#a16207', bg: '#fef3c7' },
                  EVACUATION:   { label: 'Évacuation',   color: '#c2410c', bg: '#ffedd5' },
                  OTHER:        { label: 'Autre',        color: '#6b7280', bg: '#f3f4f6' },
                };
                const cfg = visitBadge[rec.visitType] ?? visitBadge.OTHER;
                return (
                  <div key={rec.id} className="asp-health-row">
                    <span className="asp-health-row__date">
                      {rec.date ? new Date(rec.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                    <span className="asp-health-row__badge" style={{ color: cfg.color, background: cfg.bg }}>
                      {cfg.label}
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
