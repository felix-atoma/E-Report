import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsService } from '../../../services/reportsService';
import { institutionsService } from '../../../services/institutionsService';
import { gradesService } from '../../../services/gradesService';
import Loading from '../../../components/common/Loading/Loading';
import './PrintReportCardPage.css';

const CONDUCT_LABELS = {
  TRES_BIEN: 'Très Bien', BIEN: 'Bien', PASSABLE: 'Passable', MEDIOCRE: 'Médiocre',
};

function fmt(v) {
  if (v == null) return '—';
  return Number(v).toFixed(2).replace('.', ',');
}
function fmtNote(v) {
  if (v == null) return '—';
  return Number(v).toFixed(0);
}

export default function PrintReportCardPage() {
  const { id } = useParams();

  const { data: report, isLoading: loadingReport } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsService.get(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: institution, isLoading: loadingInst } = useQuery({
    queryKey: ['institution-me'],
    queryFn: () => institutionsService.me().then((r) => r.data),
  });

  const { data: fiches = [] } = useQuery({
    queryKey: ['fiches-print', report?.classId, report?.academicYear, report?.termNumber],
    queryFn: () =>
      gradesService.listFiches(report.classId, report.academicYear, report.termNumber).then((r) => r.data),
    enabled: !!report?.classId && !!report?.academicYear && !!report?.termNumber,
  });

  useEffect(() => {
    if (!institution) return;
    const branding = institution.brandingSettings ?? {};
    const primary   = branding.primaryColor   || '#1e3a8a';
    const secondary = branding.secondaryColor || '#f59e0b';
    const el = document.createElement('style');
    el.id = 'bulletin-theme';
    el.textContent = `:root { --bulletin-primary: ${primary}; --bulletin-secondary: ${secondary}; }`;
    document.head.appendChild(el);
    return () => el.remove();
  }, [institution]);

  if (loadingReport || loadingInst) {
    return <div className="print-page__loading"><Loading /></div>;
  }

  if (!report) {
    return <div className="print-page__loading">Bulletin introuvable.</div>;
  }

  const grades = report.grades ?? [];
  const totalCoef   = grades.reduce((s, g) => s + (g.coefficient ?? 0), 0);
  const totalPoints = grades.reduce((s, g) => s + (g.weightedScore ?? 0), 0);
  const absences = report.attendanceDays != null && report.attendancePresent != null
    ? report.attendanceDays - report.attendancePresent
    : null;

  const studentName = report.student?.user?.name ?? report.student?.admissionNumber ?? '—';
  const dob = report.student?.dateOfBirth
    ? new Date(report.student.dateOfBirth).toLocaleDateString('fr-FR')
    : '—';
  const termLabel = report.termName ?? `Trimestre ${report.termNumber}`;

  return (
    <div className="print-page">
      {/* Print / close toolbar — hidden on print */}
      <div className="print-page__toolbar no-print">
        <button className="print-page__btn print-page__btn--print" onClick={() => window.print()}>
          🖨️ Imprimer / Enregistrer PDF
        </button>
        <button className="print-page__btn print-page__btn--close" onClick={() => window.close()}>
          ✕ Fermer
        </button>
      </div>

      {/* A4 page */}
      <div className="print-page__a4">

        {/* Watermark — institution name printed diagonally behind content */}
        {institution?.name && (
          <div className="pr-watermark" aria-hidden="true">{institution.name}</div>
        )}

        {/* Header */}
        <div className="pr-header">
          {institution?.logo && (
            <img src={institution.logo} alt="Logo" className="pr-header__logo" />
          )}
          <div className="pr-header__center">
            <div className="pr-header__country">République Togolaise — Travail · Liberté · Patrie</div>
            <h1 className="pr-header__school">{institution?.name ?? 'Établissement scolaire'}</h1>
            {institution?.address && <div className="pr-header__sub">{institution.address}</div>}
            {institution?.motto && <div className="pr-header__motto">« {institution.motto} »</div>}
          </div>
          {institution?.crest && (
            <img src={institution.crest} alt="Crest" className="pr-header__crest" />
          )}
        </div>

        {/* Title bar */}
        <div className="pr-title">
          BULLETIN DE NOTES — {termLabel.toUpperCase()} — {report.academicYear}
        </div>

        {/* Student band */}
        <div className="pr-student-band">
          <div className="pr-student-band__field">
            <label>Élève</label>
            <span>{studentName}</span>
          </div>
          <div className="pr-student-band__field">
            <label>Classe</label>
            <span>{report.class?.name ?? '—'}</span>
          </div>
          <div className="pr-student-band__field">
            <label>N° Matricule</label>
            <span>{report.student?.admissionNumber ?? '—'}</span>
          </div>
          <div className="pr-student-band__field">
            <label>Date de naissance</label>
            <span>{dob}</span>
          </div>
          <div className="pr-student-band__field">
            <label>Rang</label>
            <span>{report.classRank ?? '—'} / {report.classSize ?? '—'}</span>
          </div>
        </div>

        {/* Grades table */}
        <table className="pr-grades">
          <thead>
            <tr className="pr-grades__head-top">
              <th rowSpan={2} className="pr-grades__col-matiere">Matière</th>
              <th colSpan={2} className="pr-grades__group">Interrogations</th>
              <th rowSpan={2} className="pr-grades__col-dev">Devoir</th>
              <th rowSpan={2} className="pr-grades__col-cmp">Compo.</th>
              <th rowSpan={2} className="pr-grades__col-moy">Moy.</th>
              <th rowSpan={2} className="pr-grades__col-coef">Coef.</th>
              <th rowSpan={2} className="pr-grades__col-pts">Points</th>
              <th rowSpan={2} className="pr-grades__col-rang">Rang</th>
              <th rowSpan={2} className="pr-grades__col-appr">Appréciation</th>
              <th rowSpan={2} className="pr-grades__col-sig">Signature du prof.</th>
            </tr>
            <tr className="pr-grades__head-sub">
              <th className="pr-grades__col-num">Interro 1</th>
              <th className="pr-grades__col-num">Interro 2</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((g) => {
              const moy = g.moyenneMatiere ?? g.score;
              const fail = moy != null && moy < (g.subject?.passMark ?? 10);
              const fiche = fiches.find((f) => f.subjectId === g.subjectId);
              const isAdminVerified = fiche?.signatureData === 'ADMIN_VERIFIED';
              return (
                <tr key={g.subjectId ?? g.id}>
                  <td className="pr-grades__col-matiere">{g.subject?.nameFr ?? '—'}</td>
                  <td className="pr-grades__col-num">{fmtNote(g.noteInterro1)}</td>
                  <td className="pr-grades__col-num">{fmtNote(g.noteInterro2)}</td>
                  <td className="pr-grades__col-dev">{fmtNote(g.noteDevoir)}</td>
                  <td className="pr-grades__col-cmp">{fmtNote(g.noteComposition)}</td>
                  <td className={`pr-grades__col-moy${fail ? ' pr-grades__fail' : ' pr-grades__pass'}`}>
                    {fmt(moy)}
                  </td>
                  <td className="pr-grades__col-coef">{g.coefficient ?? '—'}</td>
                  <td className="pr-grades__col-pts">{fmt(g.weightedScore)}</td>
                  <td className="pr-grades__col-rang">{g.rangMatiere ?? '—'}</td>
                  <td className="pr-grades__col-appr">{g.appreciation ?? '—'}</td>
                  <td className="pr-grades__col-sig">
                    {fiche?.isSigned ? (
                      isAdminVerified ? (
                        <span className="pr-sig-verified">✓</span>
                      ) : fiche.signatureData ? (
                        <img
                          src={fiche.signatureData}
                          alt=""
                          className="pr-sig-img"
                        />
                      ) : (
                        <div className="pr-sig-blank" />
                      )
                    ) : (
                      <div className="pr-sig-blank" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="pr-grades__foot">
              <td colSpan={6} style={{ textAlign: 'right', paddingRight: '8px' }}>
                Totaux :
              </td>
              <td className="pr-grades__col-coef"><strong>{totalCoef}</strong></td>
              <td className="pr-grades__col-pts"><strong>{fmt(totalPoints)}</strong></td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>

        {/* Stats row */}
        <div className="pr-stats">
          <div className="pr-stats__box">
            <label>Moyenne générale</label>
            <strong className={report.overallAverage >= 10 ? 'pr-stats__pass' : 'pr-stats__fail'}>
              {fmt(report.overallAverage)} / 20
            </strong>
          </div>
          <div className="pr-stats__box">
            <label>Mention</label>
            <strong>{report.mention ?? '—'}</strong>
          </div>
          <div className="pr-stats__box">
            <label>Rang</label>
            <strong>{report.classRank ?? '—'} / {report.classSize ?? '—'}</strong>
          </div>
          <div className="pr-stats__box">
            <label>Moy. classe</label>
            <strong>{fmt(report.classAverage)}</strong>
          </div>
          <div className="pr-stats__box">
            <label>Plus haute</label>
            <strong>{fmt(report.classHighest)}</strong>
          </div>
          <div className="pr-stats__box">
            <label>Plus basse</label>
            <strong>{fmt(report.classLowest)}</strong>
          </div>
          <div className="pr-stats__box">
            <label>Conduite</label>
            <strong>{report.conductRating ? CONDUCT_LABELS[report.conductRating] : '—'}</strong>
          </div>
          {absences != null && (
            <div className="pr-stats__box">
              <label>Absences</label>
              <strong>{absences} j</strong>
            </div>
          )}
          {report.attendanceLate != null && (
            <div className="pr-stats__box">
              <label>Retards</label>
              <strong>{report.attendanceLate}</strong>
            </div>
          )}
          {report.honorCouncil && (
            <div className="pr-stats__box pr-stats__box--honor">
              <strong>🏆 Tableau d'honneur</strong>
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="pr-comments">
          {report.teacherComment && (
            <div className="pr-comment-row">
              <span className="pr-comment-label">Prof. principal :</span>
              <span className="pr-comment-text">« {report.teacherComment} »</span>
            </div>
          )}
          {report.principalComment && (
            <div className="pr-comment-row">
              <span className="pr-comment-label">Direction :</span>
              <span className="pr-comment-text">« {report.principalComment} »</span>
            </div>
          )}
        </div>

        {/* Signature row */}
        <div className="pr-signatures">
          <div className="pr-sig">
            <div className="pr-sig__space" />
            <div className="pr-sig__line" />
            <div className="pr-sig__name">
              {report.class?.teacher?.name ?? report.createdBy?.name ?? ''}
            </div>
            <div className="pr-sig__label">Le Prof. principal</div>
          </div>
          <div className="pr-sig">
            <div className="pr-sig__space" />
            <div className="pr-sig__line" />
            <div className="pr-sig__name">
              {institution?.name ? `Directeur — ${institution.name}` : 'Le Directeur'}
            </div>
            <div className="pr-sig__label">Le Directeur de l'établissement</div>
          </div>
          <div className="pr-sig">
            <div className="pr-sig__space" />
            <div className="pr-sig__line" />
            <div className="pr-sig__name">&nbsp;</div>
            <div className="pr-sig__label">Signature du Parent / Tuteur</div>
          </div>
        </div>

        <div className="pr-footer">
          Généré le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          {institution?.name ? ` — ${institution.name}` : ''}
        </div>
      </div>
    </div>
  );
}
