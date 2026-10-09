import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { reportsService } from '../../../services/reportsService';
import Loading from '../../../components/common/Loading/Loading';
import './AnnualReportPage.css';

function fmt(v) {
  if (v == null) return '—';
  return Number(v).toFixed(2).replace('.', ',');
}

const ADMIS = 'Admis(e) en classe supérieure';
const REDOUBLE = 'Redoublant(e)';

export default function AnnualReportPage() {
  const { studentId, academicYear } = useParams();
  const { t: translate } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const queryKey = ['annual-report', studentId, academicYear];
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => reportsService.getAnnualReport(studentId, academicYear).then((r) => r.data),
    enabled: !!studentId && !!academicYear,
  });

  const decisionMutation = useMutation({
    mutationFn: (decision) => reportsService.setCouncilDecision(studentId, academicYear, decision).then((r) => r.data),
    onSuccess: (updated) => {
      qc.setQueryData(queryKey, updated);
      setEditing(false);
      toast.success('Décision enregistrée');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? "Impossible d'enregistrer la décision"),
  });

  if (isLoading) return <div className="ar-loading"><Loading /></div>;
  if (error || !data) return <div className="ar-loading">Rapport annuel introuvable.</div>;

  const {
    student, class: cls, institution, terms, subjects, annualAverage, councilDecision, mention,
    isPrimary, termCount, isComplete, weighting, annualRank, annualClassSize,
    annualClassHighest, annualClassLowest, annualClassAverage,
    councilDecisionManual, proposedDecision, promotionThreshold, canEditDecision,
  } = data;
  const branding = institution?.brandingSettings ?? {};
  const primary = branding.primaryColor || '#1e3a8a';
  const secondary = branding.secondaryColor || '#f59e0b';

  // Moyennes stockées sur 20 ; le primaire les affiche sur 10 (comme ses bulletins trimestriels)
  const denom = isPrimary ? 10 : 20;
  const scaled = (v) => (v == null ? null : isPrimary ? v / 2 : v);
  const passes = (v20) => v20 != null && v20 >= (promotionThreshold ?? 10);
  const termNumbers = Array.from({ length: termCount ?? terms.length }, (_, i) => i + 1);
  const termByNumber = new Map(terms.map((t) => [t.termNumber, t]));
  const termShort = (n) => {
    const name = termByNumber.get(n)?.termName;
    return name ? name.replace('Trimestre', 'T').replace('Semestre', 'S') : `${data.termSystem === 'SEMESTRE' ? 'S' : 'T'}${n}`;
  };

  const totalCoef = subjects.reduce((s, g) => s + g.coefficient, 0);
  const isPass = passes(annualAverage);
  const rankLabel = annualRank != null ? `${annualRank}${annualRank === 1 ? (student.sex === 'F' ? 're' : 'er') : 'e'} / ${annualClassSize}` : '—';
  // Cachet numérique : réglage de l'école, une fois toutes les périodes publiées
  const digitalStamp = branding.stampMode === 'DIGITAL' && institution?.stamp && isComplete ? institution.stamp : null;

  const startEdit = () => { setDraft(councilDecision ?? ''); setEditing(true); };

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

      {!isComplete && (
        <div className="ar-notice no-print">
          Bulletin provisoire : toutes les périodes de l'année ne sont pas encore publiées. La moyenne, le rang et la
          décision seront définitifs après la publication de la dernière période.
        </div>
      )}

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
          <span>RELEVÉ ANNUEL — ANNÉE SCOLAIRE {academicYear}{!isComplete ? ' (PROVISOIRE)' : ''}</span>
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
                <td className={`ar-term-table__avg ${passes(t.overallAverage) ? 'ar-pass' : 'ar-fail'}`}>
                  {fmt(scaled(t.overallAverage))}
                </td>
                <td>{t.classRank ?? '—'}/{t.classSize ?? '—'}</td>
                <td>{t.mention ?? '—'}</td>
                <td>{t.conductRating ? translate(`conduct.${t.conductRating}`) : '—'}</td>
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
              <th className="ar-subject-table__coef">{isPrimary ? 'Sur' : 'Coef'}</th>
              {termNumbers.map((n) => <th key={n}>{termShort(n)}</th>)}
              <th className="ar-subject-table__annual">Moy. Annuelle</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => {
              // Note de matière sur son barème (/10 ou /20 au primaire, /20 sinon)
              const failing = (v) => v != null && v < s.max / 2;
              return (
                <tr key={s.nameFr}>
                  <td className="ar-subject-table__name">{s.nameFr}</td>
                  <td className="ar-subject-table__coef">{isPrimary ? s.max : s.coefficient}</td>
                  {s.termAverages.map((avg, i) => (
                    <td key={i} className={failing(avg) ? 'ar-fail' : ''}>{fmt(avg)}</td>
                  ))}
                  <td className={`ar-subject-table__annual ${failing(s.annualAverage) ? 'ar-fail' : 'ar-pass'}`}>
                    {fmt(s.annualAverage)}
                  </td>
                </tr>
              );
            })}
            <tr className="ar-subject-table__total">
              <td>MOYENNE GÉNÉRALE (/{denom})</td>
              <td>{isPrimary ? '' : totalCoef}</td>
              {termNumbers.map((n) => {
                const avg = termByNumber.get(n)?.overallAverage;
                return (
                  <td key={n} className={avg == null ? '' : passes(avg) ? 'ar-pass' : 'ar-fail'}>{fmt(scaled(avg))}</td>
                );
              })}
              <td className={`ar-subject-table__annual ${isPass ? 'ar-pass' : 'ar-fail'}`}>
                {fmt(scaled(annualAverage))}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Annual result */}
        <div className="ar-result-band">
          <div className="ar-result-band__cell ar-result-band__cell--big">
            <label>Moyenne Annuelle</label>
            <strong className={isPass ? 'ar-pass' : 'ar-fail'}>{fmt(scaled(annualAverage))}<span className="ar-denom"> / {denom}</span></strong>
          </div>
          <div className="ar-result-band__cell">
            <label>Rang annuel</label>
            <strong>{rankLabel}</strong>
          </div>
          <div className="ar-result-band__cell">
            <label>Mention</label>
            <strong>{mention ?? '—'}</strong>
          </div>
          <div className={`ar-result-band__cell ar-result-band__cell--decision ${councilDecision === REDOUBLE ? 'ar-decision--fail' : 'ar-decision--pass'}`}>
            <label>Décision du Conseil</label>
            {editing ? (
              <div className="ar-decision-edit no-print">
                <input
                  list="ar-decisions" value={draft} maxLength={200} autoFocus
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ex. Admis(e) en classe supérieure"
                />
                <datalist id="ar-decisions">
                  <option value={ADMIS} />
                  <option value={REDOUBLE} />
                  <option value="Admis(e) sous réserve" />
                  <option value="Exclu(e)" />
                </datalist>
                <div className="ar-decision-edit__actions">
                  <button type="button" className="ar-btn ar-btn--print" disabled={decisionMutation.isPending || !draft.trim()}
                    onClick={() => decisionMutation.mutate(draft)}>Enregistrer</button>
                  <button type="button" className="ar-btn ar-btn--close" onClick={() => setEditing(false)}>Annuler</button>
                </div>
              </div>
            ) : (
              <>
                <strong>{councilDecision ?? '—'}</strong>
                {canEditDecision && (
                  <span className="ar-decision-meta no-print">
                    {councilDecisionManual
                      ? <>Saisie par l'établissement · <button type="button" className="ar-link" disabled={decisionMutation.isPending} onClick={() => decisionMutation.mutate(null)}>revenir à la proposition ({proposedDecision ?? '—'})</button></>
                      : <>Proposée (seuil {fmt(scaled(promotionThreshold))}/{denom})</>}
                    {' · '}<button type="button" className="ar-link" onClick={startEdit}>modifier</button>
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {annualClassSize > 0 && (
          <div className="ar-class-stats">
            Classe : plus forte moyenne {fmt(scaled(annualClassHighest))} · plus faible {fmt(scaled(annualClassLowest))} · moyenne de la classe {fmt(scaled(annualClassAverage))}
            {weighting === 'LAST_DOUBLE' && ` · Moyenne annuelle : la ${termNumbers.length === 2 ? '2e période' : '3e période'} compte double`}
          </div>
        )}

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
            <div className={`ar-sig__area ar-sig__area--stamp${digitalStamp ? ' ar-sig__area--stamped' : ''}`} />
            {digitalStamp && <img className="ar-sig__stamp-img" src={digitalStamp} alt="Cachet de l'établissement" />}
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
