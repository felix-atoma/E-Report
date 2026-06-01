import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reportsService } from '../../../services/reportsService';
import Loading from '../../../components/common/Loading/Loading';
import './AnnualReportPage.css';

const CONDUCT_LABELS = { TRES_BIEN: 'Très Bien', BIEN: 'Bien', PASSABLE: 'Passable', MEDIOCRE: 'Médiocre' };

function fmt(v) {
  if (v == null) return '—';
  return Number(v).toFixed(2).replace('.', ',');
}

export default function AnnualReportPage() {
  const { studentId, academicYear } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['annual-report', studentId, academicYear],
    queryFn: () => reportsService.getAnnualReport(studentId, academicYear).then((r) => r.data),
    enabled: !!studentId && !!academicYear,
  });

  if (isLoading) return <div className="ar-loading"><Loading /></div>;
  if (error || !data) return <div className="ar-loading">Rapport annuel introuvable.</div>;

  const { student, class: cls, institution, terms, subjects, annualAverage, councilDecision, mention } = data;
  const branding = institution?.brandingSettings ?? {};
  const primary = branding.primaryColor || '#1e3a8a';
  const secondary = branding.secondaryColor || '#f59e0b';

  const totalCoef = subjects.reduce((s, g) => s + g.coefficient, 0);
  const isPass = (annualAverage ?? 0) >= 10;

  return (
    <div className="ar-page">
      {/* Toolbar */}
      <div className="ar-toolbar no-print">
        <button className="ar-btn ar-btn--print" onClick={() => window.print()}>
          🖨️ Imprimer / PDF
        </button>
        <button className="ar-btn ar-btn--close" onClick={() => window.close()}>
          ✕ Fermer
        </button>
      </div>

      <div className="ar-a4" style={{ '--ar-primary': primary, '--ar-secondary': secondary }}>

        {/* Header */}
        <div className="ar-header">
          {institution?.logo
            ? <img src={institution.logo} alt="Logo" className="ar-header__logo" />
            : <div className="ar-header__logo-placeholder" />}
          <div className="ar-header__center">
            {(institution?.country || institution?.countryMotto) && (
              <div className="ar-header__country">
                {institution.country ?? ''}{institution.country && institution.countryMotto ? ' — ' : ''}{institution.countryMotto ?? ''}
              </div>
            )}
            <div className="ar-header__school">{institution?.name ?? '—'}</div>
            {institution?.address && <div className="ar-header__sub">{institution.address}</div>}
            {institution?.motto && <div className="ar-header__motto">« {institution.motto} »</div>}
          </div>
          {institution?.crest
            ? <img src={institution.crest} alt="Crest" className="ar-header__crest" />
            : <div className="ar-header__logo-placeholder" />}
        </div>

        {/* Title */}
        <div className="ar-title">
          <span>RELEVÉ ANNUEL — ANNÉE SCOLAIRE {academicYear}</span>
        </div>

        {/* Student band */}
        <div className="ar-student-band">
          <div className="ar-student-band__field ar-student-band__field--name">
            <label>Nom et Prénom</label>
            <span>{student.name}</span>
          </div>
          <div className="ar-student-band__field">
            <label>Classe</label>
            <span>{cls.name}</span>
          </div>
          <div className="ar-student-band__field">
            <label>Matricule</label>
            <span>{student.admissionNumber}</span>
          </div>
          <div className="ar-student-band__field">
            <label>Date de naissance</label>
            <span>{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('fr-FR') : '—'}</span>
          </div>
        </div>

        {/* Term summary */}
        <div className="ar-section-title">Résultats par période</div>
        <table className="ar-term-table">
          <thead>
            <tr>
              <th>Période</th>
              <th>Moyenne</th>
              <th>Rang</th>
              <th>Mention</th>
              <th>Conduite</th>
              <th>H. Absence</th>
              <th>Retards</th>
              <th>Félicit.</th>
              <th>Avert.</th>
            </tr>
          </thead>
          <tbody>
            {terms.map((t) => (
              <tr key={t.termNumber}>
                <td className="ar-term-table__name">{t.termName}</td>
                <td className={`ar-term-table__avg ${(t.overallAverage ?? 0) >= 10 ? 'ar-pass' : 'ar-fail'}`}>
                  {fmt(t.overallAverage)}
                </td>
                <td>{t.classRank ?? '—'}/{t.classSize ?? '—'}</td>
                <td>{t.mention ?? '—'}</td>
                <td>{t.conductRating ? CONDUCT_LABELS[t.conductRating] : '—'}</td>
                <td>{t.attendanceAbsentHours != null ? `${t.attendanceAbsentHours}h` : '—'}</td>
                <td>{t.attendanceLate ?? '—'}</td>
                <td>{t.commendations ?? '—'}</td>
                <td>{t.warnings ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Subject breakdown */}
        <div className="ar-section-title" style={{ marginTop: '1rem' }}>Moyennes par matière</div>
        <table className="ar-subject-table">
          <thead>
            <tr>
              <th className="ar-subject-table__name">Matière</th>
              <th className="ar-subject-table__coef">Coef</th>
              {terms.map((t) => (
                <th key={t.termNumber}>{t.termName.replace('Trimestre', 'T').replace('Semestre', 'S')}</th>
              ))}
              <th className="ar-subject-table__annual">Moy. Annuelle</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.nameFr}>
                <td className="ar-subject-table__name">{s.nameFr}</td>
                <td className="ar-subject-table__coef">{s.coefficient}</td>
                {s.termAverages.map((avg, i) => (
                  <td key={i} className={(avg ?? 0) < s.passMark ? 'ar-fail' : ''}>{fmt(avg)}</td>
                ))}
                <td className={`ar-subject-table__annual ${(s.annualAverage ?? 0) < s.passMark ? 'ar-fail' : 'ar-pass'}`}>
                  {fmt(s.annualAverage)}
                </td>
              </tr>
            ))}
            <tr className="ar-subject-table__total">
              <td>TOTAUX / MOYENNES</td>
              <td>{totalCoef}</td>
              {terms.map((t) => (
                <td key={t.termNumber} className={(t.overallAverage ?? 0) >= 10 ? 'ar-pass' : 'ar-fail'}>
                  {fmt(t.overallAverage)}
                </td>
              ))}
              <td className={`ar-subject-table__annual ${isPass ? 'ar-pass' : 'ar-fail'}`}>
                {fmt(annualAverage)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Annual result */}
        <div className="ar-result-band">
          <div className="ar-result-band__cell ar-result-band__cell--big">
            <label>Moyenne Annuelle</label>
            <strong className={isPass ? 'ar-pass' : 'ar-fail'}>{fmt(annualAverage)}<span className="ar-denom"> / 20</span></strong>
          </div>
          <div className="ar-result-band__cell">
            <label>Mention</label>
            <strong>{mention ?? '—'}</strong>
          </div>
          <div className={`ar-result-band__cell ar-result-band__cell--decision ${isPass ? 'ar-decision--pass' : 'ar-decision--fail'}`}>
            <label>Décision du Conseil</label>
            <strong>{councilDecision ?? '—'}</strong>
          </div>
        </div>

        {/* Comments per term */}
        {terms.some((t) => t.teacherComment || t.principalComment) && (
          <div className="ar-comments">
            {terms.map((t) => (t.teacherComment || t.principalComment) && (
              <div key={t.termNumber} className="ar-comment-block">
                <div className="ar-comment-block__term">{t.termName}</div>
                {t.teacherComment && (
                  <div className="ar-comment-block__line">
                    <span>Prof. principal :</span> « {t.teacherComment} »
                  </div>
                )}
                {t.principalComment && (
                  <div className="ar-comment-block__line">
                    <span>Direction :</span> « {t.principalComment} »
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Signatures */}
        <div className="ar-signatures">
          <div className="ar-sig">
            <div className="ar-sig__area" />
            <div className="ar-sig__line" />
            <div className="ar-sig__label">Le Directeur</div>
          </div>
          <div className="ar-sig ar-sig--stamp">
            <div className="ar-sig__area ar-sig__area--stamp" />
            <div className="ar-sig__label">Cachet de l'établissement</div>
          </div>
          <div className="ar-sig">
            <div className="ar-sig__area" />
            <div className="ar-sig__line" />
            <div className="ar-sig__label">Signature du parent</div>
          </div>
        </div>

        {/* Footer */}
        <div className="ar-footer">
          <span>Généré le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}{institution?.name ? ` — ${institution.name}` : ''}</span>
        </div>
      </div>
    </div>
  );
}
