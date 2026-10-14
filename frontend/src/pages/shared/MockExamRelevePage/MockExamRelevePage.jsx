import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mockExamsService } from '../../../services/mockExamsService';
import PrintFormatPicker from '../../../components/common/PrintFormatPicker/PrintFormatPicker';
import { fmtSessionDates } from '../../../utils/fmtSessionDates';
import './MockExamRelevePage.css';
import { examScale, isNonExamType, isPrimaryCompoType, isCaType, fmtAvg } from '../../../utils/examKinds';

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

/** Textes du relevé : français, ou anglais pour les compositions d'anglais (même chose que le PDF). */
const T_FR = {
  title: 'RELEVÉ DE NOTES', mockSubtitle: "Bulletin d'examen blanc", name: 'Nom et prénoms', admission: 'Matricule',
  className: 'Classe', year: 'Année scolaire', subject: 'Matière / Discipline', coef: 'Coeff.', mark: 'Note',
  points: 'Pts × Coeff', appreciation: 'Appréciation', total: 'TOTAL', average: 'Moyenne générale', mention: 'Mention',
  rank: 'Classement', result: 'Résultat', passed: 'MOYENNE ATTEINTE', below: 'SOUS LA MOYENNE',
  teacher: 'Le Maître / La Maîtresse', teacherSign: 'Nom et signature', subjectTeachers: 'Professeur(s) de matière',
  head: 'Le Directeur / La Directrice', headSign: 'Signature et cachet', parentTitle: 'Lu et pris connaissance',
  parent: 'Parent / Tuteur', verifyAlt: 'Code de vérification',
  levels: ['Très Bien', 'Bien', 'Assez Bien', 'Passable', 'Insuffisant'],
};
const T_EN = {
  title: 'REPORT SHEET', mockSubtitle: 'Mock exam report', name: 'Full name', admission: 'Admission No.',
  className: 'Class', year: 'School year', subject: 'Subject', coef: 'Coef.', mark: 'Mark',
  points: 'Pts × Coef', appreciation: 'Remark', total: 'TOTAL', average: 'Average', mention: 'Remark',
  rank: 'Position', result: 'Result', passed: 'PASSED', below: 'BELOW AVERAGE',
  teacher: 'Class Teacher', teacherSign: 'Name and signature', subjectTeachers: 'Subject Teacher(s)',
  head: 'Head Teacher', headSign: 'Signature and stamp', parentTitle: 'Read and acknowledged',
  parent: 'Parent / Guardian', verifyAlt: 'Verification code',
  levels: ['Very Good', 'Good', 'Fairly Good', 'Satisfactory', 'Insufficient'],
};

