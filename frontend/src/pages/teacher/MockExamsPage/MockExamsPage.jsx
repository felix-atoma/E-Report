import { useEffect, useState } from 'react';
import DateInput from '../../../components/common/DateInput/DateInput';
import { Link, useSearchParams } from 'react-router-dom';
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
import toast from 'react-hot-toast';
import { fmtSessionDates } from '../../../utils/fmtSessionDates';
import { DS_TYPE_CFG, CM_TYPE_CFG, CA_TYPE_CFG, KIND_TEXT, isNonExamType, isPrimaryCompoType, isDsType, isPrimaryLevel, isSecondaryLevel, typesForKind } from '../../../utils/examKinds';
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
function CreateForm({ examType, classes, classesLoading, onClose, onCreate, serverError, isSaving }) {
  const { t } = useTranslation();
  const type = [...EXAM_TYPES, DS_TYPE_CFG, CM_TYPE_CFG, CA_TYPE_CFG].find((et) => et.value === examType);
  // Compositions mensuelles et d'anglais : primaire (CI → CM2) ; devoirs surveillés : secondaire (6ème → Terminale)
  const eligibleClasses = isPrimaryCompoType(examType) ? classes.filter((c) => isPrimaryLevel(c.level))
    : isDsType(examType) ? classes.filter((c) => isSecondaryLevel(c.level))
    : classes;
  // Année scolaire en cours : elle commence en septembre (en octobre 2026 → « 2026-2027 »)
  const now = new Date();
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const DEFAULT_YEAR = `${startYear}-${startYear + 1}`;

  const classOptions = eligibleClasses.map((c) => ({ value: c.id, label: `${c.name} (${c.academicYear})` }));

  const [form, setForm] = useState({
    classIds: [], academicYear: DEFAULT_YEAR,
    examType, label: '', examDate: '', examEndDate: '',
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.classIds.length || !form.label.trim()) { setError(t('mockExams.classRequired')); return; }
    setError('');
    // Une session par classe choisie ; plusieurs classes : chacune dans l'année scolaire de sa classe
    const { classIds, ...rest } = form;
    onCreate(classIds.map((classId) => ({
      ...rest,
      classId,
      academicYear: classIds.length > 1
        ? eligibleClasses.find((c) => c.id === classId)?.academicYear || form.academicYear
        : form.academicYear,
    })));
  };

  return (
    <div className="mex-form">
      {type && (
        <div className="mex-form__type-badge" style={{ background: type.bg, color: type.color, borderColor: type.border }}>
          {type.icon} {type.full}
        </div>
      )}

      {(error || serverError) && <div className="mex-alert">{error || serverError}</div>}

      <Select
        label={t('mockExams.form.classes')}
        required
        isMulti
        value={form.classIds}
        options={classOptions}
        // Chargement en cours : on l'indique au lieu d'afficher une liste vide
        placeholder={classesLoading ? 'Chargement des classes…' : t('mockExams.form.selectClass')}
        onChange={(e) => {
          // L'année scolaire suit celle de la première classe choisie
          const cls = eligibleClasses.find((c) => c.id === e.target.value[0]);
          setForm((p) => ({ ...p, classIds: e.target.value, academicYear: cls?.academicYear || p.academicYear }));
        }}
      />
      {classOptions.length > 1 && (
        <div className="mex-form__class-tools">
          <button type="button" onClick={() => setForm((p) => ({
            ...p, classIds: eligibleClasses.map((c) => c.id), academicYear: eligibleClasses[0]?.academicYear || p.academicYear,
          }))}>
            {t('mockExams.form.allClasses', { count: classOptions.length })}
          </button>
          {form.classIds.length > 0 && (
            <button type="button" onClick={() => set('classIds', [])}>{t('mockExams.form.clearClasses')}</button>
          )}
        </div>
      )}
      {!classesLoading && classOptions.length === 0 && (
        <div className="mex-alert">
          {isDsType(examType)
            ? 'Aucune classe de la 6ème à la Terminale. Vérifiez le niveau des classes dans « Classes ».'
            : isPrimaryCompoType(examType)
              ? 'Aucune classe du CI au CM2. Vérifiez le niveau des classes dans « Classes ».'
              : 'Aucune classe. Créez d’abord vos classes dans « Classes ».'}
        </div>
      )}

      <Input
        label={t('mockExams.form.label')}
        required
        placeholder={`ex: 1er ${type?.label} — Janvier 2025`}
        value={form.label}
        onChange={(e) => set('label', e.target.value)}
      />

      <div className="mex-row">
        {form.classIds.length <= 1 && (
          <Input
            label={t('mockExams.form.academicYear')}
            required
            placeholder="2024-2025"
            value={form.academicYear}
            onChange={(e) => set('academicYear', e.target.value)}
          />
        )}
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
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving
            ? t('action.saving')
            : form.classIds.length > 1
              ? t('mockExams.form.createMany', { count: form.classIds.length })
              : t('mockExams.form.create')}
        </Button>
      </div>
    </div>
  );
}

