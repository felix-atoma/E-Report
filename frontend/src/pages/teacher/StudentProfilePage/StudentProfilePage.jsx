import { useParams, Link } from 'react-router-dom';
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
const STATUS_LABEL   = { PAID: 'Payé', PARTIAL: 'Partiel', UNPAID: 'Impayé', EXEMPT: 'Exempté' };
const REPORT_VARIANT = { DRAFT: 'default', REVIEW: 'warning', PUBLISHED: 'success' };
const REPORT_LABEL   = { DRAFT: 'Brouillon', REVIEW: 'En révision', PUBLISHED: 'Publié' };

function StudentProfilePage() {
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

  if (isLoading) return <AppShell title="Profil élève"><Loading /></AppShell>;

  const fullName = student
    ? `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() || student.name || '—'
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
    <AppShell title="Profil élève">
      <PageHeader
        title={fullName}
        subtitle={`Matricule : ${student?.admissionNumber ?? '—'}`}
        actions={
          <Link
            to={`/teacher/reports/new?studentId=${id}`}
            className="sp-btn-primary"
          >
            + Nouveau bulletin
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
              Frais : {STATUS_LABEL[payStatus] ?? payStatus}
            </Badge>
          </div>
        </Card>

        {/* Details */}
        <Card className="sp-section">
          <h3 className="sp-section__title">Informations</h3>
          <dl className="sp-details">
            <div className="sp-details__row">
              <dt>Date de naissance</dt><dd>{dob}</dd>
            </div>
            <div className="sp-details__row">
              <dt>Genre</dt>
              <dd>{student?.gender === 'M' ? 'Masculin' : student?.gender === 'F' ? 'Féminin' : '—'}</dd>
            </div>
            <div className="sp-details__row">
              <dt>Classe actuelle</dt>
              <dd>{student?.currentClass?.name ?? '—'}</dd>
            </div>
            <div className="sp-details__row">
              <dt>Parent / Tuteur</dt>
              <dd>{student?.parent?.name ?? '—'}</dd>
            </div>
            <div className="sp-details__row">
              <dt>Contact parent</dt>
              <dd>{student?.parent?.whatsappNumber ?? student?.parent?.email ?? '—'}</dd>
            </div>
          </dl>
        </Card>

        {/* Fee summary */}
        {feeSummary && (
          <Card className="sp-section">
            <h3 className="sp-section__title">Situation financière</h3>
            <dl className="sp-details">
              <div className="sp-details__row">
                <dt>Statut</dt>
                <dd><Badge variant={STATUS_VARIANT[payStatus]}>{STATUS_LABEL[payStatus]}</Badge></dd>
              </div>
              <div className="sp-details__row">
                <dt>Total dû</dt>
                <dd>{(feeSummary.totalDue ?? 0).toLocaleString('fr-FR')} XOF</dd>
              </div>
              <div className="sp-details__row">
                <dt>Total payé</dt>
                <dd>{(feeSummary.totalPaid ?? 0).toLocaleString('fr-FR')} XOF</dd>
              </div>
              <div className="sp-details__row">
                <dt>Solde restant</dt>
                <dd className={feeSummary.balance > 0 ? 'sp-text--danger' : ''}>
                  {(feeSummary.balance ?? 0).toLocaleString('fr-FR')} XOF
                </dd>
              </div>
            </dl>
          </Card>
        )}

        {/* Performance summary */}
        <Card className="sp-section">
          <h3 className="sp-section__title">Résultats</h3>
          {published.length === 0 ? (
            <p className="sp-empty">Aucun bulletin publié.</p>
          ) : (
            <>
              <div className="sp-avg-hero">
                <span className="sp-avg-hero__value">{avgAll}</span>
                <span className="sp-avg-hero__label">moyenne générale / 20</span>
              </div>
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>Période</th>
                    <th>Année</th>
                    <th>Moyenne</th>
                    <th>Statut</th>
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
                          {REPORT_LABEL[r.status] ?? r.status}
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
          <h3 className="sp-section__title">Tous les bulletins</h3>
          {reports.length === 0 ? (
            <p className="sp-empty">Aucun bulletin créé pour cet élève.</p>
          ) : (
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Période</th>
                  <th>Année</th>
                  <th>Moyenne</th>
                  <th>Statut</th>
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
                        {REPORT_LABEL[r.status] ?? r.status}
                      </Badge>
                    </td>
                    <td>
                      <Link to={`/teacher/reports/${r.id}`} className="sp-link">
                        Ouvrir →
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
