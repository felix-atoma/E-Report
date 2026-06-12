import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { mockExamsService } from '../../../services/mockExamsService';
import { classesService } from '../../../services/classesService';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import { fmtSessionDates } from '../../../utils/fmtSessionDates';
import './MockExamsPage.css';

/* ── Config per exam type (proper nouns — not translated) ─────────────────── */
const EXAM_TYPES = [
  {
    value: 'CEPE',
    label: 'CEPE Blanc',
    full: 'Certificat d\'Études Primaires Élémentaires',
    color: '#15803d', bg: '#f0fdf4', border: '#86efac',
    icon: '🎓',
    desc: 'CEPE — CM2',
  },
  {
    value: 'BEPC',
    label: 'BEPC Blanc',
    full: 'Brevet d\'Études du Premier Cycle',
    color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd',
    icon: '📘',
    desc: 'BEPC — 3ème',
  },
  {
    value: 'BAC1',
    label: 'BAC 1ère Partie Blanc',
    full: 'Baccalauréat Première Partie',
    color: '#7e22ce', bg: '#fdf4ff', border: '#d8b4fe',
    icon: '📗',
    desc: 'BAC 1er degré — 1ère',
  },
  {
    value: 'BAC2',
    label: 'BAC 2e Partie Blanc',
    full: 'Baccalauréat Deuxième Partie',
    color: '#c2410c', bg: '#fff7ed', border: '#fdba74',
    icon: '🏆',
    desc: 'BAC 2e degré — Terminale',
  },
  {
    value: 'BLANC',
    label: 'Examen Blanc',
    full: 'Examen Blanc (toutes classes)',
    color: '#374151', bg: '#f9fafb', border: '#d1d5db',
    icon: '📝',
    desc: 'Examen blanc général',
  },
];

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Create form ──────────────────────────────────────────────────────────── */
function CreateForm({ examType, classes, onClose, onCreate }) {
  const { t } = useTranslation();
  const type = EXAM_TYPES.find((et) => et.value === examType);
  const CURRENT_YEAR = new Date().getFullYear();
  const DEFAULT_YEAR = `${CURRENT_YEAR - 1}-${CURRENT_YEAR}`;

  const classOptions = classes.map((c) => ({ value: c.id, label: `${c.name} (${c.academicYear})` }));

  const [form, setForm] = useState({
    classId: '', academicYear: DEFAULT_YEAR,
    examType, label: '', examDate: '', examEndDate: '',
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.classId || !form.label.trim()) { setError(t('mockExams.classRequired')); return; }
    setError('');
    onCreate(form);
  };

  return (
    <div className="mex-form">
      {type && (
        <div className="mex-form__type-badge" style={{ background: type.bg, color: type.color, borderColor: type.border }}>
          {type.icon} {type.full}
        </div>
      )}

      {error && <div className="mex-alert">{error}</div>}

      <Select
        label={t('mockExams.form.class')}
        required
        placeholder={t('mockExams.form.selectClass')}
        value={form.classId}
        options={classOptions}
        onChange={(e) => set('classId', e.target.value)}
      />

      <Input
        label={t('mockExams.form.label')}
        required
        placeholder={`ex: 1er ${type?.label} — Janvier 2025`}
        value={form.label}
        onChange={(e) => set('label', e.target.value)}
      />

      <div className="mex-row">
        <Input
          label={t('mockExams.form.academicYear')}
          required
          placeholder="2024-2025"
          value={form.academicYear}
          onChange={(e) => set('academicYear', e.target.value)}
        />
        <Input
          label={t('mockExams.form.dateStart')}
          type="date"
          value={form.examDate}
          onChange={(e) => set('examDate', e.target.value)}
        />
        <Input
          label={t('mockExams.form.dateEnd')}
          type="date"
          value={form.examEndDate}
          onChange={(e) => set('examEndDate', e.target.value)}
        />
      </div>

      <div className="mex-form__actions">
        <Button variant="ghost" onClick={onClose}>{t('action.cancel')}</Button>
        <Button onClick={handleSubmit}>{t('mockExams.form.create')}</Button>
      </div>
    </div>
  );
}

