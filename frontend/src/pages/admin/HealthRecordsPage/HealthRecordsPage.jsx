import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { healthRecordsService } from '../../../services/healthRecordsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Input from '../../../components/common/Input/Input';
import Textarea from '../../../components/common/Textarea/Textarea';
import Button from '../../../components/common/Button/Button';
import './HealthRecordsPage.css';

const VISIT_TYPE_KEYS = ['CONSULTATION', 'ACCIDENT', 'VACCINATION', 'DRESSING', 'EVACUATION', 'OTHER'];
const VISIT_TYPE_COLORS = {
  CONSULTATION: { color: '#1d4ed8', bg: '#dbeafe' },
  ACCIDENT:     { color: '#b91c1c', bg: '#fee2e2' },
  VACCINATION:  { color: '#15803d', bg: '#dcfce7' },
  DRESSING:     { color: '#a16207', bg: '#fef3c7' },
  EVACUATION:   { color: '#c2410c', bg: '#ffedd5' },
  OTHER:        { color: '#6b7280', bg: '#f3f4f6' },
};

const EMPTY_FORM = {
  studentId: '', date: '', visitType: 'CONSULTATION',
  complaint: '', diagnosis: '', treatment: '',
  referredToHospital: false, hospital: '', attendedByName: '', notes: '',
};

function VisitTypeBadge({ type, t }) {
  const cfg = VISIT_TYPE_COLORS[type] ?? VISIT_TYPE_COLORS.OTHER;
  return (
    <span className="hr-badge" style={{ color: cfg.color, background: cfg.bg }}>
      {t(`health.types.${type}`, type)}
    </span>
  );
}

