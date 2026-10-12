import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mockExamsService } from '../../../services/mockExamsService';
import PrintFormatPicker from '../../../components/common/PrintFormatPicker/PrintFormatPicker';
import { subjectApprec } from '../../../utils/subjectApprec';
import { fmtSessionDates } from '../../../utils/fmtSessionDates';
import './MockExamFichePrintPage.css';
import { examScale, isCaType } from '../../../utils/examKinds';

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

function ScorePill({ score, scale = 20, en = false }) {
  if (score == null) return <span className="mfp-score mfp-score--empty">—</span>;
  const v20 = (score * 20) / scale; // seuils définis sur 20
  const cls = v20 >= 14 ? 'mfp-score--high' : v20 >= 10 ? 'mfp-score--mid' : 'mfp-score--low';
  return <span className={`mfp-score ${cls}`}>{en ? score.toFixed(2) : score.toFixed(2).replace('.', ',')}</span>;
}

function RankBadge({ rank }) {
  if (rank == null) return <span className="mfp-rank-empty">—</span>;
  const cls = rank === 1 ? 'mfp-rank--1' : rank === 2 ? 'mfp-rank--2' : rank === 3 ? 'mfp-rank--3' : 'mfp-rank--n';
  return <span className={`mfp-rank-badge ${cls}`}>{rank}</span>;
}

