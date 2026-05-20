import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mockExamsService } from '../../../services/mockExamsService';
import PrintFormatPicker from '../../../components/common/PrintFormatPicker/PrintFormatPicker';
import { fmtSessionDates } from '../../../utils/fmtSessionDates';
import './MockExamPalmaresPage.css';

const TYPE_LABELS = {
  BLANC: 'Examen Blanc',
  CEPE:  'C.E.P.E Blanc',
  BEPC:  'B.E.P.C Blanc',
  BAC1:  'Baccalauréat — Première Partie',
  BAC2:  'Baccalauréat — Deuxième Partie',
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

  function getResult(avg, sex) {
    const f = sex === 'F';
    if (avg == null) return { label: '—', cls: '' };
    if (avg >= 10) return { label: f ? 'ADMISE' : 'ADMIS', cls: 'mpal-td--pass' };
    if (isBac && avg >= 9) return { label: 'ADMISSIBLE', cls: 'mpal-td--admis' };
    return { label: f ? 'AJOURNÉE' : 'AJOURNÉ', cls: 'mpal-td--fail' };
  }

  return (
    <div className="mpal-page">
      {/* Screen toolbar */}
      <div className="mpal-toolbar no-print">
        <Link to="#" onClick={() => history.back()} className="mpal-toolbar__back">← Retour</Link>
        <div className="mpal-toolbar__center">
          <span className="mpal-toolbar__title">Proclamation des résultats — {exam.label}</span>
        </div>
        <PrintFormatPicker defaultFormat="A4 landscape" />
        <button className="mpal-print-btn" onClick={() => window.print()}>
          🖨 Imprimer
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
            <div className="mpal-doc-title">PROCLAMATION DES RÉSULTATS</div>
            <div className="mpal-exam-type">{TYPE_LABELS[exam.examType] ?? exam.examType}</div>
            <div className="mpal-exam-label">{exam.label}</div>
            <div className="mpal-exam-meta">
              <span>Classe : <strong>{exam.class?.name}</strong></span>
              <span>Année scolaire : <strong>{exam.academicYear}</strong></span>
              <span>Coeff. total : <strong>{totalCoeff}</strong></span>
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
                <th className="mpal-th mpal-th--rank" rowSpan={2}>Rang</th>
                <th className="mpal-th mpal-th--name" rowSpan={2}>Nom et Prénoms</th>
                <th className="mpal-th mpal-th--num" rowSpan={2}>Matr.</th>
                {subjects.map((subj) => (
                  <th key={subj.id} className="mpal-th mpal-th--subj">
                    {subj.nameFr}
                  </th>
                ))}
                <th className="mpal-th mpal-th--total" rowSpan={2}>Total<br />Pts</th>
                <th className="mpal-th mpal-th--avg" rowSpan={2}>Moy.<br />/20</th>
                <th className="mpal-th mpal-th--mention" rowSpan={2}>Mention</th>
                <th className="mpal-th mpal-th--result" rowSpan={2}>Résultat</th>
              </tr>
              <tr>
                {subjects.map((subj) => (
                  <th key={`c-${subj.id}`} className="mpal-th mpal-th--coeff">
                    ×{subj.coefficient}
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
                          {rank === 1 ? '🥇 1er' : rank === 2 ? '🥈 2e' : rank === 3 ? '🥉 3e' : rank}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="mpal-td mpal-td--name">{student.studentName}</td>
                    <td className="mpal-td mpal-td--num">{student.admissionNumber}</td>

                    {subjects.map((subj) => {
                      const g = gradeMap.get(subj.id);
                      const score = g?.score ?? null;
                      const low = score != null && score < 10;
                      return (
                        <td
                          key={subj.id}
                          className={`mpal-td mpal-td--score${low ? ' mpal-td--low' : ''}`}
                        >
                          {score != null ? score.toFixed(2).replace('.', ',') : '—'}
                        </td>
                      );
                    })}

                    <td className="mpal-td mpal-td--total mpal-td--bold">
                      {totalPts > 0 ? totalPts.toFixed(2).replace('.', ',') : '—'}
                    </td>
                    <td className={`mpal-td mpal-td--avg${result.cls ? ` ${result.cls}` : ''}`}>
                      {student.average != null ? student.average.toFixed(2).replace('.', ',') : '—'}
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
            <span className="mpal-summary__label">Effectif total</span>
            <span className="mpal-summary__value">{summary.total}</span>
          </div>
          <div className="mpal-summary__item">
            <span className="mpal-summary__label">Admis(e)s ≥10</span>
            <span className="mpal-summary__value mpal-summary__value--pass">{summary.admitted}</span>
          </div>
          {summary.isBac && (
            <div className="mpal-summary__item">
              <span className="mpal-summary__label">Admissibles ≥9</span>
              <span className="mpal-summary__value mpal-summary__value--admis">{summary.admissible}</span>
            </div>
          )}
          <div className="mpal-summary__item">
            <span className="mpal-summary__label">Ajournés</span>
            <span className="mpal-summary__value mpal-summary__value--fail">{summary.ajourne ?? (summary.withGrades - summary.admitted)}</span>
          </div>
          <div className="mpal-summary__item">
            <span className="mpal-summary__label">Taux de réussite</span>
            <span className="mpal-summary__value">{summary.passingRate}%</span>
          </div>
          <div className="mpal-summary__item">
            <span className="mpal-summary__label">Non classés</span>
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
              <div className="mpal-podium__title">Classement général</div>
              <div className="mpal-podium__list">
                {top.map((s) => (
                  <div key={s.studentId} className={`mpal-podium__item mpal-podium__item--${s.rank === 1 ? 'gold' : s.rank === 2 ? 'silver' : 'bronze'}`}>
                    <span className="mpal-podium__medal">{medals[s.rank]}</span>
                    <span className="mpal-podium__sname">{s.studentName}</span>
                    <span className="mpal-podium__avg">{s.average != null ? s.average.toFixed(2).replace('.', ',') : '—'}/20</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Signatures */}
        <div className="mpal-sigs">
          <div className="mpal-sig">
            <div className="mpal-sig__title">Le Directeur / La Directrice</div>
            <div className="mpal-sig__space" />
            <div className="mpal-sig__name">Signature et cachet</div>
          </div>
          <div className="mpal-sig">
            <div className="mpal-sig__title">Jury / Responsable pédagogique</div>
            <div className="mpal-sig__space" />
            <div className="mpal-sig__name">Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MockExamPalmaresPage;
