import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nationalExamResultsService } from '../../../services/nationalExamResultsService';
import { downloadCSV } from '../../../utils/csvExport';
import AppShell from '../../../components/layout/AppShell/AppShell';
import './NationalExamResultsPage.css';

const EXAM_TYPES = [
  { value: 'CEPD',  label: 'CEPD'  },
  { value: 'BEPC',  label: 'BEPC'  },
  { value: 'BAC',   label: 'BAC'   },
  { value: 'BTS',   label: 'BTS'   },
  { value: 'CAP',   label: 'CAP'   },
  { value: 'OTHER', label: 'Autre' },
];

const RESULT_STATUS = [
  { value: 'ADMIS',   label: 'Admis',    color: '#15803d', bg: '#dcfce7' },
  { value: 'AJOURNE', label: 'Ajourné',  color: '#b45309', bg: '#fef3c7' },
  { value: 'ABSENT',  label: 'Absent',   color: '#6b7280', bg: '#f3f4f6' },
  { value: 'ELIMINE', label: 'Éliminé',  color: '#b91c1c', bg: '#fee2e2' },
];

const EMPTY_FORM = {
  studentId: '',
  examType: 'BEPC',
  session: '',
  academicYear: '',
  result: 'ADMIS',
  series: '',
  mention: '',
  totalScore: '',
  center: '',
  registrationNumber: '',
  notes: '',
};

