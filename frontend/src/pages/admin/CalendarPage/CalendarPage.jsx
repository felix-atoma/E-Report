import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { calendarService } from '../../../services/calendarService';
import { useAuth } from '../../../context/AuthContext';
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
import './CalendarPage.css';

const EVENT_TYPE_CONFIG = {
  HOLIDAY:        { label: 'Congé/Fête',       bg: '#fee2e2', color: '#b91c1c' },
  EXAM:           { label: 'Examen',            bg: '#ffedd5', color: '#c2410c' },
  EVENT:          { label: 'Événement',         bg: '#dbeafe', color: '#1d4ed8' },
  MEETING:        { label: 'Réunion',           bg: '#f3e8ff', color: '#7e22ce' },
  PARENT_MEETING: { label: 'Réunion parents',   bg: '#ccfbf1', color: '#0f766e' },
  SPORT:          { label: 'Sport',             bg: '#dcfce7', color: '#15803d' },
  CULTURAL:       { label: 'Culturel',          bg: '#fce7f3', color: '#be185d' },
  DEADLINE:       { label: 'Échéance',          bg: '#fef9c3', color: '#a16207' },
  OTHER:          { label: 'Autre',             bg: '#f3f4f6', color: '#4b5563' },
};

const TYPE_OPTIONS = [
  { value: '', label: 'Tous les types' },
  ...Object.entries(EVENT_TYPE_CONFIG).map(([v, c]) => ({ value: v, label: c.label })),
];

const TYPE_SELECT_OPTIONS = [
  { value: 'EVENT', label: 'Événement' },
  { value: 'HOLIDAY', label: 'Congé/Fête' },
  { value: 'EXAM', label: 'Examen' },
  { value: 'MEETING', label: 'Réunion' },
  { value: 'PARENT_MEETING', label: 'Réunion parents' },
  { value: 'SPORT', label: 'Sport' },
  { value: 'CULTURAL', label: 'Culturel' },
  { value: 'DEADLINE', label: 'Échéance' },
  { value: 'OTHER', label: 'Autre' },
];

const PRESET_COLORS = ['#1E2A78', '#FF7A59', '#E94F8A', '#0ea5e9', '#22c55e', '#f59e0b'];

const EMPTY_FORM = {
  title: '',
  type: 'EVENT',
  startDate: '',
  endDate: '',
  allDay: true,
  description: '',
  isPublic: true,
  color: '',
};

