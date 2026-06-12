import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { institutionsService } from '../../../services/institutionsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import Loading from '../../../components/common/Loading/Loading';
import './InstitutionsPage.css';

const SCHOOL_TYPE_KEYS = ['MATERNELLE', 'PRIMAIRE', 'COLLEGE', 'LYCEE', 'MIXTE', 'UNIVERSITE', 'PRIVE', 'AUTRE'];
const COUNTRY_KEYS     = ['TG', 'BJ', 'CI', 'GH', 'SN', 'ML', 'BF', 'NE', 'CM', 'GA', 'OTHER'];

const DEFAULT_FORM = {
  name: '', type: '', country: 'TG', region: '',
  directorName: '', email: '', phone: '', address: '',
};

function InstitutionsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});

  const schoolTypeOptions = SCHOOL_TYPE_KEYS.map((k) => ({
    value: k, label: t(`institution.types.${k}`),
  }));

  const countryOptions = COUNTRY_KEYS.map((k) => ({
    value: k, label: t(`institution.countries.${k}`),
  }));

  const { data: institution, isLoading } = useQuery({
    queryKey: ['institution-me'],
    queryFn: () => institutionsService.me().then((r) => r.data),
  });

  useEffect(() => {
    if (!institution) return;
    setForm({
      name:         institution.name         ?? '',
      type:         institution.type         ?? '',
      country:      institution.country      ?? 'TG',
      region:       institution.region       ?? '',
      directorName: institution.directorName ?? '',
      email:        institution.email        ?? '',
      phone:        institution.phone        ?? '',
      address:      institution.address      ?? '',
    });
  }, [institution]);

  const mutation = useMutation({
    mutationFn: (data) => institutionsService.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['institution-me'] });
      toast.success(t('institution.toast.saved'));
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('institution.toast.error')),
  });

  function set(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      if (errors[field]) setErrors((err) => ({ ...err, [field]: undefined }));
    };
  }

  function handleSave() {
    const errs = {};
    if (!form.name.trim()) errs.name = t('institution.errors.nameRequired');
    if (Object.keys(errs).length) { setErrors(errs); return; }
    mutation.mutate({
      name:         form.name,
      type:         form.type         || undefined,
      country:      form.country      || undefined,
      region:       form.region       || undefined,
      directorName: form.directorName || undefined,
      email:        form.email        || undefined,
      phone:        form.phone        || undefined,
      address:      form.address      || undefined,
    });
  }

  if (isLoading) return <AppShell title={t('institution.title')}><Loading /></AppShell>;

  return (
    <AppShell title={t('institution.title')}>
      <PageHeader
        title={t('institution.pageTitle')}
        subtitle={t('institution.subtitle')}
        actions={
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? t('action.saving') : t('action.save')}
          </Button>
        }
      />

      <div className="institutions-page__grid">
        <Card className="institution-section">
          <h3 className="institution-section__title">{t('institution.sections.identity')}</h3>
          <div className="institution-section__body">
            <Input
              id="inst-name"
              label={t('institution.fields.name')}
              required
              value={form.name}
              error={errors.name}
              placeholder={t('institution.fields.namePlaceholder')}
              onChange={set('name')}
            />
            <div className="institution-row">
              <Select
                id="inst-type"
                label={t('institution.fields.type')}
                value={form.type}
                placeholder="—"
                options={schoolTypeOptions}
                onChange={set('type')}
              />
              <Input
                id="inst-director"
                label={t('institution.fields.director')}
                value={form.directorName}
                placeholder={t('institution.fields.directorPlaceholder')}
                onChange={set('directorName')}
              />
            </div>
          </div>
        </Card>

        <Card className="institution-section">
          <h3 className="institution-section__title">{t('institution.sections.location')}</h3>
          <div className="institution-section__body">
            <div className="institution-row">
              <Select
                id="inst-country"
                label={t('institution.fields.country')}
                value={form.country}
                options={countryOptions}
                onChange={set('country')}
              />
              <Input
                id="inst-region"
                label={t('institution.fields.region')}
                value={form.region}
                placeholder={t('institution.fields.regionPlaceholder')}
                onChange={set('region')}
              />
            </div>
            <Input
              id="inst-address"
              label={t('institution.fields.address')}
              value={form.address}
              placeholder={t('institution.fields.addressPlaceholder')}
              onChange={set('address')}
            />
          </div>
        </Card>

        <Card className="institution-section">
          <h3 className="institution-section__title">{t('institution.sections.contact')}</h3>
          <div className="institution-section__body">
            <Input
              id="inst-email"
              label={t('institution.fields.email')}
              type="email"
              value={form.email}
              placeholder={t('institution.fields.emailPlaceholder')}
              onChange={set('email')}
            />
            <Input
              id="inst-phone"
              label={t('institution.fields.phone')}
              value={form.phone}
              placeholder={t('institution.fields.phonePlaceholder')}
              onChange={set('phone')}
            />
          </div>
        </Card>

        <Card className="institution-section institution-section--summary">
          <h3 className="institution-section__title">{t('institution.sections.summary')}</h3>
          <dl className="institution-summary">
            <div className="institution-summary__row">
              <dt>{t('institution.summary.school')}</dt>
              <dd>{institution?.name ?? '—'}</dd>
            </div>
            <div className="institution-summary__row">
              <dt>{t('institution.summary.type')}</dt>
              <dd>{institution?.type ? t(`institution.types.${institution.type}`, institution.type) : '—'}</dd>
            </div>
            <div className="institution-summary__row">
              <dt>{t('institution.summary.country')}</dt>
              <dd>{institution?.country ? t(`institution.countries.${institution.country}`, institution.country) : '—'}</dd>
            </div>
            <div className="institution-summary__row">
              <dt>{t('institution.summary.year')}</dt>
              <dd>{institution?.academicYear ?? '—'}</dd>
            </div>
            <div className="institution-summary__row">
              <dt>{t('institution.summary.plan')}</dt>
              <dd>{institution?.plan ?? 'Standard'}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </AppShell>
  );
}

export default InstitutionsPage;