/* ── Single exam row ──────────────────────────────────────────────────────── */
function ExamRow({ exam, isAdmin, canManage = true, onDelete, color, onDatesUpdated }) {
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
          {/* Un devoir surveillé reste un devoir surveillé : pas de changement de type */}
          {canManage && !isNonExamType(exam.examType) && (
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
          )}
        </div>
        <div className="mex-exam-row__meta">
          <span>🏫 {exam.class?.name}</span>

          {editingDates ? (
            <span className="mex-date-edit">
              <DateInput
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="mex-date-input"
              />
              <span className="mex-date-sep">→</span>
              <DateInput
                value={dateEnd}
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
              onClick={() => canManage && setEditingDates(true)}
              style={canManage ? undefined : { cursor: 'default' }}
            >
              📅 {fmtSessionDates(exam.examDate, exam.examEndDate) ?? '—'}{canManage ? ' ✏️' : ''}
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

      {canManage && exam.status === 'DRAFT' && (isAdmin || exam.createdBy?.id) && (
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
function TypeSection({ typeCfg, exams, classes, isAdmin, canManage = true, onDelete, onCreateClick, onDatesUpdated }) {
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
          {canManage && (
          <button
            className="mex-section__create-btn"
            onClick={(e) => { e.stopPropagation(); onCreateClick(typeCfg.value); }}
          >
            {t('mockExams.newSession')}
          </button>
          )}
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
                canManage={canManage}
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
/** kind = 'ESSAI' (examens blancs) ou 'DS' (devoirs surveillés) : même page, même procédure. */
function MockExamsPage({ kind = 'ESSAI' }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const isDs = kind === 'DS' || kind === 'CM' || kind === 'CA';   // séances hors examen (DS, compositions du primaire)
  const text = KIND_TEXT[kind] ?? KIND_TEXT.ESSAI;
  const types = typesForKind(kind, EXAM_TYPES);
  // L'administrateur crée et gère toutes les sessions ; les professeurs saisissent et signent leurs notes
  const canManage = isAdmin;
  const pageTitle = isDs ? text.listTitle : t('mockExams.title');

  const [createType, setCreateType] = useState(null);

  // Arrivée depuis le tableau de bord admin (?create=1) : ouvre directement le formulaire de création
  // pour une famille à type unique (devoirs surveillés, compositions mensuelles).
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('create') === '1' && canManage && types.length === 1) {
      setCreateType(types[0].value);
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const { data: exams = [], isLoading, isError } = useQuery({
    queryKey: ['mock-exams'],
    queryFn: () => mockExamsService.list({}).then((r) => r.data),
  });

  const createMutation = useMutation({
    // Plusieurs classes : une session par classe ; on signale celles qui ont échoué sans perdre les autres
    mutationFn: async (items) => {
      const failed = [];
      for (const data of items) {
        try { await mockExamsService.create(data); } catch (err) {
          const name = classes.find((c) => c.id === data.classId)?.name ?? data.classId;
          failed.push(`${name} : ${[].concat(err.response?.data?.message ?? 'échec').join(' · ')}`);
        }
      }
      return { created: items.length - failed.length, failed };
    },
    onSuccess: ({ created, failed }) => {
      qc.invalidateQueries({ queryKey: ['mock-exams'] });
      setCreateType(null);
      if (created) toast.success(t('mockExams.createdMany', { count: created }));
      // Les classes en échec sont listées : les recréer seules (les autres sont déjà créées)
      if (failed.length) toast.error(t('mockExams.createFailed', { list: failed.join(' — ') }), { duration: 12000 });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => mockExamsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mock-exams'] }),
  });

  const activeType = createType ? types.find((et) => et.value === createType) : null;

  return (
    <AppShell title={pageTitle}>
      <PageHeader
        title={pageTitle}
        subtitle={
          isAdmin
            ? (isDs ? text.listSubtitle : t('mockExams.subtitle'))
            : kind === 'CM'
              ? "Les compositions mensuelles sont créées par l'administration. Saisissez et signez les notes dans « Fiches » (sur 10 ou sur 20 selon la matière)."
            : kind === 'CA'
              ? "Les compositions d'anglais sont créées par l'administration. Saisissez et signez les notes d'anglais dans « Fiches d'anglais »."
            : isDs
              ? "Les devoirs surveillés sont créés par l'administration. Saisissez et signez les notes de votre matière dans « Fiches des DS »."
              : "Les examens blancs sont créés par l'administration. Saisissez et signez les notes de votre matière dans « Fiches d'examen »."
        }
      />

      {isLoading && (
        <div className="mex-empty"><div className="mex-spinner" /> {t('mockExams.loading')}</div>
      )}
      {isError && (
        <div className="mex-error">{t('mockExams.error')}</div>
      )}

      {!isLoading && (
        <div className="mex-levels">
          {types.map((typeCfg) => (
            <TypeSection
              key={typeCfg.value}
              typeCfg={typeCfg}
              exams={exams}
              classes={classes}
              isAdmin={isAdmin}
              canManage={canManage}
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
            classesLoading={classesLoading}
            onClose={() => { setCreateType(null); createMutation.reset(); }}
            onCreate={(data) => createMutation.mutate(data)}
            isSaving={createMutation.isPending}
            // Message du serveur (ex. classe non éligible) au lieu d'un échec silencieux
            serverError={createMutation.error ? (createMutation.error.response?.data?.message
              ? [].concat(createMutation.error.response.data.message).join(' · ')
              : "La création a échoué. Réessayez.") : null}
          />
        )}
      </OffCanvas>
    </AppShell>
  );
}

export default MockExamsPage;
