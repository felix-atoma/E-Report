import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { disciplinaryService } from '../../../services/disciplinaryService';
import { studentsService } from '../../../services/studentsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Textarea from '../../../components/common/Textarea/Textarea';
import Select from '../../../components/common/Select/Select';
import Loading from '../../../components/common/Loading/Loading';
import EmptyState from '../../../components/common/EmptyState/EmptyState';
import './DisciplinaryPage.css';

const TYPE_CONFIG = {
  WARNING:     { label: 'Avertissement', bg: '#ffedd5', color: '#c2410c' },
  SUSPENSION:  { label: 'Suspension',    bg: '#fee2e2', color: '#b91c1c' },
  EXCLUSION:   { label: 'Exclusion',     bg: '#fde8e8', color: '#7f1d1d' },
  NOTE:        { label: 'Note',          bg: '#dbeafe', color: '#1d4ed8' },
  COMMENDATION:{ label: 'Félicitation',  bg: '#dcfce7', color: '#15803d' },
  OTHER:       { label: 'Autre',         bg: '#f3f4f6', color: '#4b5563' },
};

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Tous les types' },
  ...Object.entries(TYPE_CONFIG).map(([v, c]) => ({ value: v, label: c.label })),
];

const TYPE_SELECT_OPTIONS = Object.entries(TYPE_CONFIG).map(([v, c]) => ({ value: v, label: c.label }));

const RESOLVED_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'false', label: 'En cours' },
  { value: 'true', label: 'Résolus' },
];

