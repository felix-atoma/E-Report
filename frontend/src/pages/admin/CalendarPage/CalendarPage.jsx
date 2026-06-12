import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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

const EVENT_TYPE_KEYS = ['HOLIDAY', 'EXAM', 'EVENT', 'MEETING', 'PARENT_MEETING', 'SPORT', 'CULTURAL', 'DEADLINE', 'OTHER'];

const EVENT_TYPE_STYLE = {
  HOLIDAY:        { bg: '#fee2e2', color: '#b91c1c' },
  EXAM:           { bg: '#ffedd5', color: '#c2410c' },
  EVENT:          { bg: '#dbeafe', color: '#1d4ed8' },
  MEETING:        { bg: '#f3e8ff', color: '#7e22ce' },
  PARENT_MEETING: { bg: '#ccfbf1', color: '#0f766e' },
  SPORT:          { bg: '#dcfce7', color: '#15803d' },
  CULTURAL:       { bg: '#fce7f3', color: '#be185d' },
  DEADLINE:       { bg: '#fef9c3', color: '#a16207' },
  OTHER:          { bg: '#f3f4f6', color: '#4b5563' },
};

const PRESET_COLORS = ['#1E2A78', '#FF7A59', '#E94F8A', '#0ea5e9', '#22c55e', '#f59e0b'];

const EMPTY_FORM = {
  title: '', type: 'EVENT', startDate: '', endDate: '',
  allDay: true, description: '', isPublic: true, color: '',
};

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
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canCreate = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  const [typeFilter, setTypeFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const typeOptions = useMemo(() => [
    { value: '', label: t('calendar.allTypes') },
    ...EVENT_TYPE_KEYS.map((k) => ({ value: k, label: t(`calendar.types.${k}`) })),
  ], [t]);

  const typeSelectOptions = EVENT_TYPE_KEYS.map((k) => ({
    value: k, label: t(`calendar.types.${k}`),
  }));

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
      toast.success(t('calendar.toast.created'));
      setOpen(false);
    },
    onError: () => toast.error(t('calendar.toast.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => calendarService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
      toast.success(t('calendar.toast.deleted'));
      setConfirm(null);
    },
    onError: () => toast.error(t('calendar.toast.error')),
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
    if (!form.title.trim()) errs.title = t('calendar.errors.title');
    if (!form.startDate) errs.startDate = t('calendar.errors.startDate');
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    createMutation.mutate({
      title:       form.title,
      type:        form.type,
      startDate:   form.startDate,
      endDate:     form.endDate || undefined,
      allDay:      form.allDay,
      description: form.description || undefined,
      isPublic:    form.isPublic,
      color:       form.color || undefined,
    });
  }

  return (
    <AppShell title={t('calendar.title')}>
      <PageHeader
        title={t('calendar.title')}
        subtitle={t('calendar.subtitle', { count: events.length })}
        actions={
          canCreate && (
            <Button icon="+" onClick={openCreate}>
              {t('calendar.add')}
            </Button>
          )
        }
      />

      <div className="cal-filters">
        {typeOptions.map((opt) => (
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
        <EmptyState message={t('calendar.empty')} />
      ) : (
        <div className="cal-list">
          {grouped.map(([key, group]) => (
            <div key={key} className="cal-month-group">
              <h3 className="cal-month-group__title">{group.label}</h3>
              <div className="cal-events">
                {group.events.map((ev) => {
                  const style = EVENT_TYPE_STYLE[ev.type] ?? EVENT_TYPE_STYLE.OTHER;
                  const dot = ev.color || style.bg;
                  return (
                    <div key={ev.id} className="cal-event-row">
                      <div className="cal-event-row__dot" style={{ background: dot }} />
                      <div className="cal-event-row__body">
                        <div className="cal-event-row__header">
                          <span className="cal-event-row__title">{ev.title}</span>
                          <span className="cal-chip" style={{ background: style.bg, color: style.color }}>
                            {t(`calendar.types.${ev.type}`, ev.type)}
                          </span>
                          {!ev.isPublic && (
                            <span className="cal-event-row__private">{t('calendar.private')}</span>
                          )}
                        </div>
                        <div className="cal-event-row__dates">
                          {new Date(ev.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          {ev.endDate && ev.endDate !== ev.startDate && (
                            <> — {new Date(ev.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                          )}
                          {ev.allDay && <span className="cal-event-row__allday">{t('calendar.allDay')}</span>}
                        </div>
                        {ev.description && (
                          <p className="cal-event-row__desc">{ev.description}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <button
                          className="cal-event-row__delete"
                          onClick={() => setConfirm(ev)}
                          title={t('calendar.confirmLabel')}
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

      <OffCanvas
        open={open}
        onClose={() => setOpen(false)}
        title={t('calendar.form.offcanvasTitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={createMutation.isPending}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? t('action.saving') : t('action.save')}
            </Button>
          </>
        }
      >
        <div className="cal-form">
          <Input
            id="title"
            label={t('calendar.form.titleLabel')}
            required
            value={form.title}
            error={errors.title}
            placeholder={t('calendar.form.titlePlaceholder')}
            onChange={(e) => handleChange('title', e.target.value)}
          />
          <Select
            id="type"
            label={t('calendar.form.typeLabel')}
            value={form.type}
            options={typeSelectOptions}
            onChange={(e) => handleChange('type', e.target.value)}
          />
          <div className="cal-form__row">
            <Input
              id="startDate"
              label={t('calendar.form.startDate')}
              type="date"
              required
              value={form.startDate}
              error={errors.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
            />
            <Input
              id="endDate"
              label={t('calendar.form.endDate')}
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
              {t('calendar.allDay')}
            </label>
            <label className="form-field__checkbox">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(e) => handleChange('isPublic', e.target.checked)}
              />
              {t('calendar.visibleToParents')}
            </label>
          </div>
          <div>
            <label className="cal-form__label">{t('calendar.colorLabel')}</label>
            <ColorPicker value={form.color} onChange={(c) => handleChange('color', c)} />
          </div>
          <Textarea
            id="description"
            label={t('action.description') ?? 'Description'}
            rows={3}
            placeholder={t('calendar.form.descPlaceholder')}
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
        title={t('calendar.confirmTitle')}
        message={t('calendar.confirmMessage', { title: confirm?.title })}
        confirmLabel={t('calendar.confirmLabel')}
        variant="danger"
      />
    </AppShell>
  );
}

export default CalendarPage;
