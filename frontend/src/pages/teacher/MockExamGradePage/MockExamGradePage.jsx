import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mockExamsService } from '../../../services/mockExamsService';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import Loading from '../../../components/common/Loading/Loading';
import './MockExamGradePage.css';

const APPRE_COLOR = {
  'Très Bien': '#15803d', 'Bien': '#1d4ed8',
  'Assez Bien': '#7c3aed', 'Passable': '#d97706', 'Insuffisant': '#dc2626',
};

function apprec(score) {
  if (score == null || score === '') return '';
  const v = parseFloat(score);
  if (isNaN(v)) return '';
  if (v >= 16) return 'Très Bien';
  if (v >= 14) return 'Bien';
  if (v >= 12) return 'Assez Bien';
  if (v >= 10) return 'Passable';
  return 'Insuffisant';
}

function computeAvg(gradesRow, subjects) {
  let totalPts = 0, totalCoeff = 0;
  subjects.forEach((subj) => {
    const raw = gradesRow[subj.id];
    if (raw == null || raw === '') return;
    const v = parseFloat(raw);
    if (!isNaN(v)) {
      totalPts += v * subj.coefficient;
      totalCoeff += subj.coefficient;
    }
  });
  if (totalCoeff === 0) return null;
  return Math.round((totalPts / totalCoeff) * 100) / 100;
}

function MockExamGradePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const base = isAdmin ? '/admin' : '/teacher';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['mock-exam-sheet', id],
    queryFn: () => mockExamsService.getGradeSheet(id).then((r) => r.data),
  });

  // grades[studentId][subjectId] = score string
  const [grades, setGrades] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Seed state from fetched data
  useEffect(() => {
    if (!data) return;
    const init = {};
    data.students.forEach((s) => {
      init[s.studentId] = {};
      s.grades.forEach((g) => {
        init[s.studentId][g.subjectId] = g.score != null ? String(g.score) : '';
      });
    });
    setGrades(init);
    setDirty(false);
  }, [data]);

  const setScore = (studentId, subjectId, val) => {
    setGrades((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [subjectId]: val },
    }));
    setDirty(true);
    setSaved(false);
  };

  // Build ranks on-the-fly
  const ranks = useMemo(() => {
    if (!data) return {};
    const avgs = data.students.map((s) => ({
      id: s.studentId,
      avg: computeAvg(grades[s.studentId] ?? {}, data.subjects),
    }));
    const sorted = avgs.filter((a) => a.avg != null).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
    const map = {};
    sorted.forEach((a, i) => { map[a.id] = i + 1; });
    return map;
  }, [grades, data]);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    const payload = [];
    const subjsToSave = editableSubjectIds
      ? data.subjects.filter((subj) => editableSubjectIds.includes(subj.id))
      : data.subjects;
    data.students.forEach((s) => {
      subjsToSave.forEach((subj) => {
        const raw = grades[s.studentId]?.[subj.id];
        const score = raw !== '' && raw != null ? parseFloat(raw) : null;
        payload.push({
          studentId: s.studentId,
          subjectId: subj.id,
          score: isNaN(score) ? null : score,
          coefficient: subj.coefficient,
        });
      });
    });
    try {
      await mockExamsService.saveGrades(id, payload);
      await qc.invalidateQueries({ queryKey: ['mock-exam-sheet', id] });
      setDirty(false);
      setSaved(true);
    } catch {
      alert('Erreur lors de la sauvegarde. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm('Publier ce relevé ? Les notes ne pourront plus être modifiées.')) return;
    await mockExamsService.publish(id);
    qc.invalidateQueries({ queryKey: ['mock-exam-sheet', id] });
    navigate(`/mock-exams/${id}/releve`);
  };

  if (isLoading) return <AppShell title="Saisie des notes"><Loading /></AppShell>;
  if (isError || !data) return (
    <AppShell title="Saisie des notes">
      <div className="meg-error">Impossible de charger la feuille de notes. Vérifiez l'identifiant.</div>
    </AppShell>
  );

  const { exam, subjects, students, editableSubjectIds } = data;
  const isPublished = exam.status === 'PUBLISHED';
  // null = admin (all editable); array = teacher (only assigned subjects)
  const canEditSubject = (subjId) =>
    !isPublished && (editableSubjectIds === null || editableSubjectIds.includes(subjId));

  return (
    <AppShell title={`Saisie — ${exam.label}`}>
      <div className="meg-page">

        {/* Header */}
        <div className="meg-header">
          <div className="meg-header__left">
            <Link to={`${base}/mock-exams`} className="meg-back">← Retour aux relevés</Link>
            <h1 className="meg-title">{exam.label}</h1>
            <div className="meg-meta">
              <span>🏫 {exam.class?.name}</span>
              <span>📅 {exam.examDate ? new Date(exam.examDate).toLocaleDateString('fr-FR') : '—'}</span>
              <span className={`meg-status meg-status--${isPublished ? 'pub' : 'draft'}`}>
                {isPublished ? 'Publié' : 'Brouillon'}
              </span>
            </div>
          </div>

          {!isPublished && (
            <div className="meg-header__actions">
              {dirty && (
                <button className="meg-btn meg-btn--save" onClick={handleSave} disabled={saving}>
                  {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
                </button>
              )}
              {saved && !dirty && (
                <span className="meg-saved-hint">✓ Sauvegardé</span>
              )}
              <button className="meg-btn meg-btn--publish" onClick={handlePublish}>
                Publier
              </button>
            </div>
          )}

          {isPublished && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link to={`/mock-exams/${id}/palmares`} className="meg-btn meg-btn--palmares">
                Palmarès →
              </Link>
              <Link to={`/mock-exams/${id}/releve`} className="meg-btn meg-btn--releve">
                Relevés de notes →
              </Link>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="meg-stats">
          <div className="meg-stat">
            <span className="meg-stat__val">{students.length}</span>
            <span className="meg-stat__lbl">Élèves</span>
          </div>
          <div className="meg-stat">
            <span className="meg-stat__val">{subjects.length}</span>
            <span className="meg-stat__lbl">Matières</span>
          </div>
          <div className="meg-stat">
            <span className="meg-stat__val">
              {subjects.reduce((s, subj) => s + subj.coefficient, 0)}
            </span>
            <span className="meg-stat__lbl">Coeff. total</span>
          </div>
        </div>

        {/* Grade table */}
        <div className="meg-table-wrap">
          <table className="meg-table">
            <thead>
              <tr>
                <th className="meg-th meg-th--student" rowSpan={2}>Élève</th>
                {subjects.map((subj) => (
                  <th key={subj.id} className="meg-th meg-th--subject">
                    <div className="meg-subject-name">{subj.nameFr}</div>
                    <div className="meg-subject-coeff">Coeff. {subj.coefficient}</div>
                  </th>
                ))}
                <th className="meg-th meg-th--avg" rowSpan={2}>Moyenne</th>
                <th className="meg-th meg-th--rank" rowSpan={2}>Rang</th>
              </tr>
              <tr>
                {subjects.map((subj) => (
                  <th key={`max-${subj.id}`} className="meg-th meg-th--max">/20</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const avg = computeAvg(grades[student.studentId] ?? {}, subjects);
                const rank = ranks[student.studentId];
                const app = apprec(avg);

                return (
                  <tr key={student.studentId} className="meg-row">
                    <td className="meg-cell meg-cell--student">
                      <div className="meg-student-name">{student.studentName}</div>
                      <div className="meg-student-num">{student.admissionNumber}</div>
                    </td>

                    {subjects.map((subj) => {
                      const val = grades[student.studentId]?.[subj.id] ?? '';
                      const numVal = val !== '' ? parseFloat(val) : null;
                      const isErr = numVal != null && (numVal < 0 || numVal > 20);
                      return (
                        <td key={subj.id} className="meg-cell meg-cell--score">
                          {canEditSubject(subj.id) ? (
                            <input
                              type="number"
                              className={`meg-input${isErr ? ' meg-input--err' : ''}`}
                              min="0" max="20" step="0.25"
                              value={val}
                              onChange={(e) => setScore(student.studentId, subj.id, e.target.value)}
                              placeholder="—"
                            />
                          ) : (
                            <span className="meg-score-readonly">
                              {val !== '' ? parseFloat(val).toFixed(2) : '—'}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    <td className="meg-cell meg-cell--avg">
                      {avg != null ? (
                        <>
                          <span className="meg-avg">{avg.toFixed(2).replace('.', ',')}</span>
                          <span className="meg-appre" style={{ color: APPRE_COLOR[app] }}>{app}</span>
                        </>
                      ) : '—'}
                    </td>

                    <td className="meg-cell meg-cell--rank">
                      {rank != null ? (
                        <span className={`meg-rank${rank === 1 ? ' meg-rank--first' : ''}`}>
                          {rank}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!isPublished && (
          <div className="meg-footer">
            <button className="meg-btn meg-btn--save" onClick={handleSave} disabled={saving || !dirty}>
              {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
            </button>
            {saved && !dirty && <span className="meg-saved-hint">✓ Notes sauvegardées</span>}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default MockExamGradePage;
