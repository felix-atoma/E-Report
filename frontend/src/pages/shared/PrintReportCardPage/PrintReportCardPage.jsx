import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsService } from '../../../services/reportsService';
import { institutionsService } from '../../../services/institutionsService';
import { gradesService } from '../../../services/gradesService';
import Loading from '../../../components/common/Loading/Loading';
import PrintFormatPicker from '../../../components/common/PrintFormatPicker/PrintFormatPicker';
import './PrintReportCardPage.css';

const CONDUCT_LABELS = {
  TRES_BIEN: 'Très Bien', BIEN: 'Bien', PASSABLE: 'Passable', MEDIOCRE: 'Médiocre',
};

function fmt(v) {
  if (v == null) return '—';
  return Number(v).toFixed(2).replace('.', ',');
}

function fallbackSerial(report) {
  if (!report) return null;
  const ay = (report.academicYear ?? '').replace('-', '').slice(-4);
  const id = (report.id ?? '').replace(/-/g, '').toUpperCase().slice(0, 8);
  return `${ay}T${report.termNumber ?? 1}-${id.slice(0,4)}-${id.slice(4,8)}`;
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
    if (!report) return;
    const name = report.student?.user?.name ?? report.student?.admissionNumber ?? 'Bulletin';
    const term = report.termName ?? `Trimestre ${report.termNumber}`;
    const prev = document.title;
    document.title = `${name} - ${term} ${report.academicYear ?? ''}`.trim();
    return () => { document.title = prev; };
  }, [report]);

  useEffect(() => {
    if (!institution) return;
    const branding = institution.brandingSettings ?? {};
    const primary   = branding.primaryColor  || '#1e3a8a';
    const secondary = branding.secondaryColor || '#f59e0b';
    const fontName  = (branding.bulletinFontFamily || 'Arial').trim();
    const fontSize  = branding.bulletinFontSize || '10px';

    // Load from Google Fonts if not a known system font
    const SYSTEM_FONTS = new Set([
      'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Georgia', 'Garamond',
      'Palatino Linotype', 'Palatino', 'Trebuchet MS', 'Verdana', 'Geneva',
      'Courier New', 'Courier', 'Impact', 'Comic Sans MS',
    ]);
    if (!SYSTEM_FONTS.has(fontName)) {
      const linkId = `gf-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;700&display=swap`;
        document.head.appendChild(link);
      }
    }

    const fontFamilyCss = `'${fontName}', sans-serif`;
    const h1Size   = branding.bulletinH1Size   || '1.3em';
    const h1Weight = branding.bulletinH1Weight || '900';
    const h2Size   = branding.bulletinH2Size   || '1.1em';
    const h2Weight = branding.bulletinH2Weight || '900';
    const h3Size   = branding.bulletinH3Size   || '0.8em';
    const h3Weight = branding.bulletinH3Weight || '800';
    const el = document.createElement('style');
    el.id = 'bulletin-theme';
    el.textContent = `:root {
      --bulletin-primary: ${primary};
      --bulletin-secondary: ${secondary};
      --bulletin-font-family: ${fontFamilyCss};
      --bulletin-font-size: ${fontSize};
      --bulletin-h1-size: ${h1Size};
      --bulletin-h1-weight: ${h1Weight};
      --bulletin-h2-size: ${h2Size};
      --bulletin-h2-weight: ${h2Weight};
      --bulletin-h3-size: ${h3Size};
      --bulletin-h3-weight: ${h3Weight};
    }`;
    document.head.appendChild(el);
    return () => el.remove();
  }, [institution]);

  if (loadingReport || loadingInst) {
    return <div className="print-page__loading"><Loading /></div>;
  }

  if (!report) {
    return <div className="print-page__loading">Bulletin introuvable.</div>;
  }

  const grades = [...(report.grades ?? [])].sort((a, b) => (b.coefficient ?? 0) - (a.coefficient ?? 0));
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
      {/* Toolbar — hidden on print */}
      <div className="print-page__toolbar no-print">
        <PrintFormatPicker defaultFormat="A4 portrait" />
        <button className="print-page__btn print-page__btn--print" onClick={() => window.print()}>
          🖨️ Imprimer / Enregistrer PDF
        </button>
        <button className="print-page__btn print-page__btn--close" onClick={() => window.close()}>
          ✕ Fermer
        </button>
      </div>

      {/* A4 page */}
      <div className="print-page__a4">

        {/* ── Full-page watermark — SVG stretches name to fixed width ─────── */}
        {institution?.name && (
          <svg className="pr-watermark" aria-hidden="true" viewBox="0 0 700 110" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
            <text
              x="350" y="82"
              textAnchor="middle"
              textLength="680"
              lengthAdjust="spacingAndGlyphs"
              className="pr-watermark__text"
            >
              {institution.name.toUpperCase()}
            </text>
          </svg>
        )}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="pr-header">
          {institution?.logo
            ? <img src={institution.logo} alt="Logo" className="pr-header__logo" />
            : <div className="pr-header__logo-placeholder" />}
          <div className="pr-header__center">
            {(institution?.country || institution?.countryMotto) && (
              <div className="pr-header__country">
                {institution.country ?? ''}
                {institution.country && institution.countryMotto ? ' — ' : ''}
                {institution.countryMotto ?? ''}
              </div>
            )}
            <div className="pr-header__school">{institution?.name ?? 'Établissement scolaire'}</div>
            {institution?.brandingSettings?.circonscription && (
              <div className="pr-header__circ">
                {institution.brandingSettings.circonscription}
              </div>
            )}
            {institution?.address && <div className="pr-header__sub">{institution.address}</div>}
            {institution?.motto && <div className="pr-header__motto">« {institution.motto} »</div>}
          </div>
          {institution?.crest
            ? <img src={institution.crest} alt="Crest" className="pr-header__crest" />
            : <div className="pr-header__logo-placeholder" />}
        </div>

        {/* ── Title bar ──────────────────────────────────────────────────── */}
        <div className="pr-title">
          <span>BULLETIN DE NOTES — {termLabel.toUpperCase()} — ANNÉE SCOLAIRE {report.academicYear}</span>
          <span className="pr-title__serial">
            N° {report.securityCode ?? fallbackSerial(report)}
          </span>
        </div>

        {/* ── Student band + photo (photo sits outside the band box) ──────── */}
        <div className="pr-student-row">
          <div className="pr-student-band">
            <div className="pr-student-band__field pr-student-band__field--name">
              <label>Nom et Prénom</label>
              <span>{studentName}</span>
            </div>
            <div className="pr-student-band__field">
              <label>Classe</label>
              <span>{report.class?.name ?? '—'}</span>
            </div>
            <div className="pr-student-band__field">
              <label>Matricule</label>
              <span>{report.student?.admissionNumber ?? '—'}</span>
            </div>
            <div className="pr-student-band__field">
              <label>Date de naissance</label>
              <span>{dob}</span>
            </div>
            <div className="pr-student-band__field">
              <label>Effectif classe</label>
              <span>{report.classSize ?? '—'}</span>
            </div>
          </div>

          {/* Photo — sits beside the band, not inside it */}
          <div className="pr-student-photo">
            <span className="pr-student-photo__label">Photo</span>
            {report.student?.user?.profileImage ? (
              <img src={report.student.user.profileImage} alt="Photo élève" className="pr-student-photo__img" />
            ) : (
              <div className="pr-student-photo__placeholder">
                <svg viewBox="0 0 52 66" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="52" height="66" rx="2" fill="#f1f5f9"/>
                  <circle cx="26" cy="24" r="11" fill="#cbd5e1"/>
                  <path d="M2 62c0-13.255 10.745-24 24-24s24 10.745 24 24" fill="#cbd5e1"/>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* ── Grades table ───────────────────────────────────────────────── */}
        <div className="pr-grades-wrap">
          <table className="pr-grades">
            <thead>
              <tr className="pr-grades__head-top">
                <th rowSpan={2} className="pr-grades__col-matiere">Matière</th>
                <th colSpan={2} className="pr-grades__group">Interrogations</th>
                <th rowSpan={2} className="pr-grades__col-dev">Devoir</th>
                <th rowSpan={2} className="pr-grades__col-cmp">Compo.</th>
                <th rowSpan={2} className="pr-grades__col-moy">Moy.</th>
                <th rowSpan={2} className="pr-grades__col-coef">Coef</th>
                <th rowSpan={2} className="pr-grades__col-pts">Points</th>
                <th rowSpan={2} className="pr-grades__col-rang">Rang</th>
                <th rowSpan={2} className="pr-grades__col-appr">Appréciation</th>
                <th rowSpan={2} className="pr-grades__col-prof">Nom du prof.</th>
                <th rowSpan={2} className="pr-grades__col-sig">Signature</th>
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
                    <td>{fmtNote(g.noteInterro1)}</td>
                    <td>{fmtNote(g.noteInterro2)}</td>
                    <td className="pr-grades__col-dev">{fmtNote(g.noteDevoir)}</td>
                    <td className="pr-grades__col-cmp">{fmtNote(g.noteComposition)}</td>
                    <td className={`pr-grades__col-moy${fail ? ' pr-grades__fail' : ' pr-grades__pass'}`}>
                      {fmt(moy)}
                    </td>
                    <td>{g.coefficient ?? '—'}</td>
                    <td className="pr-grades__col-pts">{fmt(g.weightedScore)}</td>
                    <td className="pr-grades__col-rang">{g.rangMatiere ?? '—'}</td>
                    <td className="pr-grades__col-appr">{g.appreciation ?? '—'}</td>
                    <td className="pr-grades__col-prof">{g.teacherName ?? '—'}</td>
                    <td className="pr-grades__col-sig">
                      {fiche?.isSigned ? (
                        isAdminVerified ? (
                          <span className="pr-sig-verified">✓</span>
                        ) : fiche.signatureData ? (
                          <img src={fiche.signatureData} alt="" className="pr-sig-img" />
                        ) : <div className="pr-sig-blank" />
                      ) : <div className="pr-sig-blank" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="pr-grades__foot">
                <td colSpan={6} className="pr-grades__foot-label">TOTAUX</td>
                <td>{totalCoef}</td>
                <td>{fmt(totalPoints)}</td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Results band ───────────────────────────────────────────────── */}
        <div className="pr-results">
          {/* Student result */}
          <div className="pr-results__section pr-results__section--student">
            <div className="pr-results__section-title">Résultats de l'élève</div>
            <div className="pr-results__cells">
              <div className="pr-results__cell pr-results__cell--big">
                <label>Moyenne Générale</label>
                <strong className={report.overallAverage >= 10 ? 'pr-val--pass' : 'pr-val--fail'}>
                  {fmt(report.overallAverage)}<span className="pr-val-denom"> / 20</span>
                </strong>
              </div>
              <div className="pr-results__cell">
                <label>Mention</label>
                <strong>{report.mention ?? '—'}</strong>
              </div>
              <div className="pr-results__cell">
                <label>Rang</label>
                <strong>{report.classRank ?? '—'}<span className="pr-val-denom"> / {report.classSize ?? '—'}</span></strong>
              </div>
              <div className="pr-results__cell">
                <label>Conduite</label>
                <strong>{report.conductRating ? CONDUCT_LABELS[report.conductRating] : '—'}</strong>
              </div>
              <div className="pr-results__cell">
                <label>Heures d'absence</label>
                <strong>{report.attendanceAbsentHours != null ? `${report.attendanceAbsentHours} h` : '—'}</strong>
              </div>
              <div className="pr-results__cell">
                <label>Retards</label>
                <strong>{report.attendanceLate != null ? report.attendanceLate : '—'}</strong>
              </div>
              {report.honorCouncil && (
                <div className="pr-results__cell pr-results__cell--honor">
                  <strong>🏆 Tableau d'honneur</strong>
                </div>
              )}
            </div>
          </div>
          {/* Class stats */}
          <div className="pr-results__section pr-results__section--class">
            <div className="pr-results__section-title">Statistiques de la classe</div>
            <div className="pr-results__cells">
              <div className="pr-results__cell">
                <label>Moy. de la classe</label>
                <strong>{fmt(report.classAverage)}</strong>
              </div>
              <div className="pr-results__cell pr-results__cell--high">
                <label>Plus forte moy.</label>
                <strong>{fmt(report.classHighest)}</strong>
              </div>
              <div className="pr-results__cell pr-results__cell--low">
                <label>Plus faible moy.</label>
                <strong>{fmt(report.classLowest)}</strong>
              </div>
              <div className="pr-results__cell">
                <label>Effectif</label>
                <strong>{report.classSize ?? '—'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ── Annual average + council decision (last term only) ─────────── */}
        {report.annualAverage != null && (
          <div className="pr-annual-bar">
            <div className="pr-annual-bar__cell">
              <label>Moyenne Annuelle</label>
              <strong className={report.annualAverage >= 10 ? 'pr-val--pass' : 'pr-val--fail'}>
                {fmt(report.annualAverage)}<span className="pr-val-denom"> / 20</span>
              </strong>
            </div>
            <div className="pr-annual-bar__decision">
              <label>Décision du Conseil</label>
              <strong className={report.annualAverage >= 10 ? 'pr-val--pass' : 'pr-val--fail'}>
                {report.councilDecision ?? '—'}
              </strong>
            </div>
          </div>
        )}

        {/* ── Comments ───────────────────────────────────────────────────── */}
        <div className="pr-comments">
          <div className="pr-comment-box">
            <div className="pr-comment-box__label">Appréciations du Professeur Principal</div>
            <div className="pr-comment-box__text">
              {report.teacherComment ? `« ${report.teacherComment} »` : <span className="pr-comment-box__empty">&nbsp;</span>}
            </div>
          </div>
          <div className="pr-comment-box">
            <div className="pr-comment-box__label">Appréciations de la Direction</div>
            <div className="pr-comment-box__text">
              {report.principalComment ? `« ${report.principalComment} »` : <span className="pr-comment-box__empty">&nbsp;</span>}
            </div>
          </div>
        </div>

        {/* ── Signature row ──────────────────────────────────────────────── */}
        <div className="pr-signatures">
          <div className="pr-sig">
            <div className="pr-sig__area" />
            <div className="pr-sig__line" />
            <div className="pr-sig__name">{report.class?.teacher?.name ?? report.createdBy?.name ?? ''}</div>
            <div className="pr-sig__label">Le Professeur Principal</div>
          </div>
          <div className="pr-sig pr-sig--stamp">
            <div className="pr-sig__area pr-sig__area--stamp" />
            <div className="pr-sig__label pr-sig__label--stamp">Cachet de l'établissement</div>
          </div>
          <div className="pr-sig">
            <div className="pr-sig__area" />
            <div className="pr-sig__line" />
            <div className="pr-sig__name">{institution?.name ? `Direction — ${institution.name}` : 'Le Directeur'}</div>
            <div className="pr-sig__label">Le Directeur</div>
          </div>
          <div className="pr-sig pr-sig--visa">
            <div className="pr-sig__area" />
            <div className="pr-sig__line" />
            <div className="pr-sig__date">Vu le : ___ / ___ / ______</div>
            <div className="pr-sig__label">Visa des Parents</div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="pr-footer">
          <span>
            Généré le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            {institution?.name ? ` — ${institution.name}` : ''}
          </span>
          <span className="pr-footer__security">
            N° Série : <strong>{report.securityCode ?? fallbackSerial(report)}</strong>
            {' '}· Vérifier sur{' '}
            <span className="pr-footer__verify-url">{window.location.origin}/verify</span>
          </span>
        </div>

      </div>
    </div>
  );
}
