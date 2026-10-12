import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mockExamsService } from '../../../services/mockExamsService';
import PrintFormatPicker from '../../../components/common/PrintFormatPicker/PrintFormatPicker';
import { fmtSessionDates } from '../../../utils/fmtSessionDates';
import { examScale, isNonExamType, isCaType, fmtAvg } from '../../../utils/examKinds';
import './MockExamPalmaresPage.css';

const TYPE_LABELS = {
  BLANC: 'Examen Blanc',
  CEPE:  'C.E.P.E Blanc',
  BEPC:  'B.E.P.C Blanc',
  BAC1:  'Baccalauréat — Première Partie',
  BAC2:  'Baccalauréat — Deuxième Partie',
  DEVOIR_SURVEILLE: 'Devoir surveillé',
  COMPOSITION_MENSUELLE: 'Composition mensuelle',
  COMPOSITION_ANGLAIS: "Composition d'anglais",
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function MockExamPalmaresPage() {
  const { id } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['mock-exam-palmares', id],
    queryFn: () => mockExamsService.getPalmares(id).then((r) => r.data),
  });

  if (isLoading) return <div className="mpal-loading">Chargement...</div>;
  if (isError || !data) return (
    <div className="mpal-screen-error">Impossible de charger le palmarès.</div>
  );

  const { institution, exam, subjects, students, summary } = data;
  const totalCoeff = subjects.reduce((s, subj) => s + subj.coefficient, 0);
  const isBac = exam.examType === 'BAC1' || exam.examType === 'BAC2';
  // Devoir surveillé / composition mensuelle : pas d'« admis / ajourné » (ce ne sont pas des examens)
  const isDs = isNonExamType(exam.examType);
  const scale = examScale(exam.examType); // 10 pour les compositions mensuelles
  const pass = scale / 2;
  // Composition d'anglais : palmarès entièrement en anglais (décimales avec un point)
  const en = isCaType(exam.examType);
  const T = en ? {
    back: '← Back', titleBar: 'Results', print: '🖨 Print', title: 'RESULTS', type: 'English Test',
    className: 'Class', year: 'School year', coefTotal: 'Total coef.', rank: 'Position', name: 'Full name',
    adm: 'Adm.', total: 'Total', pts: 'Pts', avg: 'Avg.', mention: 'Remark', result: 'Result',
    passed: 'PASSED', below: 'BELOW AVERAGE', size: 'Total pupils', reached: `Average ≥ ${pass}%`,
    belowCount: 'Below average', rate: 'Pass rate', unranked: 'Not ranked', podium: 'Overall ranking',
    head: 'Head Teacher', headSign: 'Signature and stamp', jury: 'Class Teacher', sign: 'Signature',
  } : {
    back: '← Retour', titleBar: 'Proclamation des résultats', print: '🖨 Imprimer', title: 'PROCLAMATION DES RÉSULTATS',
    type: TYPE_LABELS[exam.examType] ?? exam.examType,
    className: 'Classe', year: 'Année scolaire', coefTotal: 'Coeff. total', rank: 'Rang', name: 'Nom et Prénoms',
    adm: 'Matr.', total: 'Total', pts: 'Pts', avg: 'Moy.', mention: 'Mention', result: 'Résultat',
    passed: 'MOYENNE ATTEINTE', below: 'SOUS LA MOYENNE', size: 'Effectif total', reached: isDs ? `Moyenne ≥ ${pass}` : `Admis(e)s ≥${pass}`,
    belowCount: isDs ? 'Sous la moyenne' : 'Ajournés', rate: 'Taux de réussite', unranked: 'Non classés', podium: 'Classement général',
    head: 'Le Directeur / La Directrice', headSign: 'Signature et cachet', jury: 'Jury / Responsable pédagogique', sign: 'Signature',
  };
  const num = (v) => (en ? v.toFixed(2) : v.toFixed(2).replace('.', ','));
  const ordinal = (r) => (en
    ? `${r}${(r % 100 >= 11 && r % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[r % 10] ?? 'th'}`
    : r === 1 ? '1er' : `${r}e`);

  function getResult(avg, sex) {
    const f = sex === 'F';
    if (avg == null) return { label: '—', cls: '' };
    if (isDs) {
      return avg >= pass
        ? { label: T.passed, cls: 'mpal-td--pass' }
        : { label: T.below, cls: 'mpal-td--fail' };
    }
    if (avg >= pass) return { label: f ? 'ADMISE' : 'ADMIS', cls: 'mpal-td--pass' };
    if (isBac && avg >= 9) return { label: 'ADMISSIBLE', cls: 'mpal-td--admis' };
    return { label: f ? 'AJOURNÉE' : 'AJOURNÉ', cls: 'mpal-td--fail' };
  }

  return (
    <div className="mpal-page">
      {/* Screen toolbar */}
      <div className="mpal-toolbar no-print">
        <Link to="#" onClick={() => history.back()} className="mpal-toolbar__back">{T.back}</Link>
        <div className="mpal-toolbar__center">
          <span className="mpal-toolbar__title">{T.titleBar} — {exam.label}</span>
        </div>
        <PrintFormatPicker defaultFormat="A4 landscape" />
        <button className="mpal-print-btn" onClick={() => window.print()}>
          {T.print}
        </button>
      </div>

      {/* Main card */}
      <div className="mpal-card">

        {/* Header */}
        <div className="mpal-header">
          <div className="mpal-header__left">
            {institution.logo && (
              <img src={institution.logo} alt="logo" className="mpal-logo" />
            )}
            <div>
              {institution.circonscription && (
                <div className="mpal-circ">{institution.circonscription}</div>
              )}
              <div className="mpal-school-name">{institution.name}</div>
              {institution.address && (
                <div className="mpal-school-addr">{institution.address}</div>
              )}
            </div>
          </div>
          <div className="mpal-header__right">
            <div className="mpal-doc-title">{T.title}</div>
            <div className="mpal-exam-type">{T.type}</div>
            <div className="mpal-exam-label">{exam.label}</div>
            <div className="mpal-exam-meta">
              <span>{T.className} : <strong>{exam.class?.name}</strong></span>
              <span>{T.year} : <strong>{exam.academicYear}</strong></span>
              <span>{T.coefTotal} : <strong>{totalCoeff}</strong></span>
            </div>
            {fmtSessionDates(exam.examDate, exam.examEndDate) && (
              <div className="mpal-exam-date">{fmtSessionDates(exam.examDate, exam.examEndDate)}</div>
            )}
          </div>
        </div>

        <div className="mpal-divider" />

        {/* Wide results table */}
        <div className="mpal-table-wrap">
          <table className="mpal-table">
            <thead>
              <tr>
                <th className="mpal-th mpal-th--rank" rowSpan={2}>{T.rank}</th>
                <th className="mpal-th mpal-th--name" rowSpan={2}>{T.name}</th>
                <th className="mpal-th mpal-th--num" rowSpan={2}>{T.adm}</th>
                {subjects.map((subj) => (
                  <th key={subj.id} className="mpal-th mpal-th--subj">
                    {subj.nameFr}
                  </th>
                ))}
                <th className="mpal-th mpal-th--total" rowSpan={2}>{T.total}<br />{T.pts}</th>
                <th className="mpal-th mpal-th--avg" rowSpan={2}>{T.avg}<br />{isCaType(exam.examType) ? '%' : `/${scale}`}</th>
                <th className="mpal-th mpal-th--mention" rowSpan={2}>{T.mention}</th>
                <th className="mpal-th mpal-th--result" rowSpan={2}>{T.result}</th>
              </tr>
              <tr>
                {subjects.map((subj) => (
                  <th key={`c-${subj.id}`} className="mpal-th mpal-th--coeff">
                    {/* Barème de la matière (compositions mensuelles : /10 ou /20) */}
                    /{subj.maxScore ?? scale} ×{subj.coefficient}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student, i) => {
                const gradeMap = new Map(student.grades.map((g) => [g.subjectId, g]));
                const result = getResult(student.average, student.sex);
                const rank = student.rank;
                const medalClass = rank === 1 ? ' mpal-row--gold' : rank === 2 ? ' mpal-row--silver' : rank === 3 ? ' mpal-row--bronze' : '';

                let totalPts = 0;
                subjects.forEach((subj) => {
                  const g = gradeMap.get(subj.id);
                  if (g?.score != null) totalPts += g.score * subj.coefficient;
                });

                return (
                  <tr
                    key={student.studentId}
                    className={`${i % 2 === 0 ? 'mpal-row' : 'mpal-row mpal-row--alt'}${medalClass}`}
                  >
                    <td className="mpal-td mpal-td--rank">
                      {rank != null ? (
                        <span className={`mpal-rank mpal-rank--${rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'default'}`}>
                          {rank === 1 ? `🥇 ${ordinal(1)}` : rank === 2 ? `🥈 ${ordinal(2)}` : rank === 3 ? `🥉 ${ordinal(3)}` : rank}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="mpal-td mpal-td--name">{student.studentName}</td>
                    <td className="mpal-td mpal-td--num">{student.admissionNumber}</td>

                    {subjects.map((subj) => {
                      const g = gradeMap.get(subj.id);
                      const score = g?.score ?? null;
                      const low = score != null && score < (subj.maxScore ?? scale) / 2;
                      return (
                        <td
                          key={subj.id}
                          className={`mpal-td mpal-td--score${low ? ' mpal-td--low' : ''}`}
                        >
                          {score != null ? num(score) : '—'}
                        </td>
                      );
                    })}

                    <td className="mpal-td mpal-td--total mpal-td--bold">
                      {totalPts > 0 ? num(totalPts) : '—'}
                    </td>
                    <td className={`mpal-td mpal-td--avg${result.cls ? ` ${result.cls}` : ''}`}>
                      {student.average != null ? num(student.average) : '—'}
                    </td>
                    <td className="mpal-td mpal-td--mention">
                      {student.appreciation || '—'}
                    </td>
                    <td className={`mpal-td mpal-td--result${result.cls ? ` ${result.cls}` : ''}`}>
                      {result.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary stats */}
        <div className="mpal-summary">
          <div className="mpal-summary__item">
            <span className="mpal-summary__label">{T.size}</span>
            <span className="mpal-summary__value">{summary.total}</span>
          </div>
          <div className="mpal-summary__item">
            <span className="mpal-summary__label">{T.reached}</span>
            <span className="mpal-summary__value mpal-summary__value--pass">{summary.admitted}</span>
          </div>
          {summary.isBac && (
            <div className="mpal-summary__item">
              <span className="mpal-summary__label">Admissibles ≥9</span>
              <span className="mpal-summary__value mpal-summary__value--admis">{summary.admissible}</span>
            </div>
          )}
          <div className="mpal-summary__item">
            <span className="mpal-summary__label">{T.belowCount}</span>
            <span className="mpal-summary__value mpal-summary__value--fail">{summary.ajourne ?? (summary.withGrades - summary.admitted)}</span>
          </div>
          <div className="mpal-summary__item">
            <span className="mpal-summary__label">{T.rate}</span>
            <span className="mpal-summary__value">{summary.passingRate}%</span>
          </div>
          <div className="mpal-summary__item">
            <span className="mpal-summary__label">{T.unranked}</span>
            <span className="mpal-summary__value">{summary.total - summary.withGrades}</span>
          </div>
        </div>

        {/* Classement — top students */}
        {(() => {
          const top = students.filter((s) => s.rank != null && s.rank <= 3)
            .sort((a, b) => (a.rank ?? 9) - (b.rank ?? 9));
          if (top.length === 0) return null;
          const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
          return (
            <div className="mpal-podium no-print">
              <div className="mpal-podium__title">{T.podium}</div>
              <div className="mpal-podium__list">
                {top.map((s) => (
                  <div key={s.studentId} className={`mpal-podium__item mpal-podium__item--${s.rank === 1 ? 'gold' : s.rank === 2 ? 'silver' : 'bronze'}`}>
                    <span className="mpal-podium__medal">{medals[s.rank]}</span>
                    <span className="mpal-podium__sname">{s.studentName}</span>
                    <span className="mpal-podium__avg">{en && s.average != null ? `${num(s.average)} %` : fmtAvg(s.average, exam.examType)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Signatures */}
        <div className="mpal-sigs">
          <div className="mpal-sig">
            <div className="mpal-sig__title">{T.head}</div>
            <div className="mpal-sig__space" />
            <div className="mpal-sig__name">{T.headSign}</div>
          </div>
          <div className="mpal-sig">
            <div className="mpal-sig__title">{T.jury}</div>
            <div className="mpal-sig__space" />
            <div className="mpal-sig__name">{T.sign}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MockExamPalmaresPage;
