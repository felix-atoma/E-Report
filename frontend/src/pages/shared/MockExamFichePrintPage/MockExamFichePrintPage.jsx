import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mockExamsService } from '../../../services/mockExamsService';
import PrintFormatPicker from '../../../components/common/PrintFormatPicker/PrintFormatPicker';
import { subjectApprec } from '../../../utils/subjectApprec';
import { fmtSessionDates } from '../../../utils/fmtSessionDates';
import './MockExamFichePrintPage.css';

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

function ScorePill({ score }) {
  if (score == null) return <span className="mfp-score mfp-score--empty">—</span>;
  const cls = score >= 14 ? 'mfp-score--high' : score >= 10 ? 'mfp-score--mid' : 'mfp-score--low';
  return <span className={`mfp-score ${cls}`}>{score.toFixed(2).replace('.', ',')}</span>;
}

function RankBadge({ rank }) {
  if (rank == null) return <span className="mfp-rank-empty">—</span>;
  const cls = rank === 1 ? 'mfp-rank--1' : rank === 2 ? 'mfp-rank--2' : rank === 3 ? 'mfp-rank--3' : 'mfp-rank--n';
  return <span className={`mfp-rank-badge ${cls}`}>{rank}</span>;
}

function SubjectPrintFiche({ subject, students, institution, exam }) {
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
  const passing  = filled.filter((x) => x.v >= 10).length;
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
          <div className="mfp-doc-badge">FICHE DE NOTES</div>
          <div className="mfp-doc-exam-type">{TYPE_LABELS[exam.examType] ?? exam.examType}</div>
          <div className="mfp-doc-label">{exam.label}</div>
          <div className="mfp-doc-meta">
            <span>Classe&nbsp;: <strong>{exam.class?.name}</strong></span>
            <span>Année&nbsp;: <strong>{exam.academicYear}</strong></span>
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
          <span className="mfp-coeff-badge">Coeff.&nbsp;<strong>{subject.coefficient}</strong></span>
          {subject.teacherName && <span className="mfp-teacher-tag">Prof : {subject.teacherName}</span>}
        </div>
        {subject.isSigned && (
          <div className="mfp-signed-tag">
            ✅ Signé{subject.signedByName ? ` · ${subject.signedByName}` : ''}
            {subject.signedAt ? ` · ${fmtDate(subject.signedAt)}` : ''}
          </div>
        )}
      </div>

      {/* ── Grade table ── */}
      <table className="mfp-table">
        <thead>
          <tr>
            <th className="mfp-th mfp-th--n">N°</th>
            <th className="mfp-th mfp-th--name">Nom et Prénoms</th>
            <th className="mfp-th mfp-th--mat">Matricule</th>
            <th className="mfp-th mfp-th--note">Note /20</th>
            <th className="mfp-th mfp-th--rang">Rang</th>
            <th className="mfp-th mfp-th--appr">Appréciation</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, i) => {
            const g = gradeMap.get(student.studentId);
            const score = g?.score ?? null;
            const rank  = rankMap.get(student.studentId) ?? null;
            const appr  = score != null ? subjectApprec(score, subject) : '';
            const apprCls = score == null ? '' : score >= 14 ? 'appr--high' : score >= 10 ? 'appr--mid' : 'appr--low';
            return (
              <tr key={student.studentId} className={`mfp-row${i % 2 !== 0 ? ' mfp-row--alt' : ''}`}>
                <td className="mfp-td mfp-td--n">{i + 1}</td>
                <td className="mfp-td mfp-td--name">{student.studentName}</td>
                <td className="mfp-td mfp-td--mat">{student.admissionNumber}</td>
                <td className="mfp-td mfp-td--note"><ScorePill score={score} /></td>
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
          <span className="mfp-stat-chip__label">Effectif</span>
          <span className="mfp-stat-chip__val">{filled.length}<small>/{students.length}</small></span>
        </div>
        <div className="mfp-stat-chip mfp-stat-chip--blue">
          <span className="mfp-stat-chip__label">Moyenne</span>
          <span className="mfp-stat-chip__val">{avg != null ? avg.toFixed(2).replace('.', ',') : '—'}<small>/20</small></span>
        </div>
        <div className="mfp-stat-chip mfp-stat-chip--slate">
          <span className="mfp-stat-chip__label">Écart-type</span>
          <span className="mfp-stat-chip__val">{stddev != null ? stddev.toFixed(2).replace('.', ',') : '—'}</span>
        </div>
        <div className="mfp-stat-chip mfp-stat-chip--green">
          <span className="mfp-stat-chip__label">Maximum</span>
          <span className="mfp-stat-chip__val">{best != null ? best.toFixed(2).replace('.', ',') : '—'}</span>
        </div>
        <div className="mfp-stat-chip mfp-stat-chip--red">
          <span className="mfp-stat-chip__label">Minimum</span>
          <span className="mfp-stat-chip__val">{worst != null ? worst.toFixed(2).replace('.', ',') : '—'}</span>
        </div>
        <div className="mfp-stat-chip mfp-stat-chip--green">
          <span className="mfp-stat-chip__label">Admis</span>
          <span className="mfp-stat-chip__val">{passing}<small>/{filled.length}</small></span>
        </div>
        <div className="mfp-stat-chip mfp-stat-chip--teal">
          <span className="mfp-stat-chip__label">Taux</span>
          <span className="mfp-stat-chip__val">{passRate != null ? `${passRate}%` : '—'}</span>
        </div>
      </div>

      {/* ── Signature zone ── */}
      <div className="mfp-sigs">
        <div className="mfp-sig">
          <div className="mfp-sig__label">Signature du professeur</div>
          {subject.isSigned && subject.signedAt ? (
            <div className="mfp-sig__stamp">
              <div className="mfp-sig__stamp-name">{subject.signedByName || subject.teacherName || '—'}</div>
              <div className="mfp-sig__stamp-date">Signé le {fmtDate(subject.signedAt)}</div>
            </div>
          ) : (
            <div className="mfp-sig__line" />
          )}
          <div className="mfp-sig__name">{subject.teacherName || 'Nom du professeur'}</div>
        </div>
        <div className="mfp-sig">
          <div className="mfp-sig__label">Visa du Directeur / de la Directrice</div>
          <div className="mfp-sig__line" />
          <div className="mfp-sig__name">Signature et cachet</div>
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
