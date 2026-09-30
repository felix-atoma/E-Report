import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
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

const ICONS = {
  phone: <svg viewBox="0 0 24 24"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>,
  pin:   <svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>,
  mail:  <svg viewBox="0 0 24 24"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z"/></svg>,
  star:  <svg viewBox="0 0 24 24"><path d="M12 17.3 18.2 21l-1.6-7L22 9.2l-7.2-.6L12 2 9.2 8.6 2 9.2 7.5 14l-1.7 7z"/></svg>,
  user:  <svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.3 0-9 2.2-9 5v3h18v-3c0-2.8-4.7-5-9-5z"/></svg>,
};

// Filigrane — même logique que buildWatermark() côté PDF (backend/src/modules/pdf/pdf.service.ts)
function buildWatermark(name) {
  const text = (name ?? '').trim().toUpperCase();
  if (!text) return null;
  let lines = [text];
  if (text.length > 24 && text.includes(' ')) {
    const words = text.split(/\s+/);
    let best = { diff: Infinity, i: 1 };
    for (let i = 1; i < words.length; i++) {
      const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
      if (diff < best.diff) best = { diff, i };
    }
    lines = [words.slice(0, best.i).join(' '), words.slice(best.i).join(' ')];
  }
  const longest = Math.max(...lines.map((l) => l.length));
  const fontSize = Math.round(Math.min(120, Math.max(34, 680 / (longest * 0.72))));
  const lineHeight = Math.round(fontSize * 1.1);
  return {
    height: lineHeight * lines.length + Math.round(fontSize * 0.3),
    fontSize,
    lines: lines.map((t, i) => ({
      text: t,
      y: Math.round(fontSize * 0.95) + i * lineHeight,
      fit: t.length * fontSize * 0.72 > 600,
    })),
  };
}

