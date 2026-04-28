import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { institutionsService } from '../../../services/institutionsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import './SettingsPage.css';

const TERM_TYPES = [
  { value: 'TRIMESTRE', label: 'Trimestriel (3 trimestres)' },
  { value: 'SEMESTRE',  label: 'Semestriel (2 semestres)' },
  { value: 'CUSTOM',    label: 'Personnalisé' },
];

const DEFAULT_FORM = {
  academicYear: '',
  termType: 'TRIMESTRE',
  currentTerm: '1',
  passMark: '10',
  maxScore: '20',
  feeGateEnabled: true,
};

function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(DEFAULT_FORM);

  const { data: institution, isLoading } = useQuery({
    queryKey: ['institution-me'],
    queryFn: () => institutionsService.me().then((r) => r.data),
  });

  useEffect(() => {
    if (!institution) return;
    const s = institution.academicSettings ?? {};
    setForm({
      academicYear:   institution.academicYear ?? '',
      termType:       s.termType      ?? 'TRIMESTRE',
      currentTerm:    String(s.currentTerm ?? '1'),
      passMark:       String(s.passMark  ?? '10'),
      maxScore:       String(s.maxScore  ?? '20'),
      feeGateEnabled: s.feeGateEnabled ?? true,
    });
  }, [institution]);

  const mutation = useMutation({
    mutationFn: (data) => institutionsService.updateAcademicSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['institution-me'] });
      toast.success('Paramètres enregistrés');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de sauvegarde'),
  });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSave() {
    mutation.mutate({
      academicYear:   form.academicYear   || undefined,
      termType:       form.termType,
      currentTerm:    Number(form.currentTerm),
      passMark:       Number(form.passMark),
      maxScore:       Number(form.maxScore),
      feeGateEnabled: form.feeGateEnabled,
    });
  }

  const termCountOptions =
    form.termType === 'SEMESTRE'
      ? [{ value: '1', label: '1er semestre' }, { value: '2', label: '2ème semestre' }]
      : [
          { value: '1', label: '1er trimestre' },
          { value: '2', label: '2ème trimestre' },
          { value: '3', label: '3ème trimestre' },
        ];

  if (isLoading) return <AppShell title="Paramètres"><div className="settings-loading">Chargement…</div></AppShell>;

  return (
    <AppShell title="Paramètres">
      <PageHeader
        title="Paramètres académiques"
        subtitle={institution?.name}
        actions={
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        }
      />

      <div className="settings-page__grid">
        {/* Academic year */}
        <Card className="settings-section">
          <h3 className="settings-section__title">Année scolaire</h3>
          <div className="settings-section__body">
            <Input
              id="academicYear" label="Année scolaire en cours"
              value={form.academicYear}
              placeholder="ex: 2024-2025"
              onChange={(e) => set('academicYear', e.target.value)}
            />
            <div className="settings-row">
              <Select
                id="termType" label="Système de périodes"
                value={form.termType}
                options={TERM_TYPES}
                onChange={(e) => set('termType', e.target.value)}
              />
              <Select
                id="currentTerm" label="Période en cours"
                value={form.currentTerm}
                options={termCountOptions}
                onChange={(e) => set('currentTerm', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Grading */}
        <Card className="settings-section">
          <h3 className="settings-section__title">Notation</h3>
          <div className="settings-row">
            <Input
              id="maxScore" label="Note maximale"
              type="number" min="10" max="100"
              value={form.maxScore}
              onChange={(e) => set('maxScore', e.target.value)}
              hint="Généralement 20 (système français)"
            />
            <Input
              id="passMark" label="Moyenne de passage"
              type="number" min="0"
              value={form.passMark}
              onChange={(e) => set('passMark', e.target.value)}
              hint="Généralement 10/20"
            />
          </div>
        </Card>

        {/* Fee gate */}
        <Card className="settings-section">
          <h3 className="settings-section__title">Blocage des bulletins</h3>
          <p className="settings-section__desc">
            Lorsque activé, les bulletins ne sont envoyés aux parents que si les frais scolaires
            sont à jour. Les bulletins restent disponibles dans l'application mais le PDF est
            bloqué jusqu'au paiement.
          </p>
          <label className="settings-toggle">
            <input
              type="checkbox"
              className="settings-toggle__input"
              checked={form.feeGateEnabled}
              onChange={(e) => set('feeGateEnabled', e.target.checked)}
            />
            <span className="settings-toggle__track" />
            <span className="settings-toggle__label">
              {form.feeGateEnabled ? 'Activé — PDF bloqué si frais impayés' : 'Désactivé — PDF envoyé sans condition'}
            </span>
          </label>
        </Card>
      </div>
    </AppShell>
  );
}

export default SettingsPage;