function SubjectPrintFiche({ subject, students, institution, exam }) {
  // Barème de la matière : aux compositions mensuelles, « Noté sur » de la matière (10 ou 20) ;
  // ailleurs, celui de la session (20)
  const scale = subject?.maxScore ?? examScale(exam?.examType);
  // Composition d'anglais : fiche entièrement en anglais (décimales avec un point)
  const en = isCaType(exam?.examType);
  const T = en ? {
    badge: 'MARK SHEET', type: 'English Test', className: 'Class', year: 'Year', coef: 'Coef.', teacher: 'Teacher',
    signed: 'Signed', name: 'Full name', adm: 'Admission No.', mark: 'Mark', rank: 'Position', appr: 'Remark',
    size: 'Pupils', avg: 'Average', sd: 'Std. dev.', max: 'Highest', min: 'Lowest', passed: 'Passed', rate: 'Rate',
    teacherSign: "Teacher's signature", signedOn: 'Signed on', teacherName: "Teacher's name",
    head: "Head Teacher's approval", stamp: 'Signature and stamp',
  } : {
    badge: 'FICHE DE NOTES', type: TYPE_LABELS[exam.examType] ?? exam.examType, className: 'Classe', year: 'Année',
    coef: 'Coeff.', teacher: 'Prof', signed: 'Signé', name: 'Nom et Prénoms', adm: 'Matricule', mark: 'Note',
    rank: 'Rang', appr: 'Appréciation', size: 'Effectif', avg: 'Moyenne', sd: 'Écart-type', max: 'Maximum',
    min: 'Minimum', passed: 'Admis', rate: 'Taux', teacherSign: 'Signature du professeur', signedOn: 'Signé le',
    teacherName: 'Nom du professeur', head: 'Visa du Directeur / de la Directrice', stamp: 'Signature et cachet',
  };
  const num = (v) => (en ? v.toFixed(2) : v.toFixed(2).replace('.', ','));
  const dateOf = (iso) => (en ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : fmtDate(iso));
  const gradeMap = new Map();
  students.forEach((s) => {
    const g = s.grades.find((g) => g.subjectId === subject.id);
    if (g) gradeMap.set(s.studentId, g);
  });

  const filled = students.map((s) => {
    const g = gradeMap.get(s.studentId);
    const v = g?.score ?? null;
    return v != null ? { s, v } : null;
  }).filter(Boolean);

  const avg      = filled.length > 0 ? Math.round((filled.reduce((a, x) => a + x.v, 0) / filled.length) * 100) / 100 : null;
  const best     = filled.length > 0 ? Math.max(...filled.map((x) => x.v)) : null;
  const worst    = filled.length > 0 ? Math.min(...filled.map((x) => x.v)) : null;
  const passing  = filled.filter((x) => x.v >= scale / 2).length;
  const variance = avg != null && filled.length > 1
    ? filled.reduce((sum, x) => sum + Math.pow(x.v - avg, 2), 0) / filled.length : null;
  const stddev   = variance != null ? Math.round(Math.sqrt(variance) * 100) / 100 : null;
  const passRate = filled.length > 0 ? Math.round((passing / filled.length) * 100) : null;

  const rankMap = (() => {
    const sorted = [...filled].sort((a, b) => b.v - a.v);
    const map = new Map();
    let rank = 1;
    sorted.forEach((item, idx) => {
      if (idx > 0 && item.v < sorted[idx - 1].v) rank = idx + 1;
      map.set(item.s.studentId, rank);
    });
    return map;
  })();

  return (
    <div className="mfp-section">

      {/* ── Document header ── */}
      <div className="mfp-doc-header">
        <div className="mfp-doc-header__school">
          {institution.logo && <img src={institution.logo} alt="" className="mfp-school-logo" />}
          <div className="mfp-school-info">
            {institution.circonscription && <div className="mfp-circ">{institution.circonscription}</div>}
            <div className="mfp-school-name">{institution.name}</div>
            {institution.address && <div className="mfp-school-addr">{institution.address}</div>}
          </div>
        </div>
        <div className="mfp-doc-header__title">
          <div className="mfp-doc-badge">{T.badge}</div>
          <div className="mfp-doc-exam-type">{T.type}</div>
          <div className="mfp-doc-label">{exam.label}</div>
          <div className="mfp-doc-meta">
            <span>{T.className}&nbsp;: <strong>{exam.class?.name}</strong></span>
            <span>{T.year}&nbsp;: <strong>{exam.academicYear}</strong></span>
            {fmtSessionDates(exam.examDate, exam.examEndDate) && (
                <span>{fmtSessionDates(exam.examDate, exam.examEndDate)}</span>
              )}
          </div>
        </div>
      </div>

      <div className="mfp-rule" />

      {/* ── Subject banner ── */}
      <div className="mfp-subj-banner">
        <div className="mfp-subj-banner__left">
          <span className="mfp-subj-title">{subject.nameFr}</span>
          <span className="mfp-coeff-badge">{T.coef}&nbsp;<span className="mfp-coeff-blank" /></span>
          {subject.teacherName && <span className="mfp-teacher-tag">{T.teacher} : {subject.teacherName}</span>}
        </div>
        {subject.isSigned && (
          <div className="mfp-signed-tag">
            ✅ {T.signed}{subject.signedByName ? ` · ${subject.signedByName}` : ''}
            {subject.signedAt ? ` · ${dateOf(subject.signedAt)}` : ''}
          </div>
        )}
      </div>

      {/* ── Grade table ── */}
      <table className="mfp-table">
        <thead>
          <tr>
            <th className="mfp-th mfp-th--n">N°</th>
            <th className="mfp-th mfp-th--name">{T.name}</th>
            <th className="mfp-th mfp-th--mat">{T.adm}</th>
            <th className="mfp-th mfp-th--note">{T.mark} /{scale}</th>
            <th className="mfp-th mfp-th--rang">{T.rank}</th>
            <th className="mfp-th mfp-th--appr">{T.appr}</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, i) => {
            const g = gradeMap.get(student.studentId);
            const score = g?.score ?? null;
            const rank  = rankMap.get(student.studentId) ?? null;
            const appr  = score == null ? '' : en ? (g?.appreciation ?? '') : subjectApprec(score, subject);
            const v20 = score == null ? null : (score * 20) / scale;
            const apprCls = v20 == null ? '' : v20 >= 14 ? 'appr--high' : v20 >= 10 ? 'appr--mid' : 'appr--low';
            return (
              <tr key={student.studentId} className={`mfp-row${i % 2 !== 0 ? ' mfp-row--alt' : ''}`}>
                <td className="mfp-td mfp-td--n">{i + 1}</td>
                <td className="mfp-td mfp-td--name">{student.studentName}</td>
                <td className="mfp-td mfp-td--mat">{student.admissionNumber}</td>
                <td className="mfp-td mfp-td--note"><ScorePill scale={scale} score={score} en={en} /></td>
                <td className="mfp-td mfp-td--rang"><RankBadge rank={rank} /></td>
                <td className={`mfp-td mfp-td--appr ${apprCls}`}>{appr || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Statistics band ── */}
      <div className="mfp-stats-band">
        <div className="mfp-stat-chip mfp-stat-chip--neutral">
          <span className="mfp-stat-chip__label">{T.size}</span>
          <span className="mfp-stat-chip__val">{filled.length}<small>/{students.length}</small></span>
        </div>
        <div className="mfp-stat-chip mfp-stat-chip--blue">
          <span className="mfp-stat-chip__label">{T.avg}</span>
          <span className="mfp-stat-chip__val">{avg != null ? num(avg) : '—'}<small>/{scale}</small></span>
        </div>
        <div className="mfp-stat-chip mfp-stat-chip--slate">
          <span className="mfp-stat-chip__label">{T.sd}</span>
          <span className="mfp-stat-chip__val">{stddev != null ? num(stddev) : '—'}</span>
        </div>
        <div className="mfp-stat-chip mfp-stat-chip--green">
          <span className="mfp-stat-chip__label">{T.max}</span>
          <span className="mfp-stat-chip__val">{best != null ? num(best) : '—'}</span>
        </div>
        <div className="mfp-stat-chip mfp-stat-chip--red">
          <span className="mfp-stat-chip__label">{T.min}</span>
          <span className="mfp-stat-chip__val">{worst != null ? num(worst) : '—'}</span>
        </div>
        <div className="mfp-stat-chip mfp-stat-chip--green">
          <span className="mfp-stat-chip__label">{T.passed}</span>
          <span className="mfp-stat-chip__val">{passing}<small>/{filled.length}</small></span>
        </div>
        <div className="mfp-stat-chip mfp-stat-chip--teal">
          <span className="mfp-stat-chip__label">{T.rate}</span>
          <span className="mfp-stat-chip__val">{passRate != null ? `${passRate}%` : '—'}</span>
        </div>
      </div>

      {/* ── Signature zone ── */}
      <div className="mfp-sigs">
        <div className="mfp-sig">
          <div className="mfp-sig__label">{T.teacherSign}</div>
          {subject.isSigned && subject.signatureData && subject.signatureData !== 'ADMIN_VERIFIED' ? (
            <div className="mfp-sig__stamp">
              {/* Signature manuscrite du professeur */}
              <img src={subject.signatureData} alt="Signature" style={{ display: 'block', maxHeight: 52, maxWidth: 170, objectFit: 'contain', margin: '0 auto 2px' }} />
              <div className="mfp-sig__stamp-name">{subject.signedByName || subject.teacherName || '—'}</div>
            </div>
          ) : subject.isSigned && subject.signedAt ? (
            <div className="mfp-sig__stamp">
              <div className="mfp-sig__stamp-name">{subject.signedByName || subject.teacherName || '—'}</div>
              <div className="mfp-sig__stamp-date">{T.signedOn} {dateOf(subject.signedAt)}</div>
            </div>
          ) : (
            <div className="mfp-sig__line" />
          )}
          <div className="mfp-sig__name">{subject.teacherName || T.teacherName}</div>
        </div>
        <div className="mfp-sig">
          <div className="mfp-sig__label">{T.head}</div>
          <div className="mfp-sig__line" />
          <div className="mfp-sig__name">{T.stamp}</div>
        </div>
      </div>

    </div>
  );
}

export default function MockExamFichePrintPage() {
  const { id } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['mock-exam-fiche-print', id],
    queryFn: () => mockExamsService.getFicheData(id).then((r) => r.data),
  });

  if (isLoading) return <div className="mfp-loading">Chargement…</div>;
  if (isError || !data) return <div className="mfp-error">Impossible de charger les fiches.</div>;

  const { institution, exam, subjects, students } = data;

  return (
    <div className="mfp-page">
      <div className="mfp-toolbar no-print">
        <PrintFormatPicker defaultFormat="A4 portrait" />
        <button className="mfp-print-btn" onClick={() => window.print()}>🖨 Imprimer / PDF</button>
        <button className="mfp-close-btn" onClick={() => window.close()}>✕ Fermer</button>
      </div>
      {subjects.map((subject) => (
        <SubjectPrintFiche key={subject.id} subject={subject} students={students} institution={institution} exam={exam} />
      ))}
    </div>
  );
}