/** Appréciation d'une note sur `scale` (seuils définis sur 20). */
function apprec(raw, scale = 20, T = T_FR) {
  if (raw == null) return '';
  const avg = (raw * 20) / scale;
  const [vg, g, fg, sa, ins] = T.levels;
  if (avg >= 16) return vg;
  if (avg >= 14) return g;
  if (avg >= 12) return fg;
  if (avg >= 10) return sa;
  return ins;
}

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th, 21st … */
const ordinalEn = (n) => {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] ?? 'th'}`;
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getResult(avg, examType, sex, T = T_FR) {
  const f = sex === 'F';
  if (avg == null) return { text: '—', cls: '' };
  const pass = examScale(examType) / 2;
  // Devoir surveillé / composition mensuelle : pas d'« admis / ajourné » (ce ne sont pas des examens)
  if (isNonExamType(examType)) {
    return avg >= pass ? { text: T.passed, cls: 'pass' } : { text: T.below, cls: 'fail' };
  }
  if (avg >= pass) return { text: f ? 'ADMISE' : 'ADMIS', cls: 'pass' };
  if ((examType === 'BAC1' || examType === 'BAC2') && avg >= 9)
    return { text: 'ADMISSIBLE', cls: 'admissible' };
  return { text: f ? 'AJOURNÉE' : 'AJOURNÉ', cls: 'fail' };
}

// Single student card (one per print page)
function StudentCard({ student, subjects, exam, institution, teacherSignatures = [] }) {
  // Composition d'anglais : pas de cadre titulaire, seulement les professeurs d'anglais qui ont signé
  const englishTest = isCaType(exam?.examType);
  const classSignatures = englishTest ? [] : teacherSignatures.filter((t) => t.classTeacher);
  const subjectSignatures = englishTest
    ? teacherSignatures.filter((t) => t.fromSession !== false)
    : teacherSignatures.filter((t) => !t.classTeacher);
  const scale = examScale(exam?.examType); // 10 pour les compositions mensuelles
  const isCm = isPrimaryCompoType(exam?.examType); // chaque matière sur son barème (10 ou 20)
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
  // Composition d'anglais : relevé en anglais, décimales avec un point
  const en = isCaType(exam?.examType);
  const T = en ? T_EN : T_FR;
  const num = (v) => (en ? v.toFixed(2) : v.toFixed(2).replace('.', ','));
  const mention = apprec(avg, scale, T);
  const result = getResult(avg, exam.examType, student.sex, T);

  // QR code : ouvre la page de vérification avec le code du relevé (comme sur le PDF)
  const [qrDataUri, setQrDataUri] = useState(null);
  useEffect(() => {
    if (!student.verifyCode) return;
    QRCode.toDataURL(`${window.location.origin}/verify?code=${encodeURIComponent(student.verifyCode)}`,
      { margin: 0, width: 220, errorCorrectionLevel: 'M' })
      .then(setQrDataUri)
      .catch(() => setQrDataUri(null));
  }, [student.verifyCode]);

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
          <div className="mrel-doc-title">{T.title}</div>
          {/* Devoir surveillé / composition mensuelle : seulement leur nom ; examens blancs : « Bulletin d'examen blanc » */}
          {isNonExamType(exam.examType)
            ? <div className="mrel-exam-type">{en ? 'English Test' : TYPE_LABELS[exam.examType]}</div>
            : (
              <>
                <div className="mrel-doc-subtitle">{T.mockSubtitle}</div>
                <div className="mrel-exam-type">{TYPE_LABELS[exam.examType] ?? exam.examType}</div>
              </>
            )}
          <div className="mrel-exam-label">{exam.label}</div>
          {fmtSessionDates(exam.examDate, exam.examEndDate) && (
            <div className="mrel-exam-date">{fmtSessionDates(exam.examDate, exam.examEndDate)}</div>
          )}
        </div>
        {/* QR code de vérification, et photo si l'élève en a une */}
        {(qrDataUri || student.photo) && (
          <div className="mrel-header__id">
            {qrDataUri && (
              <div className="mrel-verify">
                <img src={qrDataUri} alt={T.verifyAlt} className="mrel-qr" />
                <div className="mrel-code">{student.verifyCode}</div>
              </div>
            )}
            {student.photo && <img src={student.photo} alt="Photo" className="mrel-photo" />}
          </div>
        )}
      </div>

      <div className="mrel-divider" />

      {/* ── Student identity ── */}
      <div className="mrel-identity">
        <div className="mrel-identity__field">
          <span className="mrel-identity__label">{T.name}</span>
          <span className="mrel-identity__value">{student.studentName}</span>
        </div>
        <div className="mrel-identity__field">
          <span className="mrel-identity__label">{T.admission}</span>
          <span className="mrel-identity__value">{student.admissionNumber}</span>
        </div>
        <div className="mrel-identity__field">
          <span className="mrel-identity__label">{T.className}</span>
          <span className="mrel-identity__value">{exam.class?.name}</span>
        </div>
        <div className="mrel-identity__field">
          <span className="mrel-identity__label">{T.year}</span>
          <span className="mrel-identity__value">{exam.academicYear}</span>
        </div>
      </div>

      {/* ── Grade table ── */}
      <table className="mrel-table">
        <thead>
          <tr>
            <th className="mrel-th mrel-th--subject">{T.subject}</th>
            <th className="mrel-th mrel-th--coeff">{T.coef}</th>
            <th className="mrel-th mrel-th--score">{T.mark}{isCm ? '' : ` /${scale}`}</th>
            <th className="mrel-th mrel-th--pts">{T.points}</th>
            <th className="mrel-th mrel-th--appre">{T.appreciation}</th>
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
                  {score != null ? num(score) : '—'}
                  {isCm && <small className="mrel-max"> / {subjMax(subj)}</small>}
                </td>
                <td className="mrel-td mrel-td--center">
                  {pts != null ? num(pts) : '—'}
                </td>
                <td className="mrel-td mrel-td--appre">{apprec(score, subjMax(subj), T)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="mrel-total-row">
            <td className="mrel-td mrel-td--bold">{T.total}</td>
            <td className="mrel-td mrel-td--center mrel-td--bold">{totalCoeff}</td>
            <td className="mrel-td" />
            <td className="mrel-td mrel-td--center mrel-td--bold">
              {totalPts > 0 ? num(totalPts) : '—'}
              {isCm && filledMax > 0 && <small className="mrel-max"> / {filledMax}</small>}
            </td>
            <td className="mrel-td" />
          </tr>
        </tfoot>
      </table>

      {/* ── Result summary ── */}
      <div className="mrel-result">
        <div className="mrel-result__item">
          <span className="mrel-result__label">{T.average}</span>
          <span className="mrel-result__value mrel-result__value--avg">
            {en && avg != null ? `${num(avg)} %` : fmtAvg(avg, exam.examType, ' / ')}
          </span>
        </div>
        <div className="mrel-result__item">
          <span className="mrel-result__label">{T.mention}</span>
          <span className="mrel-result__value">{mention || '—'}</span>
        </div>
        <div className={`mrel-result__item${student.rank === 1 ? ' mrel-result__item--gold' : student.rank === 2 ? ' mrel-result__item--silver' : student.rank === 3 ? ' mrel-result__item--bronze' : ''}`}>
          <span className="mrel-result__label">{T.rank}</span>
          <span className="mrel-result__value mrel-result__value--rank">
            {student.rank != null
              ? (student.rank === 1 ? '🥇 ' : student.rank === 2 ? '🥈 ' : student.rank === 3 ? '🥉 ' : '')
                + (en ? ordinalEn(student.rank) : `${student.rank}e`)
                + (student.classSize ? ` / ${student.classSize}` : '')
              : '—'}
          </span>
        </div>
        <div className="mrel-result__item">
          <span className="mrel-result__label">{T.result}</span>
          <span className={`mrel-result__value${result.cls ? ` mrel-result__value--${result.cls}` : ''}`}>
            {result.text}
          </span>
        </div>
      </div>

      {/* ── Signatures ── */}
      <div className="mrel-sigs">
        {/* Titulaire dans « Le Maître / Class Teacher », professeurs de matière dans leur propre cadre */}
        {!englishTest && (
        <div className="mrel-sig">
          <div className="mrel-sig__title">{T.teacher}</div>
          {classSignatures.length > 0 ? (
            <div className="mrel-sig__imgs">
              {classSignatures.map((t, i) => (
                <div key={i} className="mrel-sig__person">
                  <img src={t.image} alt="Signature" className="mrel-sig__img" />
                  <div className="mrel-sig__name">{t.name}</div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="mrel-sig__space" />
              <div className="mrel-sig__name">{T.teacherSign}</div>
            </>
          )}
        </div>
        )}
        {englishTest && subjectSignatures.length === 0 && (
          <div className="mrel-sig">
            <div className="mrel-sig__title">{T.subjectTeachers}</div>
            <div className="mrel-sig__space" />
            <div className="mrel-sig__name">{T.teacherSign}</div>
          </div>
        )}
        {subjectSignatures.length > 0 && (
          <div className="mrel-sig">
            <div className="mrel-sig__title">{T.subjectTeachers}</div>
            <div className="mrel-sig__imgs">
              {subjectSignatures.map((t, i) => (
                <div key={i} className="mrel-sig__person">
                  <img src={t.image} alt="Signature" className="mrel-sig__img" />
                  <div className="mrel-sig__name">{t.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mrel-sig">
          <div className="mrel-sig__title">{T.head}</div>
          <div className="mrel-sig__space" />
          <div className="mrel-sig__name">{T.headSign}</div>
        </div>
        <div className="mrel-sig">
          <div className="mrel-sig__title">{T.parentTitle}</div>
          <div className="mrel-sig__space" />
          <div className="mrel-sig__name">{T.parent}</div>
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
  // duo : tous les relevés deux par feuille A4, à couper en deux après impression
  async function handleDownload(duo = false) {
    setDownloading(duo ? 'duo' : true);
    try {
      const res = duo
        ? await mockExamsService.downloadReleveDuo(id)
        : selected
          ? await mockExamsService.downloadRelevePdf(id, selected)
          : await mockExamsService.downloadReleveZip(id);
      const disposition = res.headers?.['content-disposition'] ?? '';
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? (duo || selected ? 'releves.pdf' : 'releves.zip');
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
        <button className="mrel-print-btn mrel-download-btn" onClick={() => handleDownload()} disabled={!!downloading}>
          {downloading === true
            ? (selected ? 'Préparation du PDF…' : 'Préparation des relevés…')
            : (selected ? '⬇ Télécharger le PDF' : `⬇ Tous les relevés (ZIP, ${students.length})`)}
        </button>
        {!selected && (
          <button
            className="mrel-print-btn mrel-download-btn"
            onClick={() => handleDownload(true)}
            disabled={!!downloading}
            title="Deux relevés par feuille A4 : imprimez puis coupez la feuille en deux"
          >
            {downloading === 'duo' ? 'Préparation…' : `✂ 2 relevés par feuille (PDF, ${Math.ceil(students.length / 2)} feuilles)`}
          </button>
        )}
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
            teacherSignatures={data.teacherSignatures ?? []}
          />
        ))}
      </div>
    </div>
  );
}

export default MockExamRelevePage;