function fallbackSerial(report) {
  if (!report) return null;
  const ay = (report.academicYear ?? '').replace('-', '').slice(-4);
  const id = (report.id ?? '').replace(/-/g, '').toUpperCase().slice(0, 8);
  return `${ay}T${report.termNumber ?? 1}-${id.slice(0,4)}-${id.slice(4,8)}`;
}
// Minutes → heures, une décimale, virgule française (90 → "1,5")
function fmtHours(minutes) {
  return String(Math.round((minutes / 60) * 10) / 10).replace('.', ',');
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

  // QR code de vérification — même contenu que sur le PDF (le code de sécurité du bulletin)
  const [qrDataUri, setQrDataUri] = useState(null);
  useEffect(() => {
    const code = report?.securityCode;
    if (!code) { setQrDataUri(null); return undefined; }
    let cancelled = false;
    QRCode.toDataURL(String(code), { margin: 0, width: 220, errorCorrectionLevel: 'M' })
      .then((uri) => { if (!cancelled) setQrDataUri(uri); })
      .catch(() => { if (!cancelled) setQrDataUri(null); });
    return () => { cancelled = true; };
  }, [report?.securityCode]);

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

  // Primaire (CI → CM2) : notes et moyennes affichées sur 10 (stockées sur 20), sans coefficients.
  // Même règle que isPrimaryLevel() côté PDF (backend/src/modules/pdf/pdf.service.ts).
  const isPrimary = /^\s*(CI|CP\s*[12]?|CE\s*[12]|CM\s*[12])\s*$/i.test(report.class?.level ?? '');
  const denom = isPrimary ? 10 : 20;
  const fmtS = (v) => (v == null ? '—' : fmt(isPrimary ? v / 2 : v));
  const gradedMoys = grades.map((g) => g.moyenneMatiere ?? g.score).filter((m) => m != null);
  const primaryTotal = gradedMoys.reduce((s, m) => s + m / 2, 0);
  const primaryTotalMax = gradedMoys.length * 10;
  const absences = report.attendanceDays != null && report.attendancePresent != null
    ? report.attendanceDays - report.attendancePresent
    : null;

  const studentName = report.student?.user?.name ?? report.student?.admissionNumber ?? '—';
  const dob = report.student?.dateOfBirth
    ? new Date(report.student.dateOfBirth).toLocaleDateString('fr-FR')
    : '—';
  const termLabel = report.termName ?? `Trimestre ${report.termNumber}`;

  const watermark = buildWatermark(institution?.name);
  const countryLine = [institution?.country, institution?.countryMotto].filter(Boolean).join(' — ');
  const circonscription = institution?.brandingSettings?.circonscription ?? null;
  const headerLogo = institution?.logo || institution?.crest || null;
  const sex = report.student?.sex;
  const sexLabel = sex === 'F' ? 'Féminin' : sex === 'M' ? 'Masculin' : '—';
  const rankLabel = report.classRank != null
    ? (report.classRank === 1 ? (sex === 'F' ? '1ère' : '1er') : `${report.classRank}e`)
    : null;

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
        {watermark && (
          <svg className="pr-watermark" aria-hidden="true" viewBox={`0 0 700 ${watermark.height}`} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
            {watermark.lines.map((line) => (
              <text
                key={line.y}
                x="350" y={line.y}
                textAnchor="middle"
                fontSize={watermark.fontSize}
                className="pr-watermark__text"
                {...(line.fit ? { textLength: 680, lengthAdjust: 'spacingAndGlyphs' } : {})}
              >
                {line.text}
              </text>
            ))}
          </svg>
        )}

        {/* ── En-tête (même modèle que le PDF) ─────────────────────────── */}
        <div className="prh">
          {(countryLine || circonscription) && (
            <div className="prh__country">
              <span>{countryLine}</span>
              {circonscription && <span>{circonscription}</span>}
            </div>
          )}
          <div className="prh__name">{institution?.name ?? 'Établissement scolaire'}</div>
          <div className="prh__body">
            {headerLogo && <img src={headerLogo} alt="Logo" className="prh__logo" />}
            <ul className="prh__contacts">
              {institution?.phone && <li><span className="prh__ico">{ICONS.phone}</span>{institution.phone}</li>}
              {institution?.address && <li><span className="prh__ico">{ICONS.pin}</span>{institution.address}</li>}
              {institution?.email && <li><span className="prh__ico">{ICONS.mail}</span>{institution.email}</li>}
              {institution?.motto && (
                <li><span className="prh__ico">{ICONS.star}</span><span className="prh__motto">{institution.motto}</span></li>
              )}
            </ul>
            <div className="prh__verify">
              {qrDataUri && <img src={qrDataUri} alt="Code de vérification" className="prh__qr" />}
              <div className="prh__serial">N° {report.securityCode ?? fallbackSerial(report)}</div>
            </div>
            <div className="prh__photo">
              {report.student?.user?.profileImage
                ? <img src={report.student.user.profileImage} alt="Photo élève" />
                : ICONS.user}
            </div>
          </div>
        </div>

        <div className="prh__banner">
          BULLETIN DE NOTES — <span className="prh__banner-term">{termLabel}</span>
        </div>

        <table className="prh__info">
          <tbody>
            <tr>
              <td className="prh__lbl">Nom et prénoms</td><td className="prh__sep">:</td><td className="prh__val">{studentName}</td>
              <td className="prh__lbl">N° Matricule</td><td className="prh__sep">:</td><td className="prh__val">{report.student?.admissionNumber ?? '—'}</td>
            </tr>
            <tr>
              <td className="prh__lbl">Sexe</td><td className="prh__sep">:</td><td className="prh__val">{sexLabel}</td>
              <td className="prh__lbl">Date de naissance</td><td className="prh__sep">:</td><td className="prh__val">{dob}</td>
            </tr>
            <tr>
              <td className="prh__lbl">Classe</td><td className="prh__sep">:</td><td className="prh__val">{report.class?.name ?? '—'}</td>
              <td className="prh__lbl">Effectif</td><td className="prh__sep">:</td><td className="prh__val">{report.classSize ? `${report.classSize} élèves` : '—'}</td>
            </tr>
            <tr>
              <td className="prh__lbl">Rang</td><td className="prh__sep">:</td>
              <td className="prh__val prh__val--strong">{rankLabel ? `${rankLabel}${report.classSize ? ` / ${report.classSize}` : ''}` : '—'}</td>
              <td className="prh__lbl">Année scolaire</td><td className="prh__sep">:</td><td className="prh__val">{report.academicYear ?? '—'}</td>
            </tr>
            <tr>
              <td className="prh__lbl">Moyenne générale</td><td className="prh__sep">:</td>
              <td className={`prh__val prh__val--strong${report.overallAverage != null && report.overallAverage < 10 ? ' prh__val--fail' : ''}`}>
                {report.overallAverage != null ? `${fmtS(report.overallAverage)} / ${denom}` : '—'}
              </td>
              <td className="prh__lbl">Période</td><td className="prh__sep">:</td><td className="prh__val">{termLabel}</td>
            </tr>
            <tr>
              <td className="prh__lbl">Mention</td><td className="prh__sep">:</td><td className="prh__val">{report.mention ?? '—'}</td>
              <td className="prh__lbl">Conduite</td><td className="prh__sep">:</td>
              <td className="prh__val">{report.conductRating ? CONDUCT_LABELS[report.conductRating] : '—'}</td>
            </tr>
          </tbody>
        </table>

        {/* ── Grades table ───────────────────────────────────────────────── */}
        <div className="pr-grades-wrap">
          {isPrimary ? (
          <table className="pr-grades pr-grades--primary">
            <thead>
              <tr className="pr-grades__head-top">
                <th className="pr-grades__col-num">N°</th>
                <th className="pr-grades__col-matiere">Matière</th>
                <th className="pr-grades__col-moy">Note / 10</th>
                <th className="pr-grades__col-rang">Rang</th>
                <th className="pr-grades__col-appr">Appréciation</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g, i) => {
                const moy = g.moyenneMatiere ?? g.score;
                const fail = moy != null && moy < (g.subject?.passMark ?? 10);
                return (
                  <tr key={g.subjectId ?? g.id}>
                    <td className="pr-grades__col-num">{i + 1}</td>
                    <td className="pr-grades__col-matiere">{g.subject?.nameFr ?? '—'}</td>
                    <td className={`pr-grades__col-moy${fail ? ' pr-grades__fail' : ' pr-grades__pass'}`}>{fmtS(moy)}</td>
                    <td className="pr-grades__col-rang">{g.rangMatiere ?? '—'}</td>
                    <td className="pr-grades__col-appr">{g.appreciation ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="pr-grades__foot">
                <td colSpan={2} className="pr-grades__foot-label">TOTAL DES POINTS</td>
                <td>{fmt(primaryTotal)} / {primaryTotalMax}</td>
                <td className="pr-grades__foot-label">MOYENNE</td>
                <td>{fmtS(report.overallAverage)} / 10</td>
              </tr>
            </tfoot>
          </table>
          ) : (
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
          )}
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
                  {fmtS(report.overallAverage)}<span className="pr-val-denom"> / {denom}</span>
                </strong>
              </div>
              {isPrimary && (
                <div className="pr-results__cell">
                  <label>Total des points</label>
                  <strong>{fmt(primaryTotal)}<span className="pr-val-denom"> / {primaryTotalMax}</span></strong>
                </div>
              )}
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
                <label>Abs. non justifiées</label>
                <strong>{report.attendanceAbsent != null ? `${report.attendanceAbsent} j` : '—'}</strong>
              </div>
              <div className="pr-results__cell">
                <label>Abs. justifiées</label>
                <strong>{report.attendanceExcused != null ? `${report.attendanceExcused} j` : '—'}</strong>
              </div>
              <div className="pr-results__cell">
                <label>Retards</label>
                <strong>
                  {report.attendanceLateMinutes != null
                    ? `${fmtHours(report.attendanceLateMinutes)} h`
                    : report.attendanceLate != null ? report.attendanceLate : '—'}
                </strong>
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
                <strong>{fmtS(report.classAverage)}</strong>
              </div>
              <div className="pr-results__cell pr-results__cell--high">
                <label>Plus forte moy.</label>
                <strong>{fmtS(report.classHighest)}</strong>
              </div>
              <div className="pr-results__cell pr-results__cell--low">
                <label>Plus faible moy.</label>
                <strong>{fmtS(report.classLowest)}</strong>
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
                {fmtS(report.annualAverage)}<span className="pr-val-denom"> / {denom}</span>
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