/* ── Single exam row ──────────────────────────────────────────────────────── */
function ExamRow({ exam, isAdmin, onDelete, color, onDatesUpdated }) {
  const { t } = useTranslation();
  const [editingDates, setEditingDates] = useState(false);
  const [dateStart, setDateStart] = useState(exam.examDate ? exam.examDate.slice(0, 10) : '');
  const [dateEnd,   setDateEnd]   = useState(exam.examEndDate ? exam.examEndDate.slice(0, 10) : '');
  const [saving, setSaving] = useState(false);
  const [savingType, setSavingType] = useState(false);

  const handleSaveDates = async () => {
    setSaving(true);
    try {
      await mockExamsService.updateDates(exam.id, dateStart || null, dateEnd || null);
      onDatesUpdated();
      setEditingDates(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelDates = () => {
    setDateStart(exam.examDate ? exam.examDate.slice(0, 10) : '');
    setDateEnd(exam.examEndDate ? exam.examEndDate.slice(0, 10) : '');
    setEditingDates(false);
  };

  const handleTypeChange = async (e) => {
    const newType = e.target.value;
    if (newType === exam.examType) return;
    setSavingType(true);
    try {
      await mockExamsService.updateType(exam.id, newType);
      onDatesUpdated();
    } finally {
      setSavingType(false);
    }
  };

  return (
    <div className="mex-exam-row">
      <div className="mex-exam-row__info">
        <div className="mex-exam-row__title">
          {exam.label}
          <select
            className={`mex-type-select${savingType ? ' mex-type-select--saving' : ''}`}
            value={exam.examType}
            onChange={handleTypeChange}
            disabled={savingType}
          >
            <option value="BLANC">Examen Blanc</option>
            <option value="CEPE">CEPE Blanc</option>
            <option value="BEPC">BEPC Blanc</option>
            <option value="BAC1">BAC Première Partie</option>
            <option value="BAC2">BAC Deuxième Partie</option>
          </select>
        </div>
        <div className="mex-exam-row__meta">
          <span>🏫 {exam.class?.name}</span>

          {editingDates ? (
            <span className="mex-date-edit">
              <input
                type="date" value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="mex-date-input"
              />
              <span className="mex-date-sep">→</span>
              <input
                type="date" value={dateEnd}
                min={dateStart || undefined}
                onChange={(e) => setDateEnd(e.target.value)}
                className="mex-date-input"
              />
              <button className="mex-date-save" onClick={handleSaveDates} disabled={saving}>
                {saving ? '…' : '✓'}
              </button>
              <button className="mex-date-cancel" onClick={handleCancelDates}>✕</button>
            </span>
          ) : (
            <span
              className="mex-date-display"
              onClick={() => setEditingDates(true)}
            >
              📅 {fmtSessionDates(exam.examDate, exam.examEndDate) ?? '—'} ✏️
            </span>
          )}

          <span>📝 {exam._count?.grades ?? 0} {t('mockExams.notes')}</span>
          <span className={`mex-status-dot mex-status-dot--${exam.status === 'PUBLISHED' ? 'pub' : 'draft'}`}>
            {exam.status === 'PUBLISHED' ? t('mockExams.published') : t('mockExams.draft')}
          </span>
        </div>
      </div>

      <div className="mex-exam-row__docs">
        <Link
          to={`/mock-exams/${exam.id}/fiche`}
          className="mex-doc-btn mex-doc-btn--fiche"
        >
          <span className="mex-doc-btn__icon">📋</span>
          <span className="mex-doc-btn__label">{t('mockExams.fiches')}</span>
          <span className="mex-doc-btn__sub">{t('mockExams.fichesDesc')}</span>
        </Link>

        <Link
          to={`/mock-exams/${exam.id}/palmares`}
          className="mex-doc-btn mex-doc-btn--palmares"
        >
          <span className="mex-doc-btn__icon">📊</span>
          <span className="mex-doc-btn__label">{t('mockExams.results')}</span>
          <span className="mex-doc-btn__sub">{t('mockExams.resultsDesc')}</span>
        </Link>

        <Link
          to={`/mock-exams/${exam.id}/releve`}
          className="mex-doc-btn mex-doc-btn--releve"
        >
          <span className="mex-doc-btn__icon">📄</span>
          <span className="mex-doc-btn__label">{t('mockExams.releve')}</span>
          <span className="mex-doc-btn__sub">{t('mockExams.releveDesc')}</span>
        </Link>

        {isAdmin && (
          <Link
            to={`/admin/mock-exams/${exam.id}/grades`}
            className="mex-doc-btn mex-doc-btn--table"
          >
            <span className="mex-doc-btn__icon">🗂</span>
            <span className="mex-doc-btn__label">{t('mockExams.table')}</span>
            <span className="mex-doc-btn__sub">{t('mockExams.tableDesc')}</span>
          </Link>
        )}
      </div>

      {exam.status === 'DRAFT' && (isAdmin || exam.createdBy?.id) && (
        <button
          className="mex-exam-row__del"
          onClick={() => {
            if (confirm(t('mockExams.confirmDelete'))) onDelete(exam.id);
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

/* ── Type section ─────────────────────────────────────────────────────────── */
function TypeSection({ typeCfg, exams, classes, isAdmin, onDelete, onCreateClick, onDatesUpdated }) {
  const { t } = useTranslation();
  const typeExams = exams.filter((e) => e.examType === typeCfg.value);
  const [open, setOpen] = useState(true);

  return (
    <div className="mex-section" style={{ '--type-color': typeCfg.color, '--type-bg': typeCfg.bg, '--type-border': typeCfg.border }}>
      <div className="mex-section__header" onClick={() => setOpen((v) => !v)}>
        <div className="mex-section__header-left">
          <span className="mex-section__icon">{typeCfg.icon}</span>
          <div>
            <div className="mex-section__title">{typeCfg.label}</div>
            <div className="mex-section__full">{typeCfg.full}</div>
          </div>
          <span className="mex-section__count">
            {t('mockExams.sessions', { count: typeExams.length })}
          </span>
        </div>
        <div className="mex-section__header-right">
          <button
            className="mex-section__create-btn"
            onClick={(e) => { e.stopPropagation(); onCreateClick(typeCfg.value); }}
          >
            {t('mockExams.newSession')}
          </button>
          <span className="mex-section__toggle">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="mex-section__body">
          {typeExams.length === 0 ? (
            <div className="mex-section__empty">
              <span>{typeCfg.desc} — </span>
              <span>{t('mockExams.noSessions')}</span>
            </div>
          ) : (
            typeExams.map((exam) => (
              <ExamRow
                key={exam.id}
                exam={exam}
                isAdmin={isAdmin}
                onDelete={onDelete}
                color={typeCfg.color}
                onDatesUpdated={onDatesUpdated}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
function MockExamsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';

  const [createType, setCreateType] = useState(null);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const { data: exams = [], isLoading, isError } = useQuery({
    queryKey: ['mock-exams'],
    queryFn: () => mockExamsService.list({}).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => mockExamsService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mock-exams'] }); setCreateType(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => mockExamsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mock-exams'] }),
  });

  const activeType = createType ? EXAM_TYPES.find((et) => et.value === createType) : null;

  return (
    <AppShell title={t('mockExams.title')}>
      <PageHeader
        title={t('mockExams.title')}
        subtitle={t('mockExams.subtitle')}
      />

      {isLoading && (
        <div className="mex-empty"><div className="mex-spinner" /> {t('mockExams.loading')}</div>
      )}
      {isError && (
        <div className="mex-error">{t('mockExams.error')}</div>
      )}

      {!isLoading && (
        <div className="mex-levels">
          {EXAM_TYPES.map((typeCfg) => (
            <TypeSection
              key={typeCfg.value}
              typeCfg={typeCfg}
              exams={exams}
              classes={classes}
              isAdmin={isAdmin}
              onDelete={(id) => deleteMutation.mutate(id)}
              onCreateClick={setCreateType}
              onDatesUpdated={() => qc.invalidateQueries({ queryKey: ['mock-exams'] })}
            />
          ))}
        </div>
      )}

      <OffCanvas
        open={!!createType}
        onClose={() => setCreateType(null)}
        title={activeType ? `${activeType.icon} ${t('mockExams.form.title')} — ${activeType.label}` : ''}
        size="md"
      >
        {createType && (
          <CreateForm
            examType={createType}
            classes={classes}
            onClose={() => setCreateType(null)}
            onCreate={(data) => createMutation.mutate(data)}
          />
        )}
      </OffCanvas>
    </AppShell>
  );
}

export default MockExamsPage;
