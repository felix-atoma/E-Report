import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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

// ── Appreciation templates ─────────────────────────────────────────────────
const APPRECIATION_TEMPLATES = {
  '🟢 Excellent': [
    'Élève brillant(e), sérieux(se) et très travailleur(se). Continuez ainsi !',
    'Résultats excellents. Très bonne maîtrise des matières. Élève exemplaire.',
    'Félicitations ! Un travail remarquable et une attitude irréprochable en classe.',
    'Très bon(ne) élève. Régulier(e) dans l\'effort et toujours attentif(ve).',
    'Travail excellent, participation active. Digne d\'être un modèle pour la classe.',
  ],
  '🔵 Bien': [
    'Bons résultats. Élève sérieux(se) qui mérite d\'être encouragé(e).',
    'Bonne trimestre dans l\'ensemble. Peut encore progresser en s\'investissant davantage.',
    'Des efforts notables ont été fournis. Continuez sur cette lancée.',
    'Bon(ne) élève, mais doit être plus régulier(e) dans le travail.',
    'Résultats satisfaisants. Il/Elle a les capacités pour faire encore mieux.',
  ],
  '🟡 Passable': [
    'Résultats moyens. Un effort supplémentaire est nécessaire pour progresser.',
    'Peut mieux faire. Doit se montrer plus attentif(ve) et plus régulier(e) dans le travail.',
    'Des lacunes persistent. Un travail sérieux à la maison est indispensable.',
    'Trimestre mitigé. Les capacités sont là, mais le travail n\'est pas régulier.',
    'Résultats insuffisants dans certaines matières. Besoin de renforcement.',
  ],
  '🔴 Insuffisant': [
    'Résultats très insuffisants. Un travail sérieux est indispensable pour rattraper le retard.',
    'Élève qui ne fournit pas les efforts nécessaires. Une remise en question s\'impose.',
    'Attention ! Le niveau actuel risque de compromettre le passage en classe supérieure.',
    'Des absences répétées et un manque de travail pénalisent les résultats.',
    'Doit impérativement revoir ses méthodes de travail et solliciter de l\'aide.',
  ],
};

function TemplatesPicker({ onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="appr-picker" ref={ref}>
      <button
        type="button"
        className="appr-picker__toggle"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        title="Choisir une appréciation type"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        Appréciations types
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points={open ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
        </svg>
      </button>

      {open && (
        <div className="appr-picker__panel">
          {Object.entries(APPRECIATION_TEMPLATES).map(([category, phrases]) => (
            <div key={category} className="appr-picker__group">
              <p className="appr-picker__category">{category}</p>
              {phrases.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  className="appr-picker__item"
                  onClick={() => { onSelect(phrase); setOpen(false); }}
                >
                  {phrase}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
    const classSubjects = report.class?.subjects ?? [];
    const rows = classSubjects.map((cs) => {
      const subj = cs.subject;
      const existing = grades.find((g) => g.subjectId === subj.id);
      return {
        subjectId:   subj.id,
        subjectName: subj.nameFr,
        subjectCode: subj.code ?? '',
        coefficient: existing?.coefficient ?? 1,
        score:       existing?.score != null ? String(existing.score) : '',
        comment:     existing?.comment ?? '',
      };
    });
    setGradeRows(rows);
    setComment(report.teacherComment ?? '');
    setAbsences(report.attendanceAbsent != null ? String(report.attendanceAbsent) : '');
    setLates(report.attendanceLate != null ? String(report.attendanceLate) : '');
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
          attendanceAbsent: absences !== '' ? Number(absences) : undefined,
          attendanceLate:   lates    !== '' ? Number(lates)    : undefined,
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
            {locked && (
              <Link
                to={`/reports/${id}/print`}
                target="_blank"
                rel="noreferrer"
                className="edit-report__print-btn"
              >
                🖨️ Imprimer / PDF
              </Link>
            )}
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
            <div className="edit-report__comment-header">
              <h3 className="edit-report__section-title">Appréciation du professeur principal</h3>
              <TemplatesPicker
                onSelect={(phrase) => { setComment(phrase); setDirty(true); }}
                disabled={locked}
              />
            </div>
            <textarea
              className="edit-report__textarea"
              rows={5}
              value={teacherComment}
              disabled={locked}
              placeholder="Observations générales sur l'élève… ou choisissez une appréciation type ci-dessus."
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
