import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mockExamsService } from '../../../services/mockExamsService';
import PrintFormatPicker from '../../../components/common/PrintFormatPicker/PrintFormatPicker';
import { fmtSessionDates } from '../../../utils/fmtSessionDates';
import './MockExamRelevePage.css';
import { examScale, isNonExamType, isCmType } from '../../../utils/examKinds';

const TYPE_LABELS = {
  BLANC: 'Examen Blanc',
  CEPE:  'C.E.P.E Blanc',
  BEPC:  'B.E.P.C Blanc',
  BAC1:  'Baccalauréat — Première Partie',
  BAC2:  'Baccalauréat — Deuxième Partie',
  DEVOIR_SURVEILLE: 'Devoir surveillé',
  COMPOSITION_MENSUELLE: 'Composition mensuelle',
};

/** Appréciation d'une note sur `scale` (seuils définis sur 20). */
function apprec(raw, scale = 20) {
  if (raw == null) return '';
  const avg = (raw * 20) / scale;
  if (avg >= 16) return 'Très Bien';
  if (avg >= 14) return 'Bien';
  if (avg >= 12) return 'Assez Bien';
  if (avg >= 10) return 'Passable';
  return 'Insuffisant';
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getResult(avg, examType, sex) {
  const f = sex === 'F';
  if (avg == null) return { text: '—', cls: '' };
  const pass = examScale(examType) / 2;
  // Devoir surveillé / composition mensuelle : pas d'« admis / ajourné » (ce ne sont pas des examens)
  if (isNonExamType(examType)) {
    return avg >= pass ? { text: 'MOYENNE ATTEINTE', cls: 'pass' } : { text: 'SOUS LA MOYENNE', cls: 'fail' };
  }
  if (avg >= pass) return { text: f ? 'ADMISE' : 'ADMIS', cls: 'pass' };
  if ((examType === 'BAC1' || examType === 'BAC2') && avg >= 9)
    return { text: 'ADMISSIBLE', cls: 'admissible' };
  return { text: f ? 'AJOURNÉE' : 'AJOURNÉ', cls: 'fail' };
}

// Single student card (one per print page)
function StudentCard({ student, subjects, exam, institution }) {
  const scale = examScale(exam?.examType); // 10 pour les compositions mensuelles
  const isCm = isCmType(exam?.examType);
  const totalCoeff = subjects.reduce((s, subj) => s + subj.coefficient, 0);
  const gradeMap = new Map(student.grades.map((g) => [g.subjectId, g]));

  // Points obtenus ÷ points possibles, ramenés au barème de la session (compositions mensuelles :
  // chaque matière sur 10 ou 20) — même calcul que le serveur.
  const subjMax = (subj) => subj.maxScore ?? scale;
  let totalPts = 0;
  let filledMax = 0;
  subjects.forEach((subj) => {
    const g = gradeMap.get(subj.id);
    if (g?.score != null) {
      totalPts += g.score * subj.coefficient;
      filledMax += subjMax(subj) * subj.coefficient;
    }
  });
  const avg = filledMax > 0 ? Math.round((totalPts / filledMax) * scale * 100) / 100 : null;
  const mention = apprec(avg, scale);
  const result = getResult(avg, exam.examType, student.sex);

  return (
    <div className="mrel-card">
      {/* ── Header ── */}
      <div className="mrel-header">
        <div className="mrel-header__left">
          {institution.logo && (
            <img src={institution.logo} alt="logo" className="mrel-logo" />
          )}
          <div>
            {institution.circonscription && (
              <div className="mrel-circ">{institution.circonscription}</div>
            )}
            <div className="mrel-school-name">{institution.name}</div>
            {institution.address && (
              <div className="mrel-school-addr">{institution.address}</div>
            )}
          </div>
        </div>
        <div className="mrel-header__right">
          <div className="mrel-doc-title">RELEVÉ DE NOTES</div>
          <div className="mrel-doc-subtitle">Bulletin d'examen blanc</div>
          <div className="mrel-exam-type">{TYPE_LABELS[exam.examType] ?? exam.examType}</div>
          <div className="mrel-exam-label">{exam.label}</div>
          {fmtSessionDates(exam.examDate, exam.examEndDate) && (
            <div className="mrel-exam-date">{fmtSessionDates(exam.examDate, exam.examEndDate)}</div>
          )}
        </div>
      </div>

      <div className="mrel-divider" />

      {/* ── Student identity ── */}
      <div className="mrel-identity">
        <div className="mrel-identity__field">
          <span className="mrel-identity__label">Nom et prénoms</span>
          <span className="mrel-identity__value">{student.studentName}</span>
        </div>
        <div className="mrel-identity__field">
          <span className="mrel-identity__label">Matricule</span>
          <span className="mrel-identity__value">{student.admissionNumber}</span>
        </div>
        <div className="mrel-identity__field">
          <span className="mrel-identity__label">Classe</span>
          <span className="mrel-identity__value">{exam.class?.name}</span>
        </div>
        <div className="mrel-identity__field">
          <span className="mrel-identity__label">Année scolaire</span>
          <span className="mrel-identity__value">{exam.academicYear}</span>
        </div>
      </div>

      {/* ── Grade table ── */}
      <table className="mrel-table">
        <thead>
          <tr>
            <th className="mrel-th mrel-th--subject">Matière / Discipline</th>
            <th className="mrel-th mrel-th--coeff">Coeff.</th>
            <th className="mrel-th mrel-th--score">Note{isCm ? '' : ` /${scale}`}</th>
            <th className="mrel-th mrel-th--pts">Pts × Coeff</th>
            <th className="mrel-th mrel-th--appre">Appréciation</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subj, i) => {
            const g = gradeMap.get(subj.id);
            const score = g?.score ?? null;
            const pts = score != null ? score * subj.coefficient : null;
            return (
              <tr key={subj.id} className={i % 2 === 0 ? 'mrel-row' : 'mrel-row mrel-row--alt'}>
                <td className="mrel-td mrel-td--subject">{subj.nameFr}</td>
                <td className="mrel-td mrel-td--center">{subj.coefficient}</td>
                <td className="mrel-td mrel-td--center mrel-td--score">
                  {score != null ? score.toFixed(2).replace('.', ',') : '—'}
                  {isCm && <small className="mrel-max"> / {subjMax(subj)}</small>}
                </td>
                <td className="mrel-td mrel-td--center">
                  {pts != null ? pts.toFixed(2).replace('.', ',') : '—'}
                </td>
                <td className="mrel-td mrel-td--appre">{apprec(score, subjMax(subj))}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="mrel-total-row">
            <td className="mrel-td mrel-td--bold">TOTAL</td>
            <td className="mrel-td mrel-td--center mrel-td--bold">{totalCoeff}</td>
            <td className="mrel-td" />
            <td className="mrel-td mrel-td--center mrel-td--bold">
              {totalPts > 0 ? totalPts.toFixed(2).replace('.', ',') : '—'}
              {isCm && filledMax > 0 && <small className="mrel-max"> / {filledMax}</small>}
            </td>
            <td className="mrel-td" />
          </tr>
        </tfoot>
      </table>

      {/* ── Result summary ── */}
      <div className="mrel-result">
        <div className="mrel-result__item">
          <span className="mrel-result__label">Moyenne générale</span>
          <span className="mrel-result__value mrel-result__value--avg">
            {avg != null ? avg.toFixed(2).replace('.', ',') + ` / ${scale}` : '—'}
          </span>
        </div>
        <div className="mrel-result__item">
          <span className="mrel-result__label">Mention</span>
          <span className="mrel-result__value">{mention || '—'}</span>
        </div>
        <div className={`mrel-result__item${student.rank === 1 ? ' mrel-result__item--gold' : student.rank === 2 ? ' mrel-result__item--silver' : student.rank === 3 ? ' mrel-result__item--bronze' : ''}`}>
          <span className="mrel-result__label">Classement</span>
          <span className="mrel-result__value mrel-result__value--rank">
            {student.rank != null
              ? (student.rank === 1 ? '🥇 ' : student.rank === 2 ? '🥈 ' : student.rank === 3 ? '🥉 ' : '')
                + `${student.rank}e`
                + (student.classSize ? ` / ${student.classSize}` : '')
              : '—'}
          </span>
        </div>
        <div className="mrel-result__item">
          <span className="mrel-result__label">Résultat</span>
          <span className={`mrel-result__value${result.cls ? ` mrel-result__value--${result.cls}` : ''}`}>
            {result.text}
          </span>
        </div>
      </div>

      {/* ── Signatures ── */}
      <div className="mrel-sigs">
        <div className="mrel-sig">
          <div className="mrel-sig__title">Le Directeur / La Directrice</div>
          <div className="mrel-sig__space" />
          <div className="mrel-sig__name">Signature et cachet</div>
        </div>
        <div className="mrel-sig">
          <div className="mrel-sig__title">Lu et pris connaissance</div>
          <div className="mrel-sig__space" />
          <div className="mrel-sig__name">Parent / Tuteur</div>
        </div>
      </div>
    </div>
  );
}

function MockExamRelevePage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId');
  const [selected, setSelected] = useState(studentId ?? '');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['mock-exam-releve', id, selected],
    queryFn: () => mockExamsService.getReleve(id, selected || undefined).then((r) => r.data),
  });

  // Téléchargement en PDF (même charte que les bulletins) : l'élève choisi, ou tous en ZIP
  const [downloading, setDownloading] = useState(false);
  async function handleDownload() {
    setDownloading(true);
    try {
      const res = selected
        ? await mockExamsService.downloadRelevePdf(id, selected)
        : await mockExamsService.downloadReleveZip(id);
      const disposition = res.headers?.['content-disposition'] ?? '';
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? (selected ? 'releve.pdf' : 'releves.zip');
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Le téléchargement a échoué. Réessayez.');
    } finally {
      setDownloading(false);
    }
  }

  if (isLoading) return <div className="mrel-loading">Chargement...</div>;
  if (isError || !data) return (
    <div className="mrel-screen-error">Impossible de charger le relevé. Vérifiez l'identifiant.</div>
  );

  const { institution, exam, subjects, students } = data;

  return (
    <div className="mrel-page">
      {/* Screen-only toolbar */}
      <div className="mrel-toolbar no-print">
        <Link to="#" onClick={() => history.back()} className="mrel-toolbar__back">← Retour</Link>
        <div className="mrel-toolbar__center">
          <select
            className="mrel-toolbar__select"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">— Tous les élèves —</option>
            {data.students.map((s) => (
              <option key={s.studentId} value={s.studentId}>{s.studentName}</option>
            ))}
          </select>
        </div>
        <PrintFormatPicker defaultFormat="A4 portrait" />
        <button className="mrel-print-btn mrel-download-btn" onClick={handleDownload} disabled={downloading}>
          {downloading
            ? (selected ? 'Préparation du PDF…' : 'Préparation des relevés…')
            : (selected ? '⬇ Télécharger le PDF' : `⬇ Tous les relevés (ZIP, ${students.length})`)}
        </button>
        <button className="mrel-print-btn" onClick={() => window.print()}>
          🖨 Imprimer
        </button>
      </div>

      {/* Cards (one per student, each print page) */}
      <div className="mrel-cards">
        {students.map((student) => (
          <StudentCard
            key={student.studentId}
            student={student}
            subjects={subjects}
            exam={exam}
            institution={institution}
          />
        ))}
      </div>
    </div>
  );
}

export default MockExamRelevePage;