function ResultBadge({ result }) {
  const cfg = RESULT_STATUS.find((r) => r.value === result) ?? RESULT_STATUS[0];
  return (
    <span className="ner-badge" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

export default function NationalExamResultsPage() {
  const qc = useQueryClient();
  const [examFilter, setExamFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [search, setSearch] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['national-exam-results', examFilter, yearFilter, search],
    queryFn: () =>
      nationalExamResultsService
        .list({
          examType: examFilter || undefined,
          academicYear: yearFilter || undefined,
          search: search || undefined,
        })
        .then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['national-exam-summary', examFilter, yearFilter],
    queryFn: () =>
      nationalExamResultsService
        .summary({
          examType: examFilter || undefined,
          academicYear: yearFilter || undefined,
        })
        .then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => nationalExamResultsService.upsert(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['national-exam-results'] });
      qc.invalidateQueries({ queryKey: ['national-exam-summary'] });
      closePanel();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => nationalExamResultsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['national-exam-results'] });
      qc.invalidateQueries({ queryKey: ['national-exam-summary'] });
    },
  });

  function openPanel() {
    setForm(EMPTY_FORM);
    setErrors({});
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.studentId.trim()) e.studentId = 'Requis';
    if (!form.session.trim()) e.session = 'Requis';
    if (!form.academicYear.trim()) e.academicYear = 'Requis';
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    saveMutation.mutate({
      ...form,
      totalScore: form.totalScore !== '' ? Number(form.totalScore) : undefined,
      series: form.series || undefined,
      mention: form.mention || undefined,
      center: form.center || undefined,
      registrationNumber: form.registrationNumber || undefined,
      notes: form.notes || undefined,
    });
  }

  const studentName = (r) => r.student?.user?.name ?? r.student?.admissionNumber ?? r.studentId;

  return (
    <AppShell title="Examens Nationaux">
      <div className="ner-page">
        <div className="ner-page__header">
          <div>
            <h1 className="ner-page__title">Examens Nationaux</h1>
            <p className="ner-page__subtitle">CEPD, BEPC, BAC, BTS, CAP — résultats officiels</p>
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button
              className="ner-page__btn-csv"
              onClick={() => {
                const rows = results.map((r) => ({
                  Matricule: r.student?.admissionNumber ?? '',
                  Nom: r.student?.user?.name ?? '',
                  Examen: r.examType,
                  Session: r.session,
                  'Année scolaire': r.academicYear,
                  Série: r.series ?? '',
                  Résultat: r.result,
                  Mention: r.mention ?? '',
                  Score: r.totalScore ?? '',
                  Centre: r.center ?? '',
                  'N° Table': r.registrationNumber ?? '',
                }));
                downloadCSV(rows, `examens-nationaux-${new Date().toISOString().slice(0,10)}.csv`);
              }}
            >
              ↓ CSV
            </button>
            <button className="ner-page__btn-add" onClick={openPanel}>+ Ajouter un résultat</button>
          </div>
        </div>

        {/* Summary bar */}
        {summary && (
          <div className="ner-summary">
            <div className="ner-summary__stat">
              <span className="ner-summary__num">{summary.total}</span>
              <span className="ner-summary__lbl">Total</span>
            </div>
            <div className="ner-summary__stat ner-summary__stat--admis">
              <span className="ner-summary__num">{summary.admis}</span>
              <span className="ner-summary__lbl">Admis</span>
            </div>
            <div className="ner-summary__stat ner-summary__stat--ajourne">
              <span className="ner-summary__num">{summary.ajourne}</span>
              <span className="ner-summary__lbl">Ajourné</span>
            </div>
            <div className="ner-summary__stat ner-summary__stat--absent">
              <span className="ner-summary__num">{summary.absent}</span>
              <span className="ner-summary__lbl">Absent</span>
            </div>
            <div className="ner-summary__stat ner-summary__stat--rate">
              <span className="ner-summary__num">{summary.passRate}%</span>
              <span className="ner-summary__lbl">Taux de réussite</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="ner-page__filters">
          <input
            className="ner-page__search"
            placeholder="Rechercher par élève, session…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="ner-page__tabs">
            <button
              className={`ner-page__tab${examFilter === '' ? ' active' : ''}`}
              onClick={() => setExamFilter('')}
            >
              Tous
            </button>
            {EXAM_TYPES.map((t) => (
              <button
                key={t.value}
                className={`ner-page__tab${examFilter === t.value ? ' active' : ''}`}
                onClick={() => setExamFilter(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            className="ner-page__year"
            placeholder="Année scolaire"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <p className="ner-page__loading">Chargement…</p>
        ) : results.length === 0 ? (
          <div className="ner-page__empty">
            <span className="ner-page__empty-icon">🎓</span>
            <p>Aucun résultat d'examen enregistré.</p>
          </div>
        ) : (
          <div className="ner-page__table-wrap">
            <table className="ner-table">
              <thead>
                <tr>
                  <th>Élève</th>
                  <th>Examen</th>
                  <th>Session</th>
                  <th>Année</th>
                  <th>Série</th>
                  <th>Résultat</th>
                  <th>Mention</th>
                  <th>Score</th>
                  <th>Centre</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td className="ner-table__name">{studentName(r)}</td>
                    <td><span className="ner-table__exam">{r.examType}</span></td>
                    <td>{r.session}</td>
                    <td>{r.academicYear}</td>
                    <td>{r.series ?? '—'}</td>
                    <td><ResultBadge result={r.result} /></td>
                    <td>{r.mention ?? '—'}</td>
                    <td>{r.totalScore != null ? r.totalScore : '—'}</td>
                    <td className="ner-table__center">{r.center ?? '—'}</td>
                    <td>
                      <button
                        className="ner-table__btn-del"
                        onClick={() => {
                          if (window.confirm('Supprimer ce résultat ?')) deleteMutation.mutate(r.id);
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* OffCanvas Panel */}
      {panelOpen && (
        <div className="ner-panel-overlay" onClick={closePanel}>
          <div className="ner-panel" onClick={(e) => e.stopPropagation()}>
            <div className="ner-panel__header">
              <h2>Nouveau résultat</h2>
              <button className="ner-panel__close" onClick={closePanel}>✕</button>
            </div>

            <form className="ner-panel__form" onSubmit={handleSubmit}>
              <div className="ner-panel__group">
                <label>ID Élève *</label>
                <input
                  value={form.studentId}
                  onChange={(e) => set('studentId', e.target.value)}
                  placeholder="UUID de l'élève"
                />
                {errors.studentId && <span className="ner-panel__error">{errors.studentId}</span>}
              </div>

              <div className="ner-panel__row2">
                <div className="ner-panel__group">
                  <label>Type d'examen</label>
                  <select value={form.examType} onChange={(e) => set('examType', e.target.value)}>
                    {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="ner-panel__group">
                  <label>Résultat</label>
                  <select value={form.result} onChange={(e) => set('result', e.target.value)}>
                    {RESULT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="ner-panel__row2">
                <div className="ner-panel__group">
                  <label>Session *</label>
                  <input
                    value={form.session}
                    onChange={(e) => set('session', e.target.value)}
                    placeholder="ex: Juin 2025"
                  />
                  {errors.session && <span className="ner-panel__error">{errors.session}</span>}
                </div>
                <div className="ner-panel__group">
                  <label>Année scolaire *</label>
                  <input
                    value={form.academicYear}
                    onChange={(e) => set('academicYear', e.target.value)}
                    placeholder="ex: 2024-2025"
                  />
                  {errors.academicYear && <span className="ner-panel__error">{errors.academicYear}</span>}
                </div>
              </div>

              <div className="ner-panel__row2">
                <div className="ner-panel__group">
                  <label>Série</label>
                  <input
                    value={form.series}
                    onChange={(e) => set('series', e.target.value)}
                    placeholder="ex: D, A4, C"
                  />
                </div>
                <div className="ner-panel__group">
                  <label>Mention</label>
                  <input
                    value={form.mention}
                    onChange={(e) => set('mention', e.target.value)}
                    placeholder="ex: Très Bien, Bien"
                  />
                </div>
              </div>

              <div className="ner-panel__row2">
                <div className="ner-panel__group">
                  <label>Score total</label>
                  <input
                    type="number"
                    value={form.totalScore}
                    onChange={(e) => set('totalScore', e.target.value)}
                    placeholder="ex: 245.5"
                  />
                </div>
                <div className="ner-panel__group">
                  <label>Centre</label>
                  <input
                    value={form.center}
                    onChange={(e) => set('center', e.target.value)}
                    placeholder="Nom du centre d'examen"
                  />
                </div>
              </div>

              <div className="ner-panel__group">
                <label>N° d'inscription</label>
                <input
                  value={form.registrationNumber}
                  onChange={(e) => set('registrationNumber', e.target.value)}
                  placeholder="Optionnel"
                />
              </div>

              <div className="ner-panel__group">
                <label>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={2}
                  placeholder="Observations…"
                />
              </div>

              <div className="ner-panel__footer">
                <button type="button" className="ner-panel__btn-cancel" onClick={closePanel}>Annuler</button>
                <button type="submit" className="ner-panel__btn-save" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
