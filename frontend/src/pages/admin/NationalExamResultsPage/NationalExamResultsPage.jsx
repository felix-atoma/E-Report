import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { nationalExamResultsService } from '../../../services/nationalExamResultsService';
import { downloadCSV } from '../../../utils/csvExport';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Input from '../../../components/common/Input/Input';
import Textarea from '../../../components/common/Textarea/Textarea';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import Card from '../../../components/common/Card/Card';
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
  { value: 'ADMIS',   label: 'Admis',   color: '#15803d', bg: '#dcfce7' },
  { value: 'AJOURNE', label: 'Ajourné', color: '#b45309', bg: '#fef3c7' },
  { value: 'ABSENT',  label: 'Absent',  color: '#6b7280', bg: '#f3f4f6' },
  { value: 'ELIMINE', label: 'Éliminé', color: '#b91c1c', bg: '#fee2e2' },
];

const EMPTY_FORM = {
  studentId: '', examType: 'BEPC', session: '', academicYear: '',
  result: 'ADMIS', series: '', mention: '', totalScore: '',
  center: '', registrationNumber: '', notes: '',
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
  const [search, setSearch]         = useState('');
  const [panelOpen, setPanelOpen]   = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState({});

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['national-exam-results', examFilter, yearFilter, search],
    queryFn: () =>
      nationalExamResultsService
        .list({ examType: examFilter || undefined, academicYear: yearFilter || undefined, search: search || undefined })
        .then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['national-exam-summary', examFilter, yearFilter],
    queryFn: () =>
      nationalExamResultsService
        .summary({ examType: examFilter || undefined, academicYear: yearFilter || undefined })
        .then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => nationalExamResultsService.upsert(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['national-exam-results'] });
      qc.invalidateQueries({ queryKey: ['national-exam-summary'] });
      toast.success('Résultat enregistré');
      closePanel();
    },
    onError: () => toast.error('Une erreur est survenue'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => nationalExamResultsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['national-exam-results'] });
      qc.invalidateQueries({ queryKey: ['national-exam-summary'] });
      toast.success('Résultat supprimé');
    },
    onError: () => toast.error('Impossible de supprimer ce résultat'),
  });

  function openPanel() { setForm(EMPTY_FORM); setErrors({}); setPanelOpen(true); }
  function closePanel() { setPanelOpen(false); setForm(EMPTY_FORM); setErrors({}); }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.studentId.trim())   e.studentId   = 'Ce champ est requis';
    if (!form.session.trim())     e.session     = 'Ce champ est requis';
    if (!form.academicYear.trim()) e.academicYear = 'Ce champ est requis';
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSubmit() {
    if (!validate()) return;
    saveMutation.mutate({
      ...form,
      totalScore:         form.totalScore !== '' ? Number(form.totalScore) : undefined,
      series:             form.series             || undefined,
      mention:            form.mention            || undefined,
      center:             form.center             || undefined,
      registrationNumber: form.registrationNumber || undefined,
      notes:              form.notes              || undefined,
    });
  }

  const exportCSV = () => {
    const rows = results.map((r) => ({
      Matricule:       r.student?.admissionNumber ?? '',
      Nom:             r.student?.user?.name ?? '',
      Examen:          r.examType,
      Session:         r.session,
      'Année scolaire': r.academicYear,
      Série:           r.series ?? '',
      Résultat:        r.result,
      Mention:         r.mention ?? '',
      Score:           r.totalScore ?? '',
      Centre:          r.center ?? '',
      'N° Table':      r.registrationNumber ?? '',
    }));
    downloadCSV(rows, `examens-nationaux-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const studentName = (r) => r.student?.user?.name ?? r.student?.admissionNumber ?? r.studentId;

  const subtitle = results.length > 0
    ? `${results.length} résultat${results.length !== 1 ? 's' : ''} — CEPD, BEPC, BAC, BTS, CAP`
    : 'CEPD, BEPC, BAC, BTS, CAP — résultats officiels';

  return (
    <AppShell>
      <PageHeader
        title="Examens Nationaux"
        subtitle={subtitle}
        actions={
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <Button variant="ghost" size="sm" onClick={exportCSV}>↓ CSV</Button>
            <Button size="sm" onClick={openPanel}>+ Ajouter un résultat</Button>
          </div>
        }
      />

      {/* Summary bar */}
      {summary && (
        <div className="ner-summary">
          {[
            { label: 'Total',    num: summary.total,    cls: '' },
            { label: 'Admis',    num: summary.admis,    cls: 'ner-summary__stat--admis' },
            { label: 'Ajourné',  num: summary.ajourne,  cls: 'ner-summary__stat--ajourne' },
            { label: 'Absent',   num: summary.absent,   cls: 'ner-summary__stat--absent' },
            { label: 'Réussite', num: `${summary.passRate}%`, cls: 'ner-summary__stat--rate' },
          ].map(({ label, num, cls }) => (
            <div key={label} className={`ner-summary__stat ${cls}`}>
              <span className="ner-summary__num">{num}</span>
              <span className="ner-summary__lbl">{label}</span>
            </div>
          ))}
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
          <button className={`ner-page__tab${examFilter === '' ? ' active' : ''}`} onClick={() => setExamFilter('')}>Tous</button>
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
        <Card>
          <div className="ner-page__empty">
            <span className="ner-page__empty-icon">🎓</span>
            <p>Aucun résultat d'examen enregistré.</p>
            <Button size="sm" onClick={openPanel} style={{ marginTop: '1rem' }}>
              + Ajouter le premier résultat
            </Button>
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          <div className="ner-page__table-wrap">
            <table className="ner-table">
              <thead>
                <tr>
                  <th>Élève</th><th>Examen</th><th>Session</th><th>Année</th>
                  <th>Série</th><th>Résultat</th><th>Mention</th><th>Score</th><th>Centre</th><th></th>
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
                        onClick={() => { if (window.confirm('Supprimer ce résultat ?')) deleteMutation.mutate(r.id); }}
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Nouveau résultat OffCanvas */}
      <OffCanvas
        open={panelOpen}
        onClose={closePanel}
        title="Nouveau résultat"
        subtitle="Enregistrez un résultat officiel à un examen national"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closePanel} disabled={saveMutation.isPending}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <div className="ner-form">
          <Input
            label="ID Élève"
            required
            placeholder="UUID de l'élève"
            value={form.studentId}
            onChange={(e) => set('studentId', e.target.value)}
            error={errors.studentId}
          />

          {/* Exam type + result */}
          <div className="ner-form__row2">
            <Select
              label="Type d'examen"
              value={form.examType}
              options={EXAM_TYPES}
              onChange={(e) => set('examType', e.target.value)}
            />
            <Select
              label="Résultat"
              value={form.result}
              options={RESULT_STATUS}
              onChange={(e) => set('result', e.target.value)}
            />
          </div>

          {/* Session + academic year */}
          <div className="ner-form__row2">
            <Input
              label="Session"
              required
              placeholder="ex : Juin 2025"
              value={form.session}
              onChange={(e) => set('session', e.target.value)}
              error={errors.session}
            />
            <Input
              label="Année scolaire"
              required
              placeholder="ex : 2024-2025"
              value={form.academicYear}
              onChange={(e) => set('academicYear', e.target.value)}
              error={errors.academicYear}
            />
          </div>

          {/* Series + mention */}
          <div className="ner-form__row2">
            <Input
              label="Série"
              placeholder="ex : D, A4, C"
              value={form.series}
              onChange={(e) => set('series', e.target.value)}
            />
            <Input
              label="Mention"
              placeholder="ex : Très Bien, Bien"
              value={form.mention}
              onChange={(e) => set('mention', e.target.value)}
            />
          </div>

          {/* Score + centre */}
          <div className="ner-form__row2">
            <Input
              label="Score total"
              type="number"
              placeholder="ex : 245.5"
              value={form.totalScore}
              onChange={(e) => set('totalScore', e.target.value)}
            />
            <Input
              label="Centre d'examen"
              placeholder="Nom du centre"
              value={form.center}
              onChange={(e) => set('center', e.target.value)}
            />
          </div>

          <Input
            label="N° d'inscription"
            placeholder="Optionnel"
            value={form.registrationNumber}
            onChange={(e) => set('registrationNumber', e.target.value)}
          />

          <Textarea
            label="Notes"
            rows={3}
            placeholder="Observations…"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>
      </OffCanvas>
    </AppShell>
  );
}
