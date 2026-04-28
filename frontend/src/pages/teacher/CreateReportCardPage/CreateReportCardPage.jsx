import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { reportsService } from '../../../services/reportsService';
import { classesService } from '../../../services/classesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Select from '../../../components/common/Select/Select';
import Input from '../../../components/common/Input/Input';
import Button from '../../../components/common/Button/Button';
import './CreateReportCardPage.css';

const TERM_TYPES = [
  { value: 'TRIMESTRE', label: 'Trimestriel' },
  { value: 'SEMESTRE',  label: 'Semestriel' },
  { value: 'CUSTOM',    label: 'Personnalisé' },
];

const TRIMESTRE_NAMES = [
  { value: '1', label: '1er trimestre' },
  { value: '2', label: '2ème trimestre' },
  { value: '3', label: '3ème trimestre' },
];

const SEMESTRE_NAMES = [
  { value: '1', label: '1er semestre' },
  { value: '2', label: '2ème semestre' },
];

function validate(form) {
  const errors = {};
  if (!form.classId)          errors.classId     = 'Classe requise';
  if (!form.academicYear.trim()) errors.academicYear = 'Année scolaire requise';
  if (!form.termType)         errors.termType    = 'Type de période requis';
  if (!form.termNumber)       errors.termNumber  = 'Période requise';
  return errors;
}

function CreateReportCardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClass = searchParams.get('classId') ?? '';

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
      toast.success('Bulletin créé');
      navigate(`/teacher/reports/${res.data.id}`);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de création'),
  });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function handleSubmit() {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    mutation.mutate({
      classId:      form.classId,
      academicYear: form.academicYear,
      termType:     form.termType,
      termNumber:   Number(form.termNumber),
      termName:     form.termName || undefined,
    });
  }

  const termOptions =
    form.termType === 'SEMESTRE' ? SEMESTRE_NAMES :
    form.termType === 'TRIMESTRE' ? TRIMESTRE_NAMES : [];

  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));

  return (
    <AppShell title="Nouveau bulletin">
      <PageHeader
        title="Nouveau bulletin de notes"
        subtitle="Créez un bulletin pour une classe et une période"
      />

      <Card className="create-report__card">
        <div className="create-report__form">
          <Select
            id="classId" label="Classe" required
            value={form.classId} error={errors.classId}
            placeholder="Sélectionner une classe"
            options={classOptions}
            onChange={(e) => set('classId', e.target.value)}
          />

          <Input
            id="academicYear" label="Année scolaire" required
            value={form.academicYear} error={errors.academicYear}
            placeholder="ex: 2024-2025"
            onChange={(e) => set('academicYear', e.target.value)}
          />

          <div className="create-report__row">
            <Select
              id="termType" label="Type de période" required
              value={form.termType} error={errors.termType}
              options={TERM_TYPES}
              onChange={(e) => { set('termType', e.target.value); set('termNumber', '1'); }}
            />
            {form.termType !== 'CUSTOM' ? (
              <Select
                id="termNumber" label="Période" required
                value={form.termNumber} error={errors.termNumber}
                options={termOptions}
                onChange={(e) => set('termNumber', e.target.value)}
              />
            ) : (
              <Input
                id="termName" label="Nom de la période" required
                value={form.termName} error={errors.termNumber}
                placeholder="ex: Période 1"
                onChange={(e) => { set('termName', e.target.value); set('termNumber', '1'); }}
              />
            )}
          </div>

          {form.termType !== 'CUSTOM' && (
            <Input
              id="termName" label="Libellé personnalisé (optionnel)"
              value={form.termName}
              placeholder={`ex: ${form.termType === 'SEMESTRE' ? '1er semestre 2024' : '1er trimestre 2024'}`}
              onChange={(e) => set('termName', e.target.value)}
            />
          )}

          <div className="create-report__actions">
            <Button variant="ghost" onClick={() => navigate(-1)} disabled={mutation.isPending}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending}>
              {mutation.isPending ? 'Création…' : 'Créer le bulletin'}
            </Button>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}

export default CreateReportCardPage;
