import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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

const TYPE_KEYS = ['WARNING', 'SUSPENSION', 'EXCLUSION', 'NOTE', 'COMMENDATION', 'OTHER'];
const TYPE_BG = {
  WARNING:      { bg: '#ffedd5', color: '#c2410c' },
  SUSPENSION:   { bg: '#fee2e2', color: '#b91c1c' },
  EXCLUSION:    { bg: '#fde8e8', color: '#7f1d1d' },
  NOTE:         { bg: '#dbeafe', color: '#1d4ed8' },
  COMMENDATION: { bg: '#dcfce7', color: '#15803d' },
  OTHER:        { bg: '#f3f4f6', color: '#4b5563' },
};

const EMPTY_FORM = {
  studentId: '', date: '', type: 'WARNING',
  description: '', sanction: '', sanctionStart: '', sanctionEnd: '', resolved: false,
};

function TypeBadge({ type, t }) {
  const cfg = TYPE_BG[type] ?? TYPE_BG.OTHER;
  return (
    <span className="disc-badge" style={{ background: cfg.bg, color: cfg.color }}>
      {t(`studentProfile.discipline.types.${type}`, type)}
    </span>
  );
}

function DisciplinaryPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [typeFilter, setTypeFilter]     = useState('');
  const [resolvedFilter, setResolvedFilter] = useState('');
  const [open, setOpen]                 = useState(false);
  const [confirm, setConfirm]           = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [errors, setErrors]             = useState({});
  const [studentSearch, setStudentSearch] = useState('');

  const typeFilterOptions = [
    { value: '', label: t('disciplinary.allTypes') },
    ...TYPE_KEYS.map((k) => ({ value: k, label: t(`studentProfile.discipline.types.${k}`) })),
  ];

  const typeSelectOptions = TYPE_KEYS.map((k) => ({
    value: k, label: t(`studentProfile.discipline.types.${k}`),
  }));

  const resolvedOptions = [
    { value: '', label: t('disciplinary.all') },
    { value: 'false', label: t('disciplinary.open') },
    { value: 'true', label: t('disciplinary.resolved') },
  ];

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

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students.slice(0, 30);
    const q = studentSearch.toLowerCase();
    return students.filter((s) => {
      const name = (s.user?.name ?? s.admissionNumber ?? '').toLowerCase();
      return name.includes(q) || s.admissionNumber.toLowerCase().includes(q);
    }).slice(0, 30);
  }, [students, studentSearch]);

  const createMutation = useMutation({
    mutationFn: (data) => disciplinaryService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disciplinary'] });
      toast.success(t('disciplinary.toast.created'));
      setOpen(false);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('disciplinary.toast.error')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => disciplinaryService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disciplinary'] });
      toast.success(t('disciplinary.toast.updated'));
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('disciplinary.toast.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => disciplinaryService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disciplinary'] });
      toast.success(t('disciplinary.toast.deleted'));
      setConfirm(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('disciplinary.toast.error')),
  });

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.studentId) errs.studentId = t('disciplinary.errors.student');
    if (!form.date) errs.date = t('disciplinary.errors.date');
    if (!form.description.trim()) errs.description = t('disciplinary.errors.description');
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    createMutation.mutate({
      studentId:     form.studentId,
      date:          form.date,
      type:          form.type,
      description:   form.description,
      sanction:      form.sanction     || undefined,
      sanctionStart: form.sanctionStart || undefined,
      sanctionEnd:   form.sanctionEnd   || undefined,
      resolved:      form.resolved,
    });
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
    <AppShell title={t('disciplinary.title')}>
      <PageHeader
        title={t('disciplinary.title')}
        subtitle={t('disciplinary.subtitle', { count: records.length })}
        actions={
          <Button icon="+" onClick={openCreate}>
            {t('disciplinary.add')}
          </Button>
        }
      />

      <div className="disc-toolbar">
        <div className="disc-filters">
          {typeFilterOptions.map((opt) => (
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
          {resolvedOptions.map((opt) => (
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
        <EmptyState message={t('disciplinary.empty')} />
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
                    <TypeBadge type={rec.type} t={t} />
                    {rec.resolved ? (
                      <span className="disc-card__resolved-pill">{t('studentProfile.discipline.resolved')}</span>
                    ) : (
                      <span className="disc-card__open-pill">{t('disciplinary.open')}</span>
                    )}
                  </div>
                  <div className="disc-card__date">
                    {new Date(rec.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {rec.recordedByName && <span className="disc-card__by"> — {t('disciplinary.recordedBy')} {rec.recordedByName}</span>}
                  </div>
                  <p className="disc-card__desc">{rec.description}</p>
                  {rec.sanction && (
                    <div className="disc-card__sanction">
                      <strong>{t('disciplinary.sanction')}</strong> {rec.sanction}
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
                  >
                    {rec.resolved ? t('disciplinary.reopen') : t('disciplinary.markResolved')}
                  </button>
                  <button
                    className="disc-card__delete-btn"
                    onClick={() => setConfirm(rec)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <OffCanvas
        open={open}
        onClose={() => setOpen(false)}
        title={t('disciplinary.form.title')}
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
        <div className="disc-form">
          <div>
            <label className="disc-form__label" htmlFor="student-search">
              {t('disciplinary.form.student')} <span className="disc-form__required">*</span>
            </label>
            <input
              id="student-search"
              type="text"
              className={`disc-form__search-input ${errors.studentId ? 'disc-form__search-input--error' : ''}`}
              placeholder={t('disciplinary.form.searchPlaceholder')}
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
              label={t('disciplinary.form.date')}
              type="date"
              required
              value={form.date}
              error={errors.date}
              onChange={(e) => handleChange('date', e.target.value)}
            />
            <Select
              id="type"
              label={t('disciplinary.form.type')}
              value={form.type}
              options={typeSelectOptions}
              onChange={(e) => handleChange('type', e.target.value)}
            />
          </div>

          <Textarea
            id="description"
            label={t('disciplinary.form.description')}
            required
            rows={3}
            placeholder={t('disciplinary.form.descriptionPlaceholder')}
            value={form.description}
            error={errors.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />

          <Input
            id="sanction"
            label={t('disciplinary.form.sanction')}
            value={form.sanction}
            placeholder={t('disciplinary.form.sanctionPlaceholder')}
            onChange={(e) => handleChange('sanction', e.target.value)}
          />

          <div className="disc-form__row">
            <Input
              id="sanctionStart"
              label={t('disciplinary.form.sanctionStart')}
              type="date"
              value={form.sanctionStart}
              onChange={(e) => handleChange('sanctionStart', e.target.value)}
            />
            <Input
              id="sanctionEnd"
              label={t('disciplinary.form.sanctionEnd')}
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
            {t('disciplinary.form.markResolved')}
          </label>
        </div>
      </OffCanvas>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate(confirm.id)}
        loading={deleteMutation.isPending}
        title={t('disciplinary.confirmTitle')}
        message={t('disciplinary.confirmMessage')}
        confirmLabel={t('action.delete')}
        variant="danger"
      />
    </AppShell>
  );
}

export default DisciplinaryPage;