function EventChip({ type }) {
  const cfg = EVENT_TYPE_CONFIG[type] ?? EVENT_TYPE_CONFIG.OTHER;
  return (
    <span className="cal-chip" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function ColorPicker({ value, onChange }) {
  return (
    <div className="cal-color-picker">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          className={`cal-color-swatch ${value === c ? 'cal-color-swatch--active' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(value === c ? '' : c)}
          title={c}
        />
      ))}
    </div>
  );
}

function groupByMonth(events) {
  const groups = {};
  for (const ev of events) {
    const d = new Date(ev.startDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = { label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), events: [] };
    groups[key].events.push(ev);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function CalendarPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canCreate = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  const [typeFilter, setTypeFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar'],
    queryFn: () => calendarService.list().then((r) => r.data),
  });

  const filtered = useMemo(() => {
    return typeFilter ? events.filter((e) => e.type === typeFilter) : events;
  }, [events, typeFilter]);

  const grouped = useMemo(() => groupByMonth(filtered), [filtered]);

  const createMutation = useMutation({
    mutationFn: (data) => calendarService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('Événement ajouté');
      setOpen(false);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => calendarService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('Événement supprimé');
      setConfirm(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setErrors({});
    setOpen(true);
  }

  function validate() {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Titre requis';
    if (!form.startDate) errs.startDate = 'Date de début requise';
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const payload = {
      title:       form.title,
      type:        form.type,
      startDate:   form.startDate,
      endDate:     form.endDate || undefined,
      allDay:      form.allDay,
      description: form.description || undefined,
      isPublic:    form.isPublic,
      color:       form.color || undefined,
    };
    createMutation.mutate(payload);
  }

  return (
    <AppShell title="Calendrier scolaire">
      <PageHeader
        title="Calendrier scolaire"
        subtitle={`${events.length} événement${events.length !== 1 ? 's' : ''}`}
        actions={
          canCreate && (
            <Button icon="+" onClick={openCreate}>
              Ajouter un événement
            </Button>
          )
        }
      />

      {/* Type filter pills */}
      <div className="cal-filters">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`cal-filter-pill ${typeFilter === opt.value ? 'cal-filter-pill--active' : ''}`}
            onClick={() => setTypeFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Loading />
      ) : grouped.length === 0 ? (
        <EmptyState message="Aucun événement pour le moment." />
      ) : (
        <div className="cal-list">
          {grouped.map(([key, group]) => (
            <div key={key} className="cal-month-group">
              <h3 className="cal-month-group__title">{group.label}</h3>
              <div className="cal-events">
                {group.events.map((ev) => {
                  const cfg = EVENT_TYPE_CONFIG[ev.type] ?? EVENT_TYPE_CONFIG.OTHER;
                  const dot = ev.color || cfg.bg;
                  return (
                    <div key={ev.id} className="cal-event-row">
                      <div className="cal-event-row__dot" style={{ background: dot }} />
                      <div className="cal-event-row__body">
                        <div className="cal-event-row__header">
                          <span className="cal-event-row__title">{ev.title}</span>
                          <EventChip type={ev.type} />
                          {!ev.isPublic && (
                            <span className="cal-event-row__private">Privé</span>
                          )}
                        </div>
                        <div className="cal-event-row__dates">
                          {new Date(ev.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          {ev.endDate && ev.endDate !== ev.startDate && (
                            <> — {new Date(ev.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                          )}
                          {ev.allDay && <span className="cal-event-row__allday">Journée entière</span>}
                        </div>
                        {ev.description && (
                          <p className="cal-event-row__desc">{ev.description}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <button
                          className="cal-event-row__delete"
                          onClick={() => setConfirm(ev)}
                          title="Supprimer"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add event OffCanvas */}
      <OffCanvas
        open={open}
        onClose={() => setOpen(false)}
        title="Ajouter un événement"
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
        <div className="cal-form">
          <Input
            id="title"
            label="Titre"
            required
            value={form.title}
            error={errors.title}
            placeholder="ex: Réunion des parents, Examen trimestriel…"
            onChange={(e) => handleChange('title', e.target.value)}
          />
          <Select
            id="type"
            label="Type"
            value={form.type}
            options={TYPE_SELECT_OPTIONS}
            onChange={(e) => handleChange('type', e.target.value)}
          />
          <div className="cal-form__row">
            <Input
              id="startDate"
              label="Date de début"
              type="date"
              required
              value={form.startDate}
              error={errors.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
            />
            <Input
              id="endDate"
              label="Date de fin"
              type="date"
              value={form.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
            />
          </div>
          <div className="cal-form__checks">
            <label className="form-field__checkbox">
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={(e) => handleChange('allDay', e.target.checked)}
              />
              Journée entière
            </label>
            <label className="form-field__checkbox">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(e) => handleChange('isPublic', e.target.checked)}
              />
              Visible par les parents/élèves
            </label>
          </div>
          <div>
            <label className="cal-form__label">Couleur (optionnel)</label>
            <ColorPicker value={form.color} onChange={(c) => handleChange('color', c)} />
          </div>
          <Textarea
            id="description"
            label="Description"
            rows={3}
            placeholder="Description optionnelle…"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </div>
      </OffCanvas>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate(confirm.id)}
        loading={deleteMutation.isPending}
        title="Supprimer l'événement"
        message={`Supprimer "${confirm?.title}" du calendrier ?`}
        confirmLabel="Supprimer"
        variant="danger"
      />
    </AppShell>
  );
}

export default CalendarPage;
