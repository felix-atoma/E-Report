import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { reportsService } from '../../../services/reportsService';
import { gradesService } from '../../../services/gradesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import StatusPill from '../../../components/common/StatusPill/StatusPill';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog';
import Loading from '../../../components/common/Loading/Loading';
import './EditReportCardPage.css';

function calculateAverage(gradeRows) {
  const valid = gradeRows.filter((g) => g.score !== '' && g.coefficient);
  if (!valid.length) return null;
  const totalPoints = valid.reduce((s, g) => s + Number(g.score) * Number(g.coefficient), 0);
  const totalCoef   = valid.reduce((s, g) => s + Number(g.coefficient), 0);
  return totalCoef > 0 ? Math.round((totalPoints / totalCoef) * 100) / 100 : null;
}

function getMention(avg) {
  if (avg === null) return '';
  if (avg >= 18) return 'Excellent';
  if (avg >= 16) return 'Très Bien';
  if (avg >= 14) return 'Bien';
  if (avg >= 12) return 'Assez Bien';
  if (avg >= 10) return 'Passable';
  return 'Insuffisant';
}

function GradeTable({ rows, onChange, locked }) {
  return (
    <div className="grade-table-wrap">
      <table className="grade-table">
        <thead>
          <tr>
            <th className="grade-table__th grade-table__th--subject">Matière</th>
            <th className="grade-table__th">Coef.</th>
            <th className="grade-table__th">Note /20</th>
            <th className="grade-table__th">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const weighted = row.score !== '' && row.coefficient
              ? (Number(row.score) * Number(row.coefficient)).toFixed(2)
              : '—';
            return (
              <tr key={row.subjectId} className="grade-table__row">
                <td className="grade-table__td grade-table__td--subject">
                  <div className="grade-table__subject-name">{row.subjectName}</div>
                  {row.subjectCode && (
                    <div className="grade-table__subject-code">{row.subjectCode}</div>
                  )}
                </td>
                <td className="grade-table__td">
                  <input
                    type="number"
                    className="grade-table__input grade-table__input--coef"
                    value={row.coefficient}
                    min="0.5" max="10" step="0.5"
                    disabled={locked}
                    onChange={(e) => onChange(row.subjectId, 'coefficient', e.target.value)}
                  />
                </td>
                <td className="grade-table__td">
                  <input
                    type="number"
                    className={`grade-table__input grade-table__input--score ${
                      row.score !== '' && Number(row.score) < 10 ? 'grade-table__input--fail' : ''
                    }`}
                    value={row.score}
                    min="0" max="20" step="0.25"
                    placeholder="—"
                    disabled={locked}
                    onChange={(e) => onChange(row.subjectId, 'score', e.target.value)}
                  />
                </td>
                <td className="grade-table__td grade-table__td--weighted">
                  {weighted}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EditReportCardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [gradeRows, setGradeRows]         = useState([]);
  const [teacherComment, setComment]      = useState('');
  const [absences, setAbsences]           = useState('');
  const [lates, setLates]                 = useState('');
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [dirty, setDirty]                 = useState(false);

  const { data: report, isLoading: loadingReport } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsService.get(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: grades, isLoading: loadingGrades } = useQuery({
    queryKey: ['grades', id],
    queryFn: () => gradesService.getForReport(id).then((r) => r.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (!report || !grades) return;
    const subjects = report.class?.subjects ?? [];
    const rows = subjects.map((subj) => {
      const existing = grades.find((g) => g.subjectId === subj.id);
      return {
        subjectId:   subj.id,
        subjectName: subj.name,
        subjectCode: subj.code ?? '',
        coefficient: existing?.coefficient ?? 1,
        score:       existing?.score != null ? String(existing.score) : '',
        comment:     existing?.comment ?? '',
      };
    });
    setGradeRows(rows);
    setComment(report.teacherComment ?? '');
    setAbsences(report.absences != null ? String(report.absences) : '');
    setLates(report.lates != null ? String(report.lates) : '');
  }, [report, grades]);

  const handleGradeChange = useCallback((subjectId, field, value) => {
    setGradeRows((prev) =>
      prev.map((r) => r.subjectId === subjectId ? { ...r, [field]: value } : r)
    );
    setDirty(true);
  }, []);

  const saveMutation = useMutation({
    mutationFn: () => {
      const gradesToSave = gradeRows
        .filter((r) => r.score !== '')
        .map((r) => ({
          subjectId:   r.subjectId,
          score:       Number(r.score),
          coefficient: Number(r.coefficient),
        }));
      return Promise.all([
        gradesService.bulkUpsert(id, gradesToSave),
        reportsService.update(id, {
          teacherComment: teacherComment || undefined,
          absences:       absences !== '' ? Number(absences) : undefined,
          lates:          lates    !== '' ? Number(lates)    : undefined,
        }),
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report', id] });
      qc.invalidateQueries({ queryKey: ['grades', id] });
      toast.success('Brouillon enregistré');
      setDirty(false);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de sauvegarde'),
  });

  const submitMutation = useMutation({
    mutationFn: () => reportsService.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report', id] });
      toast.success('Bulletin soumis pour révision');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de soumission'),
  });

  const publishMutation = useMutation({
    mutationFn: () => reportsService.publish(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report', id] });
      toast.success('Bulletin publié — livraison en cours');
      setConfirmPublish(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? 'Erreur de publication');
      setConfirmPublish(false);
    },
  });

  if (loadingReport || loadingGrades) {
    return <AppShell title="Bulletin"><Loading /></AppShell>;
  }

  if (!report) {
    return (
      <AppShell title="Bulletin">
        <p className="edit-report__error">Bulletin introuvable.</p>
      </AppShell>
    );
  }

  const locked   = report.status === 'PUBLISHED';
  const canSubmit  = report.status === 'DRAFT';
  const canPublish = report.status === 'REVIEW' || report.status === 'DRAFT';

  const avg = calculateAverage(gradeRows);
  const mention = getMention(avg);

  const termLabel = report.termName ?? `Trimestre ${report.termNumber}`;

  return (
    <AppShell title={`Bulletin — ${report.class?.name ?? ''}`}>
      <PageHeader
        title={`${report.class?.name ?? 'Bulletin'} — ${termLabel}`}
        subtitle={report.academicYear}
        actions={
          <div className="edit-report__header-actions">
            <StatusPill status={report.status} />
            {!locked && (
              <Button
                variant="ghost"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !dirty}
              >
                {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            )}
            {canSubmit && (
              <Button
                variant="secondary"
                onClick={() => { saveMutation.mutate(); submitMutation.mutate(); }}
                disabled={submitMutation.isPending}
              >
                Soumettre
              </Button>
            )}
            {canPublish && (
              <Button onClick={() => setConfirmPublish(true)} disabled={publishMutation.isPending}>
                Publier
              </Button>
            )}
          </div>
        }
      />

      <div className="edit-report__layout">
        {/* Grade entry */}
        <Card className="edit-report__grades-card">
          <div className="edit-report__grades-header">
            <h3 className="edit-report__section-title">Saisie des notes</h3>
            {avg !== null && (
              <div className="edit-report__avg">
                <span className="edit-report__avg-value">
                  {avg.toFixed(2).replace('.', ',')}
                </span>
                <span className="edit-report__avg-label">/20</span>
                <span className={`edit-report__mention edit-report__mention--${avg >= 10 ? 'pass' : 'fail'}`}>
                  {mention}
                </span>
              </div>
            )}
          </div>

          {gradeRows.length === 0 ? (
            <p className="edit-report__empty">
              Aucune matière assignée à cette classe. Ajoutez des matières depuis la page Classes.
            </p>
          ) : (
            <GradeTable rows={gradeRows} onChange={handleGradeChange} locked={locked} />
          )}
        </Card>

        {/* Attendance + Comments */}
        <div className="edit-report__sidebar">
          <Card className="edit-report__attendance-card">
            <h3 className="edit-report__section-title">Présences</h3>
            <div className="edit-report__attendance-row">
              <div className="edit-report__attendance-field">
                <label className="edit-report__field-label">Absences (h)</label>
                <input
                  type="number" min="0"
                  className="edit-report__number-input"
                  value={absences}
                  disabled={locked}
                  onChange={(e) => { setAbsences(e.target.value); setDirty(true); }}
                />
              </div>
              <div className="edit-report__attendance-field">
                <label className="edit-report__field-label">Retards</label>
                <input
                  type="number" min="0"
                  className="edit-report__number-input"
                  value={lates}
                  disabled={locked}
                  onChange={(e) => { setLates(e.target.value); setDirty(true); }}
                />
              </div>
            </div>
          </Card>

          <Card className="edit-report__comment-card">
            <h3 className="edit-report__section-title">Appréciation du professeur principal</h3>
            <textarea
              className="edit-report__textarea"
              rows={5}
              value={teacherComment}
              disabled={locked}
              placeholder="Observations générales sur l'élève…"
              onChange={(e) => { setComment(e.target.value); setDirty(true); }}
            />
          </Card>

          {/* Summary */}
          {avg !== null && (
            <Card className="edit-report__summary">
              <h3 className="edit-report__section-title">Récapitulatif</h3>
              <div className="edit-report__summary-row">
                <span>Moyenne générale</span>
                <strong>{avg.toFixed(2).replace('.', ',')} / 20</strong>
              </div>
              <div className="edit-report__summary-row">
                <span>Mention</span>
                <strong>{mention}</strong>
              </div>
              <div className="edit-report__summary-row">
                <span>Matières saisies</span>
                <strong>{gradeRows.filter((r) => r.score !== '').length} / {gradeRows.length}</strong>
              </div>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        onConfirm={() => publishMutation.mutate()}
        loading={publishMutation.isPending}
        title="Publier le bulletin"
        message="Publier ce bulletin ? Le PDF sera généré et envoyé aux parents selon leur statut de paiement. Cette action est irréversible."
        confirmLabel="Publier"
        variant="primary"
      />
    </AppShell>
  );
}

export default EditReportCardPage;
