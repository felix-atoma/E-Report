import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mockExamsService } from '../../../services/mockExamsService';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import Loading from '../../../components/common/Loading/Loading';
import { subjectApprec } from '../../../utils/subjectApprec';
import { fmtSessionDates } from '../../../utils/fmtSessionDates';
import './MockExamFichePage.css';

const TYPE_LABELS = {
  BLANC: 'Examen Blanc',
  CEPE:  'C.E.P.E Blanc',
  BEPC:  'B.E.P.C Blanc',
  BAC1:  'Baccalauréat — Première Partie',
  BAC2:  'Baccalauréat — Deuxième Partie',
};


function apprColor(score) {
  const v = parseFloat(score);
  if (isNaN(v)) return undefined;
  if (v >= 14) return '#15803d';
  if (v >= 10) return '#1d4ed8';
  return '#dc2626';
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtSignDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/* ── Single subject fiche ─────────────────────────────────────────────────── */
function SubjectFiche({ examId, exam, subject, students, isEditable, isPublished, isAdmin, currentUser }) {
  const qc = useQueryClient();

  const [scores, setScores] = useState(() => {
    const init = {};
    students.forEach((s) => {
      const g = s.grades.find((g) => g.subjectId === subject.id);
      init[s.studentId] = g?.score != null ? String(g.score) : '';
    });
    return init;
  });

  const [coeff, setCoeff] = useState(subject.coefficient ?? 1);

  useEffect(() => {
    const init = {};
    students.forEach((s) => {
      const g = s.grades.find((g) => g.subjectId === subject.id);
      init[s.studentId] = g?.score != null ? String(g.score) : '';
    });
    setScores(init);
    setCoeff(subject.coefficient ?? 1);
    setDirty(false);
    setSaved(false);
  }, [students, subject.id, subject.coefficient]);

  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [dirty,    setDirty]    = useState(false);
  const [signing,    setSigning]    = useState(false);
  const [isSigned,   setIsSigned]   = useState(subject.isSigned ?? false);
  const [signedAt,   setSignedAt]   = useState(subject.signedAt ?? null);
  const [signedBy,   setSignedBy]   = useState(subject.signedByName ?? null);
  const [signedById, setSignedById] = useState(subject.signedById ?? null);

  // Sync signing state when subject prop changes (e.g. after refetch)
  useEffect(() => {
    setIsSigned(subject.isSigned ?? false);
    setSignedAt(subject.signedAt ?? null);
    setSignedBy(subject.signedByName ?? null);
    setSignedById(subject.signedById ?? null);
  }, [subject.isSigned, subject.signedAt, subject.signedByName, subject.signedById]);

  const handleSign = async () => {
    setSigning(true);
    try {
      const res = await mockExamsService.signSubjectFiche(examId, subject.id);
      setIsSigned(true);
      setSignedAt(res.data.signedAt);
      setSignedBy(res.data.signedByName);
      setSignedById(res.data.signedById);
      qc.invalidateQueries({ queryKey: ['mock-exam-fiche', examId] });
    } catch {
      alert('Erreur lors de la signature. Réessayez.');
    } finally {
      setSigning(false);
    }
  };

  const handleUnsign = async () => {
    if (!confirm('Annuler la signature et déverrouiller la fiche ?')) return;
    setSigning(true);
    try {
      await mockExamsService.unsignSubjectFiche(examId, subject.id);
      setIsSigned(false);
      setSignedAt(null);
      setSignedBy(null);
      setSignedById(null);
      qc.invalidateQueries({ queryKey: ['mock-exam-fiche', examId] });
    } catch {
      alert('Erreur. Réessayez.');
    } finally {
      setSigning(false);
    }
  };

  // A fiche is locked once signed; teacher must click "Modifier les notes" to unsign first
  const canUnsign = isAdmin || currentUser?.id === signedById;
  const isLocked = isSigned;

  const setScore = (studentId, val) => {
    setScores((p) => ({ ...p, [studentId]: val }));
    setDirty(true);
    setSaved(false);
  };

  const handleCoeffChange = (val) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= 20) {
      setCoeff(n);
      setDirty(true);
      setSaved(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const grades = students.map((s) => {
        const raw = scores[s.studentId];
        const num = raw !== '' && raw != null ? parseFloat(raw) : null;
        return { studentId: s.studentId, score: isNaN(num) ? null : num };
      });
      await mockExamsService.saveSubjectGrades(examId, subject.id, grades, coeff);
      setDirty(false);
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['mock-exam-fiche', examId] });
    } catch {
      alert('Erreur lors de la sauvegarde. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const filled = students
    .map((s) => {
      const v = scores[s.studentId];
      const n = v !== '' && v != null ? parseFloat(v) : null;
      return n != null && !isNaN(n) ? { s, v: n } : null;
    })
    .filter(Boolean);

  const avg     = filled.length > 0 ? Math.round((filled.reduce((a, x) => a + x.v, 0) / filled.length) * 100) / 100 : null;
  const best    = filled.length > 0 ? Math.max(...filled.map((x) => x.v)) : null;
  const worst   = filled.length > 0 ? Math.min(...filled.map((x) => x.v)) : null;
  const passing = filled.filter((x) => x.v >= 10).length;
  const variance = avg != null && filled.length > 1
    ? filled.reduce((sum, x) => sum + Math.pow(x.v - avg, 2), 0) / filled.length
    : null;
  const stddev   = variance != null ? Math.round(Math.sqrt(variance) * 100) / 100 : null;
  const passRate = filled.length > 0 ? Math.round((passing / filled.length) * 100) : null;

  // Dense rank per student for this subject (1, 2, 2, 3 …)
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
    <div className="mfiche-subject">
      {/* Subject band */}
      <div className="mfiche-subj-band">
        <div className="mfiche-subj-band__left">
          <span className="mfiche-subj-name">{subject.nameFr}</span>
          {/* Editable coefficient on screen */}
          <span className="mfiche-subj-coeff no-print">
            Coeff.&nbsp;
            {isEditable && !isPublished && !isLocked ? (
              <input
                type="number"
                className="mfiche-coeff-input"
                value={coeff}
                min={1} max={20} step={1}
                onChange={(e) => handleCoeffChange(e.target.value)}
                title="Coefficient de la matière"
              />
            ) : (
              <strong>{coeff}</strong>
            )}
          </span>
          {/* Print: always static */}
          <span className="mfiche-subj-coeff print-only">Coeff. <strong>{coeff}</strong></span>
        </div>
        <div className="mfiche-subj-band__right no-print">
          {subject.teacherName && (
            <span className="mfiche-subj-teacher">Prof : {subject.teacherName}</span>
          )}

          {/* Signed badge */}
          {isSigned && (
            <span className="mfiche-signed-badge">
              ✅ Signé{signedBy ? ` par ${signedBy}` : ''}{signedAt ? ` — ${fmtSignDate(signedAt)}` : ''}
            </span>
          )}

          {/* Save button — only when not signed */}
          {isEditable && !isPublished && !isLocked && (
            <>
              {dirty && (
                <button className="mfiche-save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? 'Enregistrement…' : '💾 Enregistrer'}
                </button>
              )}
              {saved && !dirty && <span className="mfiche-saved-hint">✓ Enregistré</span>}
            </>
          )}

          {/* Sign button — only after saving, when not yet signed */}
          {isEditable && !isPublished && !isLocked && !dirty && !isSigned && (
            <button className="mfiche-sign-btn" onClick={handleSign} disabled={signing}>
              {signing ? 'Signature…' : '✍️ Signer la fiche'}
            </button>
          )}

          {/* Unsign: admin always, or the teacher who originally signed */}
          {isSigned && canUnsign && (
            <button className="mfiche-unsign-btn" onClick={handleUnsign} disabled={signing}>
              {signing ? 'Annulation…' : '🔓 Modifier les notes'}
            </button>
          )}
        </div>
        {/* Print version shows teacher inline */}
        {subject.teacherName && (
          <div className="mfiche-subj-band__right print-only" style={{ fontStyle: 'italic', fontSize: '10px' }}>
            Prof : {subject.teacherName}
          </div>
        )}
      </div>

      {/* Grade table */}
      <table className="mfiche-table">
        <thead>
          <tr>
            <th className="mfiche-th mfiche-th--num">N°</th>
            <th className="mfiche-th mfiche-th--name">Nom et Prénoms</th>
            <th className="mfiche-th mfiche-th--mat">Matricule</th>
            <th className="mfiche-th mfiche-th--score">Note /20</th>
            <th className="mfiche-th mfiche-th--rank">Rang</th>
            <th className="mfiche-th mfiche-th--appre">Appréciation</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, i) => {
            const val    = scores[student.studentId] ?? '';
            const numVal = val !== '' ? parseFloat(val) : null;
            const isErr  = numVal != null && (numVal < 0 || numVal > 20);
            const app    = subjectApprec(val, subject);
            const rank   = rankMap.get(student.studentId) ?? null;
            return (
              <tr key={student.studentId} className={i % 2 === 0 ? 'mfiche-row' : 'mfiche-row mfiche-row--alt'}>
                <td className="mfiche-td mfiche-td--num">{i + 1}</td>
                <td className="mfiche-td mfiche-td--name">{student.studentName}</td>
                <td className="mfiche-td mfiche-td--mat">{student.admissionNumber}</td>
                <td className="mfiche-td mfiche-td--score">
                  {isEditable && !isPublished && !isLocked ? (
                    <input
                      type="number"
                      className={`mfiche-input${isErr ? ' mfiche-input--err' : ''}`}
                      min="0" max="20" step="0.25"
                      value={val}
                      onChange={(e) => setScore(student.studentId, e.target.value)}
                      placeholder="—"
                    />
                  ) : (
                    <span className={`mfiche-score-ro${numVal != null && numVal < 10 ? ' mfiche-score-ro--fail' : ''}`}>
                      {numVal != null ? numVal.toFixed(2).replace('.', ',') : '—'}
                    </span>
                  )}
                </td>
                <td className="mfiche-td mfiche-td--rank">
                  {rank != null ? (
                    <span className={`mfiche-rank${rank === 1 ? ' mfiche-rank--first' : ''}`}>{rank}</span>
                  ) : '—'}
                </td>
                <td className="mfiche-td mfiche-td--appre">
                  {app
                    ? <span style={{ color: apprColor(val), fontWeight: 600, fontSize: '10px' }}>{app}</span>
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="mfiche-stats-row">
            <td colSpan={6} className="mfiche-td mfiche-stats-cell">
              <span><strong>Effectif :</strong> {filled.length}/{students.length}</span>
              <span className="mfiche-sep">|</span>
              <span><strong>Moy. :</strong> {avg != null ? avg.toFixed(2).replace('.', ',') : '—'}/20</span>
              <span className="mfiche-sep">|</span>
              <span><strong>Écart-type :</strong> {stddev != null ? stddev.toFixed(2).replace('.', ',') : '—'}</span>
              <span className="mfiche-sep">|</span>
              <span><strong>Max :</strong> {best != null ? best.toFixed(2).replace('.', ',') : '—'}</span>
              <span className="mfiche-sep">|</span>
              <span><strong>Min :</strong> {worst != null ? worst.toFixed(2).replace('.', ',') : '—'}</span>
              <span className="mfiche-sep">|</span>
              <span><strong>Admis :</strong> {passing}/{filled.length}</span>
              <span className="mfiche-sep">|</span>
              <span><strong>Taux :</strong> {passRate != null ? `${passRate}%` : '—'}</span>
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Signature zone */}
      <div className="mfiche-sigs">
        <div className="mfiche-sig">
          <div className="mfiche-sig__title">Signature du professeur</div>
          {isSigned && signedAt ? (
            <div className="mfiche-sig__signed-stamp">
              <div className="mfiche-sig__signed-name">{signedBy || subject.teacherName || '—'}</div>
              <div className="mfiche-sig__signed-date">Signé le {fmtSignDate(signedAt)}</div>
            </div>
          ) : (
            <div className="mfiche-sig__space" />
          )}
          <div className="mfiche-sig__name">{subject.teacherName || 'Nom du professeur'}</div>
        </div>
        <div className="mfiche-sig">
          <div className="mfiche-sig__title">Visa du Directeur / de la Directrice</div>
          <div className="mfiche-sig__space" />
          <div className="mfiche-sig__name">Signature et cachet</div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
function MockExamFichePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['mock-exam-fiche', id],
    queryFn: () => mockExamsService.getFicheData(id).then((r) => r.data),
  });

  if (isLoading) return (
    <AppShell title="Fiches de notes — Examen blanc">
      <Loading />
    </AppShell>
  );

  if (isError || !data) return (
    <AppShell title="Fiches de notes — Examen blanc">
      <div className="mfiche-screen-error">Impossible de charger les fiches. Vérifiez l'identifiant.</div>
    </AppShell>
  );

  const { institution, exam, subjects, students, editableSubjectIds } = data;
  const isPublished = exam.status === 'PUBLISHED';

  // For teachers: only their assigned subjects. For admin: all subjects.
  const displaySubjects = editableSubjectIds !== null && editableSubjectIds.length > 0
    ? subjects.filter((s) => editableSubjectIds.includes(s.id))
    : editableSubjectIds === null
      ? subjects          // admin → all
      : subjects;         // teacher with no assignment → show all read-only

  const canEdit = (subjectId) =>
    editableSubjectIds === null || editableSubjectIds.includes(subjectId);

  return (
    <AppShell title={`Fiches de notes — ${exam.label}`}>
      {/* Screen actions bar */}
      <div className="mfiche-screen-bar no-print">
        <div className="mfiche-screen-bar__left">
          <Link to="#" onClick={(e) => { e.preventDefault(); history.back(); }} className="mfiche-back">
            ← Retour
          </Link>
          <span className="mfiche-screen-title">{exam.label}</span>
          <span className={`mfiche-status mfiche-status--${isPublished ? 'pub' : 'draft'}`}>
            {isPublished ? 'Publié' : 'Brouillon'}
          </span>
          <span className="mfiche-screen-meta">
            Classe&nbsp;: <strong>{exam.class?.name}</strong>
            &nbsp;·&nbsp;{exam.academicYear}
          </span>
        </div>
        <div className="mfiche-screen-bar__actions">
          <Link to={`/mock-exams/${id}/palmares`} className="mfiche-link-btn mfiche-link-btn--palmares">
            📊 Résultats
          </Link>
          <Link to={`/mock-exams/${id}/releve`} className="mfiche-link-btn mfiche-link-btn--releve">
            📄 Relevés de notes
          </Link>
          <Link
            to={`/mock-exams/${id}/fiche/print`}
            target="_blank"
            rel="noreferrer"
            className="mfiche-print-btn"
          >
            🖨 Imprimer / PDF
          </Link>
        </div>
      </div>

      {/* One card / printed page per subject */}
      <div className="mfiche-cards">
        {displaySubjects.map((subject) => (
          <div key={subject.id} className="mfiche-page-section">

            {/* Print header — hidden on screen, shown on print */}
            <div className="mfiche-print-header print-only">
              <div className="mfiche-print-header__left">
                {institution.logo && (
                  <img src={institution.logo} alt="logo" className="mfiche-logo" />
                )}
                <div>
                  {institution.circonscription && (
                    <div className="mfiche-circ">{institution.circonscription}</div>
                  )}
                  <div className="mfiche-school-name">{institution.name}</div>
                  {institution.address && (
                    <div className="mfiche-school-addr">{institution.address}</div>
                  )}
                </div>
              </div>
              <div className="mfiche-print-header__right">
                <div className="mfiche-doc-title">FICHE DE NOTES</div>
                <div className="mfiche-exam-type">{TYPE_LABELS[exam.examType] ?? exam.examType}</div>
                <div className="mfiche-exam-label">{exam.label}</div>
                <div className="mfiche-exam-meta">
                  <span>Classe : <strong>{exam.class?.name}</strong></span>
                  <span>Année : <strong>{exam.academicYear}</strong></span>
                </div>
                {fmtSessionDates(exam.examDate, exam.examEndDate) && (
                  <div className="mfiche-exam-date">{fmtSessionDates(exam.examDate, exam.examEndDate)}</div>
                )}
              </div>
            </div>
            <div className="mfiche-print-divider print-only" />

            <SubjectFiche
              examId={id}
              exam={exam}
              subject={subject}
              students={students}
              isEditable={canEdit(subject.id)}
              isPublished={isPublished}
              isAdmin={isAdmin}
              currentUser={user}
            />
          </div>
        ))}
      </div>
    </AppShell>
  );
}

export default MockExamFichePage;
