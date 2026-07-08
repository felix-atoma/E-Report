import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useInstitution } from '../../../context/InstitutionContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const PRIMAIRE_LEVELS = ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'];
const COLLEGE_LEVELS  = ['6eme', '5eme', '4eme', '3eme'];
const LYCEE_LEVELS    = ['2nde', '1ere', 'Terminale'];

function getCycleFromLevel(level) {
  if (PRIMAIRE_LEVELS.includes(level)) return 'PRIMAIRE';
  if (COLLEGE_LEVELS.includes(level))  return 'COLLEGE';
  if (LYCEE_LEVELS.includes(level))    return 'LYCEE';
  return null;
}
import { reportsService } from '../../../services/reportsService';
import { classesService } from '../../../services/classesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Select from '../../../components/common/Select/Select';
import Input from '../../../components/common/Input/Input';
import Button from '../../../components/common/Button/Button';
import './CreateReportCardPage.css';

function CreateReportCardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { institution } = useInstitution();
  const [searchParams] = useSearchParams();
  const preselectedClass = searchParams.get('classId') ?? '';

  const termTypes = [
    { value: 'TRIMESTRE', label: t('createReport.termTypes.TRIMESTRE') },
    { value: 'SEMESTRE',  label: t('createReport.termTypes.SEMESTRE') },
    { value: 'CUSTOM',    label: t('createReport.termTypes.CUSTOM') },
  ];
  const triOptions = [
    { value: '1', label: t('createReport.trimestres.1') },
    { value: '2', label: t('createReport.trimestres.2') },
    { value: '3', label: t('createReport.trimestres.3') },
  ];
  const semOptions = [
    { value: '1', label: t('createReport.semestres.1') },
    { value: '2', label: t('createReport.semestres.2') },
  ];

  const [form, setForm]   = useState({
    classId:      preselectedClass,
    academicYear: '',
    termType:     'TRIMESTRE',
    termNumber:   '1',
    termName:     '',
  });
  const [errors, setErrors] = useState({});

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data) => reportsService.create(data),
    onSuccess: (res) => {
      const count = res.data?.count ?? 1;
      toast.success(t('createReport.toast.created', { count }));
      navigate(user?.role === 'ADMIN' ? '/admin/reports' : '/teacher/reports');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('createReport.toast.error')),
  });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function handleClassChange(classId) {
    const cls = classes.find((c) => c.id === classId);
    const byC = institution?.academicSettings?.termSystemByCycle;
    let termType = institution?.academicSettings?.termType ?? 'TRIMESTRE';
    if (cls?.level && byC) {
      const cycle = getCycleFromLevel(cls.level);
      if (cycle && byC[cycle]) termType = byC[cycle];
    }
    setForm((f) => ({ ...f, classId, termType, termNumber: '1' }));
    if (errors.classId) setErrors((e) => ({ ...e, classId: undefined }));
  }

  function validate(form) {
    const errors = {};
    if (!form.classId)             errors.classId     = t('createReport.errors.classRequired');
    if (!form.academicYear.trim()) errors.academicYear = t('createReport.errors.academicYearRequired');
    if (!form.termType)            errors.termType    = t('createReport.errors.termTypeRequired');
    if (!form.termNumber)          errors.termNumber  = t('createReport.errors.termNumberRequired');
    return errors;
  }

  function handleSubmit() {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    mutation.mutate({
      classId:      form.classId,
      academicYear: form.academicYear,
      termType:     form.termType,
      termNumber:   Number(form.termNumber),
      ...(form.termName ? { termName: form.termName } : {}),
    });
  }

  const termOptions =
    form.termType === 'SEMESTRE' ? semOptions :
    form.termType === 'TRIMESTRE' ? triOptions : [];

  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));

  const exampleLabel = form.termType === 'SEMESTRE'
    ? t('createReport.semestres.1')
    : t('createReport.trimestres.1');

  return (
    <AppShell title={t('createReport.title')}>
      <PageHeader
        title={t('createReport.pageTitle')}
        subtitle={t('createReport.subtitle')}
      />

      <Card className="create-report__card">
        <div className="create-report__form">
          <Select
            id="classId" label={t('createReport.fields.class')} required
            value={form.classId} error={errors.classId}
            placeholder={t('createReport.fields.classPlaceholder')}
            options={classOptions}
            onChange={(e) => handleClassChange(e.target.value)}
          />

          <Input
            id="academicYear" label={t('createReport.fields.academicYear')} required
            value={form.academicYear} error={errors.academicYear}
            placeholder="ex: 2024-2025"
            onChange={(e) => set('academicYear', e.target.value)}
          />

          <div className="create-report__row">
            <Select
              id="termType" label={t('createReport.fields.termType')} required
              value={form.termType} error={errors.termType}
              options={termTypes}
              onChange={(e) => { set('termType', e.target.value); set('termNumber', '1'); }}
            />
            {form.termType !== 'CUSTOM' ? (
              <Select
                id="termNumber" label={t('createReport.fields.period')} required
                value={form.termNumber} error={errors.termNumber}
                options={termOptions}
                onChange={(e) => set('termNumber', e.target.value)}
              />
            ) : (
              <Input
                id="termName" label={t('createReport.fields.periodName')} required
                value={form.termName} error={errors.termNumber}
                placeholder={t('createReport.fields.periodPlaceholder')}
                onChange={(e) => { set('termName', e.target.value); set('termNumber', '1'); }}
              />
            )}
          </div>

          {form.termType !== 'CUSTOM' && (
            <Input
              id="termName" label={t('createReport.fields.customLabel')}
              value={form.termName}
              placeholder={`ex: ${exampleLabel} 2024`}
              onChange={(e) => set('termName', e.target.value)}
            />
          )}

          <div className="create-report__actions">
            <Button variant="ghost" onClick={() => navigate(-1)} disabled={mutation.isPending}>
              {t('createReport.actions.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending}>
              {mutation.isPending ? t('createReport.actions.creating') : t('createReport.actions.create')}
            </Button>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}

export default CreateReportCardPage;