const EMPTY_FORM = {
  studentId: '',
  date: '',
  type: 'WARNING',
  description: '',
  sanction: '',
  sanctionStart: '',
  sanctionEnd: '',
  resolved: false,
};

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.OTHER;
  return (
    <span className="disc-badge" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function DisciplinaryPage() {
  const qc = useQueryClient();

  const [typeFilter, setTypeFilter] = useState('');
  const [resolvedFilter, setResolvedFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [studentSearch, setStudentSearch] = useState('');

  const queryParams = useMemo(() => {
    const p = {};
    if (typeFilter) p.type = typeFilter;
    if (resolvedFilter !== '') p.resolved = resolvedFilter;
    return p;
  }, [typeFilter, resolvedFilter]);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['disciplinary', queryParams],
    queryFn: () => disciplinaryService.list(queryParams).then((r) => r.data),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentsService.list().then((r) => r.data),
  });

  // Filter students for the searchable dropdown
  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students.slice(0, 30);
    const q = studentSearch.toLowerCase();
    return students.filter((s) => {
      const name = (s.user?.name ?? s.admissionNumber ?? '').toLowerCase();
      return name.includes(q) || s.admissionNumber.toLowerCase().includes(q);
    }).slice(0, 30);
  }, [students, studentSearch]);

  const studentOptions = filteredStudents.map((s) => ({
    value: s.id,
    label: `${s.user?.name ?? s.admissionNumber} (${s.admissionNumber})`,
  }));

  const createMutation = useMutation({
    mutationFn: (data) => disciplinaryService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disciplinary'] });
      toast.success('Dossier créé');
      setOpen(false);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => disciplinaryService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disciplinary'] });
      toast.success('Dossier mis à jour');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => disciplinaryService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disciplinary'] });
      toast.success('Dossier supprimé');
      setConfirm(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.studentId) errs.studentId = 'Élève requis';
    if (!form.date) errs.date = 'Date requise';
    if (!form.description.trim()) errs.description = 'Description requise';
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const payload = {
      studentId:    form.studentId,
      date:         form.date,
      type:         form.type,
      description:  form.description,
      sanction:     form.sanction || undefined,
      sanctionStart:form.sanctionStart || undefined,
      sanctionEnd:  form.sanctionEnd || undefined,
      resolved:     form.resolved,
    };
    createMutation.mutate(payload);
  }

  function handleResolve(record) {
    updateMutation.mutate({ id: record.id, data: { resolved: !record.resolved } });
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setErrors({});
    setStudentSearch('');
    setOpen(true);
  }

  return (
    <AppShell title="Dossiers disciplinaires">
      <PageHeader
        title="Dossiers disciplinaires"
        subtitle={`${records.length} dossier${records.length !== 1 ? 's' : ''}`}
        actions={
          <Button icon="+" onClick={openCreate}>
            Ajouter un dossier
          </Button>
        }
      />

      {/* Filters */}
      <div className="disc-toolbar">
        <div className="disc-filters">
          {TYPE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`disc-filter-pill ${typeFilter === opt.value ? 'disc-filter-pill--active' : ''}`}
              onClick={() => setTypeFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="disc-resolved-filter">
          {RESOLVED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`disc-resolved-btn ${resolvedFilter === opt.value ? 'disc-resolved-btn--active' : ''}`}
              onClick={() => setResolvedFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Loading />
      ) : records.length === 0 ? (
        <EmptyState message="Aucun dossier disciplinaire trouvé." />
      ) : (
        <div className="disc-list">
          {records.map((rec) => {
            const studentName = rec.student?.user?.name ?? rec.student?.admissionNumber ?? '—';
            return (
              <div key={rec.id} className={`disc-card ${rec.resolved ? 'disc-card--resolved' : ''}`}>
                <div className="disc-card__left">
                  <div className="disc-card__avatar">
                    {studentName.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="disc-card__body">
                  <div className="disc-card__header">
                    <span className="disc-card__student">{studentName}</span>
                    <TypeBadge type={rec.type} />
                    {rec.resolved ? (
                      <span className="disc-card__resolved-pill">Résolu</span>
                    ) : (
                      <span className="disc-card__open-pill">En cours</span>
                    )}
                  </div>
                  <div className="disc-card__date">
                    {new Date(rec.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {rec.recordedByName && <span className="disc-card__by"> — Enregistré par {rec.recordedByName}</span>}
                  </div>
                  <p className="disc-card__desc">{rec.description}</p>
                  {rec.sanction && (
                    <div className="disc-card__sanction">
                      <strong>Sanction :</strong> {rec.sanction}
                      {rec.sanctionStart && (
                        <> ({new Date(rec.sanctionStart).toLocaleDateString('fr-FR')}
                        {rec.sanctionEnd && <> — {new Date(rec.sanctionEnd).toLocaleDateString('fr-FR')}</>})</>
                      )}
                    </div>
                  )}
                </div>
                <div className="disc-card__actions">
                  <button
                    className={`disc-card__resolve-btn ${rec.resolved ? 'disc-card__resolve-btn--undo' : ''}`}
                    onClick={() => handleResolve(rec)}
                    disabled={updateMutation.isPending}
                    title={rec.resolved ? 'Marquer en cours' : 'Marquer résolu'}
                  >
                    {rec.resolved ? '↺ Réouvrir' : '✓ Résolu'}
                  </button>
                  <button
                    className="disc-card__delete-btn"
                    onClick={() => setConfirm(rec)}
                    title="Supprimer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create OffCanvas */}
      <OffCanvas
        open={open}
        onClose={() => setOpen(false)}
        title="Nouveau dossier disciplinaire"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={createMutation.isPending}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <div className="disc-form">
          <div>
            <label className="disc-form__label" htmlFor="student-search">Élève <span className="disc-form__required">*</span></label>
            <input
              id="student-search"
              type="text"
              className={`disc-form__search-input ${errors.studentId ? 'disc-form__search-input--error' : ''}`}
              placeholder="Rechercher un élève…"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
            {filteredStudents.length > 0 && studentSearch && !form.studentId && (
              <div className="disc-form__student-list">
                {filteredStudents.map((s) => (
                  <div
                    key={s.id}
                    className="disc-form__student-option"
                    onClick={() => {
                      handleChange('studentId', s.id);
                      setStudentSearch(s.user?.name ?? s.admissionNumber);
                    }}
                  >
                    <strong>{s.user?.name ?? s.admissionNumber}</strong>
                    <span className="disc-form__student-num">{s.admissionNumber}</span>
                  </div>
                ))}
              </div>
            )}
            {errors.studentId && <p className="disc-form__error">{errors.studentId}</p>}
          </div>

          <div className="disc-form__row">
            <Input
              id="date"
              label="Date"
              type="date"
              required
              value={form.date}
              error={errors.date}
              onChange={(e) => handleChange('date', e.target.value)}
            />
            <Select
              id="type"
              label="Type"
              value={form.type}
              options={TYPE_SELECT_OPTIONS}
              onChange={(e) => handleChange('type', e.target.value)}
            />
          </div>

          <Textarea
            id="description"
            label="Description"
            required
            rows={3}
            placeholder="Décrire l'incident…"
            value={form.description}
            error={errors.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />

          <Input
            id="sanction"
            label="Sanction"
            value={form.sanction}
            placeholder="ex: Convocation des parents, Exclusion temporaire…"
            onChange={(e) => handleChange('sanction', e.target.value)}
          />

          <div className="disc-form__row">
            <Input
              id="sanctionStart"
              label="Début sanction"
              type="date"
              value={form.sanctionStart}
              onChange={(e) => handleChange('sanctionStart', e.target.value)}
            />
            <Input
              id="sanctionEnd"
              label="Fin sanction"
              type="date"
              value={form.sanctionEnd}
              onChange={(e) => handleChange('sanctionEnd', e.target.value)}
            />
          </div>

          <label className="form-field__checkbox">
            <input
              type="checkbox"
              checked={form.resolved}
              onChange={(e) => handleChange('resolved', e.target.checked)}
            />
            Marquer comme résolu
          </label>
        </div>
      </OffCanvas>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate(confirm.id)}
        loading={deleteMutation.isPending}
        title="Supprimer le dossier"
        message="Supprimer définitivement ce dossier disciplinaire ?"
        confirmLabel="Supprimer"
        variant="danger"
      />
    </AppShell>
  );
}

export default DisciplinaryPage;