export default function HealthRecordsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch]         = useState('');
  const [panelOpen, setPanelOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState({});

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['health-records', typeFilter, search],
    queryFn: () =>
      healthRecordsService
        .list({ type: typeFilter || undefined, search: search || undefined })
        .then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editRecord
        ? healthRecordsService.update(editRecord.id, data)
        : healthRecordsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health-records'] });
      toast.success(editRecord ? t('health.toast.updated') : t('health.toast.created'));
      closePanel();
    },
    onError: () => toast.error(t('health.toast.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => healthRecordsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health-records'] });
      toast.success(t('health.toast.deleted'));
    },
    onError: () => toast.error(t('health.toast.deleteError')),
  });

  function openPanel(record = null) {
    if (record) {
      setEditRecord(record);
      setForm({
        studentId:          record.studentId,
        date:               record.date?.slice(0, 10) ?? '',
        visitType:          record.visitType ?? 'CONSULTATION',
        complaint:          record.complaint         ?? '',
        diagnosis:          record.diagnosis         ?? '',
        treatment:          record.treatment         ?? '',
        referredToHospital: record.referredToHospital ?? false,
        hospital:           record.hospital          ?? '',
        attendedByName:     record.attendedByName    ?? '',
        notes:              record.notes             ?? '',
      });
    } else {
      setEditRecord(null);
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditRecord(null);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.studentId.trim()) e.studentId = t('health.errors.required');
    if (!form.date)             e.date       = t('health.errors.required');
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSubmit() {
    if (!validate()) return;
    saveMutation.mutate({
      studentId:          form.studentId,
      date:               form.date,
      visitType:          form.visitType,
      complaint:          form.complaint          || undefined,
      diagnosis:          form.diagnosis          || undefined,
      treatment:          form.treatment          || undefined,
      referredToHospital: form.referredToHospital,
      hospital:           form.hospital           || undefined,
      attendedByName:     form.attendedByName     || undefined,
      notes:              form.notes              || undefined,
    });
  }

  const studentName = (r) => r.student?.user?.name ?? r.student?.admissionNumber ?? r.studentId;
  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <AppShell>
      <PageHeader
        title={t('health.title')}
        subtitle={t('health.subtitle')}
        actions={<Button size="sm" onClick={() => openPanel()}>{t('health.new')}</Button>}
      />

      <div className="hr-page__filters">
        <input
          className="hr-page__search"
          placeholder={t('health.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="hr-page__tabs">
          <button
            className={`hr-page__tab${typeFilter === '' ? ' active' : ''}`}
            onClick={() => setTypeFilter('')}
          >
            {t('health.all')}
          </button>
          {VISIT_TYPE_KEYS.map((key) => {
            const cfg = VISIT_TYPE_COLORS[key];
            return (
              <button
                key={key}
                className={`hr-page__tab${typeFilter === key ? ' active' : ''}`}
                onClick={() => setTypeFilter(key)}
                style={typeFilter === key ? { background: cfg.bg, color: cfg.color, borderColor: cfg.color } : {}}
              >
                {t(`health.types.${key}`)}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <p className="hr-page__loading">{t('health.loading')}</p>
      ) : records.length === 0 ? (
        <div className="hr-page__empty">
          <span className="hr-page__empty-icon">🏥</span>
          <p>{t('health.empty')}</p>
          <Button size="sm" onClick={() => openPanel()} style={{ marginTop: '1rem' }}>
            {t('health.newVisit')}
          </Button>
        </div>
      ) : (
        <div className="hr-page__list">
          {records.map((rec) => (
            <div key={rec.id} className="hr-card">
              <div className="hr-card__top">
                <span className="hr-card__student">{studentName(rec)}</span>
                <span className="hr-card__date">{fmtDate(rec.date)}</span>
                <VisitTypeBadge type={rec.visitType} t={t} />
                {rec.referredToHospital && (
                  <span className="hr-card__evacuation-badge">{t('health.evacuated')}</span>
                )}
              </div>
              {rec.complaint      && <p className="hr-card__complaint"><strong>{t('health.complaint')}</strong> {rec.complaint}</p>}
              {rec.diagnosis      && <p className="hr-card__diagnosis"><strong>{t('health.diagnosis')}</strong> {rec.diagnosis}</p>}
              {rec.treatment      && <p className="hr-card__treatment"><strong>{t('health.treatment')}</strong> {rec.treatment}</p>}
              {rec.hospital       && <p className="hr-card__hospital"><strong>{t('health.hospital')}</strong> {rec.hospital}</p>}
              {rec.attendedByName && <p className="hr-card__attended"><strong>{t('health.attendedBy')}</strong> {rec.attendedByName}</p>}
              <div className="hr-card__actions">
                <button className="hr-card__btn-edit" onClick={() => openPanel(rec)}>{t('health.edit')}</button>
                <button
                  className="hr-card__btn-del"
                  onClick={() => { if (window.confirm(t('health.confirmDelete'))) deleteMutation.mutate(rec.id); }}
                >
                  {t('health.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <OffCanvas
        open={panelOpen}
        onClose={closePanel}
        title={editRecord ? t('health.form.editTitle') : t('health.form.title')}
        subtitle={
          editRecord
            ? t('health.form.editSubtitle', { name: studentName(editRecord) })
            : t('health.form.newSubtitle')
        }
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closePanel} disabled={saveMutation.isPending}>{t('action.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? t('action.saving') : t('action.save')}
            </Button>
          </>
        }
      >
        <div className="hr-form">
          <div className="hr-form__row2">
            <Input
              label={t('health.form.studentId')}
              required
              placeholder={t('health.form.studentIdPlaceholder')}
              value={form.studentId}
              onChange={(e) => set('studentId', e.target.value)}
              error={errors.studentId}
              disabled={!!editRecord}
            />
            <Input
              label={t('health.form.date')}
              required
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              error={errors.date}
            />
          </div>

          <div className="form-field">
            <label className="form-field__label">{t('health.form.visitType')}</label>
            <div className="hr-form__type-grid">
              {VISIT_TYPE_KEYS.map((key) => {
                const cfg = VISIT_TYPE_COLORS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    className={`hr-form__type-btn${form.visitType === key ? ' active' : ''}`}
                    style={form.visitType === key ? { background: cfg.bg, color: cfg.color, borderColor: cfg.color } : {}}
                    onClick={() => set('visitType', key)}
                  >
                    {t(`health.types.${key}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label={t('health.form.complaint')}
            placeholder={t('health.form.complaintPlaceholder')}
            value={form.complaint}
            onChange={(e) => set('complaint', e.target.value)}
          />

          <Input
            label={t('health.form.diagnosis')}
            placeholder={t('health.form.diagnosisPlaceholder')}
            value={form.diagnosis}
            onChange={(e) => set('diagnosis', e.target.value)}
          />

          <Input
            label={t('health.form.treatment')}
            placeholder={t('health.form.treatmentPlaceholder')}
            value={form.treatment}
            onChange={(e) => set('treatment', e.target.value)}
          />

          <label className="form-field__checkbox">
            <input
              type="checkbox"
              checked={form.referredToHospital}
              onChange={(e) => set('referredToHospital', e.target.checked)}
            />
            {t('health.form.evacuated')}
          </label>

          {form.referredToHospital && (
            <Input
              label={t('health.form.hospitalName')}
              placeholder={t('health.form.hospitalPlaceholder')}
              value={form.hospital}
              onChange={(e) => set('hospital', e.target.value)}
            />
          )}

          <Input
            label={t('health.form.attendedBy')}
            placeholder={t('health.form.attendedByPlaceholder')}
            value={form.attendedByName}
            onChange={(e) => set('attendedByName', e.target.value)}
          />

          <Textarea
            label={t('health.form.notes')}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            placeholder={t('health.form.notesPlaceholder')}
          />
        </div>
      </OffCanvas>
    </AppShell>
  );
}
