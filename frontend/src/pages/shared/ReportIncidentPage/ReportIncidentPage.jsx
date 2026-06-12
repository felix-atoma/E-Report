import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { incidentReportsService } from '../../../services/incidentReportsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Textarea from '../../../components/common/Textarea/Textarea';
import Select from '../../../components/common/Select/Select';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import './ReportIncidentPage.css';

const CATEGORY_KEYS = ['BULLYING', 'HARASSMENT', 'DISCRIMINATION', 'TEACHER_MISCONDUCT', 'STUDENT_MISCONDUCT', 'CHEATING', 'THEFT', 'OTHER'];
const ACCUSED_ROLE_VALUES = ['Élève', 'Enseignant', 'Autre'];
const STATUS_CLS = {
  PENDING:      'ri-status--pending',
  UNDER_REVIEW: 'ri-status--review',
  RESOLVED:     'ri-status--resolved',
  DISMISSED:    'ri-status--dismissed',
};

const EMPTY = { category: '', title: '', description: '', accusedName: '', accusedRole: 'Élève', anonymous: false };

export default function ReportIncidentPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const categories = CATEGORY_KEYS.map((k) => ({ value: k, label: t(`reportIncident.category.${k}`) }));
  const accusedRoles = ACCUSED_ROLE_VALUES.map((v) => ({ value: v, label: t(`reportIncident.roles.${v}`) }));

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['incidents', 'mine'],
    queryFn: () => incidentReportsService.mine().then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data) => incidentReportsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents', 'mine'] });
      toast.success(t('reportIncident.toast.sent'));
      closePanel();
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('reportIncident.toast.error')),
  });

  function closePanel() {
    setPanelOpen(false);
    setForm(EMPTY);
  }

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit() {
    if (!form.category || !form.title || !form.description || !form.accusedName || !form.accusedRole) {
      toast.error(t('reportIncident.errors.fieldsRequired'));
      return;
    }
    if (form.description.length < 20) {
      toast.error(t('reportIncident.errors.descriptionTooShort'));
      return;
    }
    mutation.mutate({
      category:    form.category,
      title:       form.title,
      description: form.description,
      accusedName: form.accusedName,
      accusedRole: form.accusedRole,
      anonymous:   form.anonymous,
    });
  }

  const isTeacher = user?.role === 'TEACHER';

  return (
    <AppShell title={t('reportIncident.title')}>
      <PageHeader
        title={t('reportIncident.title')}
        subtitle={t('reportIncident.subtitle')}
        actions={
          <Button icon="+" onClick={() => setPanelOpen(true)}>{t('reportIncident.newReport')}</Button>
        }
      />

      <div className="ri-list">
        {isLoading ? (
          <p className="ri-empty">{t('action.loading')}</p>
        ) : reports.length === 0 ? (
          <div className="ri-empty-state">
            <div className="ri-empty-state__icon">🛡️</div>
            <p className="ri-empty-state__text">{t('reportIncident.empty')}</p>
            <p className="ri-empty-state__sub">
              {isTeacher ? t('reportIncident.emptyTeacher') : t('reportIncident.emptyStudent')}
            </p>
          </div>
        ) : (
          reports.map((r) => (
            <Card key={r.id} className="ri-card">
              <div className="ri-card__header">
                <div className="ri-card__meta">
                  <span className="ri-card__cat">{t(`reportIncident.category.${r.category}`, r.category)}</span>
                  <span className={`ri-status ${STATUS_CLS[r.status] ?? STATUS_CLS.PENDING}`}>
                    {t(`reportIncident.status.${r.status}`, r.status)}
                  </span>
                  {r.anonymous && <span className="ri-card__anon">{t('reportIncident.anonymous')}</span>}
                </div>
                <span className="ri-card__date">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
              <h4 className="ri-card__title">{r.title}</h4>
              <p className="ri-card__accused">{t('reportIncident.concerning')} <strong>{r.accusedName}</strong> — {r.accusedRole}</p>
              <p className="ri-card__desc">{r.description}</p>
              {r.adminNotes && (
                <div className="ri-card__admin-note">
                  <span className="ri-card__admin-note__label">{t('reportIncident.adminNote')}</span>
                  <p>{r.adminNotes}</p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <OffCanvas
        open={panelOpen}
        onClose={closePanel}
        title={t('reportIncident.form.title')}
        subtitle={t('reportIncident.form.subtitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closePanel} disabled={mutation.isPending}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending}>
              {mutation.isPending ? t('reportIncident.form.submitting') : t('reportIncident.form.submit')}
            </Button>
          </>
        }
      >
        <div className="ri-form">
          <Select
            id="ri-category"
            label={t('reportIncident.form.category')}
            required
            value={form.category}
            options={categories}
            placeholder={t('reportIncident.form.selectCategory')}
            onChange={(e) => handleChange('category', e.target.value)}
          />

          <div className="ri-form__row">
            <Input
              id="ri-accused-name"
              label={t('reportIncident.form.accusedName')}
              value={form.accusedName}
              onChange={(e) => handleChange('accusedName', e.target.value)}
              placeholder="Prénom et nom"
              required
            />
            <Select
              id="ri-accused-role"
              label={t('reportIncident.form.accusedRole')}
              required
              value={form.accusedRole}
              options={accusedRoles}
              onChange={(e) => handleChange('accusedRole', e.target.value)}
            />
          </div>

          <Input
            id="ri-title"
            label={t('reportIncident.form.subject')}
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder={t('reportIncident.form.subjectPlaceholder')}
            required
          />

          <Textarea
            id="ri-description"
            label={t('reportIncident.form.description')}
            hint={t('reportIncident.form.descriptionHint')}
            rows={5}
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder={t('reportIncident.form.descriptionPlaceholder')}
            required
          />

          <label className="ri-form__checkbox">
            <input
              type="checkbox"
              checked={form.anonymous}
              onChange={(e) => handleChange('anonymous', e.target.checked)}
            />
            <span>
              {t('reportIncident.form.anonymous')}
              <span className="form-field__hint"> {t('reportIncident.form.anonymousHint')}</span>
            </span>
          </label>
        </div>
      </OffCanvas>
    </AppShell>
  );
}
