import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { institutionsService } from '../../../services/institutionsService';
import { useInstitution } from '../../../context/InstitutionContext';
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

const DEFAULT_INFO = {
  name: '',
  country: '',
  countryMotto: '',
  circonscription: '',
  email: '',
  phone: '',
  address: '',
  website: '',
  motto: '',
  missionStatement: '',
};

const DEFAULT_ACADEMIC = {
  academicYear: '',
  termType: 'TRIMESTRE',
  currentTerm: '1',
  passMark: '10',
  maxScore: '20',
  feeGateEnabled: true,
};

function SettingsPage() {
  const qc = useQueryClient();
  const { setInstitution } = useInstitution();

  const [infoForm, setInfoForm]         = useState(DEFAULT_INFO);
  const [academicForm, setAcademicForm] = useState(DEFAULT_ACADEMIC);

  const { data: institution, isLoading } = useQuery({
    queryKey: ['institution-me'],
    queryFn: () => institutionsService.me().then((r) => r.data),
  });

  useEffect(() => {
    if (!institution) return;
    setInfoForm({
      name:             institution.name             ?? '',
      country:          institution.country          ?? '',
      countryMotto:     institution.countryMotto     ?? '',
      circonscription:  institution.brandingSettings?.circonscription ?? '',
      email:            institution.email            ?? '',
      phone:            institution.phone            ?? '',
      address:          institution.address          ?? '',
      website:          institution.website          ?? '',
      motto:            institution.motto            ?? '',
      missionStatement: institution.missionStatement ?? '',
    });
    const s = institution.academicSettings ?? {};
    setAcademicForm({
      academicYear:   institution.academicYear ?? '',
      termType:       s.termType      ?? 'TRIMESTRE',
      currentTerm:    String(s.currentTerm ?? '1'),
      passMark:       String(s.passMark  ?? '10'),
      maxScore:       String(s.maxScore  ?? '20'),
      feeGateEnabled: s.feeGateEnabled ?? true,
    });
  }, [institution]);

  const infoMutation = useMutation({
    mutationFn: (data) => institutionsService.update(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['institution-me'] });
      if (res?.data) setInstitution(res.data);
      toast.success('Informations enregistrées');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de sauvegarde'),
  });

  const academicMutation = useMutation({
    mutationFn: (data) => institutionsService.updateAcademicSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['institution-me'] });
      toast.success('Paramètres académiques enregistrés');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de sauvegarde'),
  });

  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await institutionsService.exportData();
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_donnees_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  }

  function setInfo(field, value) {
    setInfoForm((f) => ({ ...f, [field]: value }));
  }
  function setAcademic(field, value) {
    setAcademicForm((f) => ({ ...f, [field]: value }));
  }

  function handleInfoSave() {
    infoMutation.mutate({
      name:             infoForm.name             || undefined,
      country:          infoForm.country          || undefined,
      countryMotto:     infoForm.countryMotto     || undefined,
      circonscription:  infoForm.circonscription  || undefined,
      email:            infoForm.email            || undefined,
      phone:            infoForm.phone            || undefined,
      address:          infoForm.address          || undefined,
      website:          infoForm.website          || undefined,
      motto:            infoForm.motto            || undefined,
      missionStatement: infoForm.missionStatement || undefined,
    });
  }

  function handleAcademicSave() {
    academicMutation.mutate({
      academicYear:   academicForm.academicYear   || undefined,
      termType:       academicForm.termType,
      currentTerm:    Number(academicForm.currentTerm),
      passMark:       Number(academicForm.passMark),
      maxScore:       Number(academicForm.maxScore),
      feeGateEnabled: academicForm.feeGateEnabled,
    });
  }

  const termCountOptions =
    academicForm.termType === 'SEMESTRE'
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
        title="Paramètres"
        subtitle={institution?.name}
      />

      <div className="settings-page__grid">

        {/* ── Informations de l'établissement ── */}
        <Card className="settings-section">
          <div className="settings-section__header">
            <div>
              <h3 className="settings-section__title">Informations de l'établissement</h3>
              <p className="settings-section__desc">Ces informations apparaissent sur les bulletins et documents officiels.</p>
            </div>
            <Button
              size="sm"
              onClick={handleInfoSave}
              disabled={infoMutation.isPending}
            >
              {infoMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>

          <div className="settings-section__body">
            <Input
              id="instName"
              label="Nom de l'établissement"
              value={infoForm.name}
              placeholder="ex: Lycée Démonstration de Lomé"
              onChange={(e) => setInfo('name', e.target.value)}
            />
            <div className="settings-row">
              <Input
                id="instCountry"
                label="Pays / République"
                value={infoForm.country}
                placeholder="ex: République Togolaise"
                onChange={(e) => setInfo('country', e.target.value)}
                hint="Affiché en en-tête du bulletin"
              />
              <Input
                id="instCountryMotto"
                label="Devise nationale"
                value={infoForm.countryMotto}
                placeholder="ex: Travail · Liberté · Patrie"
                onChange={(e) => setInfo('countryMotto', e.target.value)}
                hint="Affiché après le nom du pays sur le bulletin"
              />
            </div>
            <Input
              id="instCirconscription"
              label="Circonscription scolaire"
              value={infoForm.circonscription}
              placeholder="ex : Inspection de l'Enseignement du 1er Degré de Lomé-Commune"
              onChange={(e) => setInfo('circonscription', e.target.value)}
              hint="Affiché dans l'en-tête du bulletin sous le nom de l'école"
            />
            <div className="settings-row">
              <Input
                id="instEmail"
                label="Email officiel"
                type="email"
                value={infoForm.email}
                placeholder="contact@etablissement.tg"
                onChange={(e) => setInfo('email', e.target.value)}
              />
              <Input
                id="instPhone"
                label="Téléphone"
                value={infoForm.phone}
                placeholder="+228 XX XX XX XX"
                onChange={(e) => setInfo('phone', e.target.value)}
              />
            </div>
            <div className="settings-row">
              <Input
                id="instAddress"
                label="Adresse"
                value={infoForm.address}
                placeholder="ex: Lomé, Togo"
                onChange={(e) => setInfo('address', e.target.value)}
              />
              <Input
                id="instWebsite"
                label="Site web"
                value={infoForm.website}
                placeholder="https://…"
                onChange={(e) => setInfo('website', e.target.value)}
              />
            </div>
            <Input
              id="instMotto"
              label="Devise / Slogan"
              value={infoForm.motto}
              placeholder="ex: L'excellence au service de la nation"
              onChange={(e) => setInfo('motto', e.target.value)}
            />
            <div className="settings-field">
              <label className="settings-field__label" htmlFor="instMission">Déclaration de mission</label>
              <textarea
                id="instMission"
                className="settings-field__textarea"
                rows={3}
                value={infoForm.missionStatement}
                placeholder="Description courte de la mission de l'établissement…"
                onChange={(e) => setInfo('missionStatement', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* ── Année scolaire ── */}
        <Card className="settings-section">
          <div className="settings-section__header">
            <div>
              <h3 className="settings-section__title">Paramètres académiques</h3>
              <p className="settings-section__desc">Année en cours, système de périodes et règles de notation.</p>
            </div>
            <Button
              size="sm"
              onClick={handleAcademicSave}
              disabled={academicMutation.isPending}
            >
              {academicMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>

          <div className="settings-section__body">
            <Input
              id="academicYear" label="Année scolaire en cours"
              value={academicForm.academicYear}
              placeholder="ex: 2024-2025"
              onChange={(e) => setAcademic('academicYear', e.target.value)}
            />
            <div className="settings-row">
              <Select
                id="termType" label="Système de périodes"
                value={academicForm.termType}
                options={TERM_TYPES}
                onChange={(e) => setAcademic('termType', e.target.value)}
              />
              <Select
                id="currentTerm" label="Période en cours"
                value={academicForm.currentTerm}
                options={termCountOptions}
                onChange={(e) => setAcademic('currentTerm', e.target.value)}
              />
            </div>
            <div className="settings-row">
              <Input
                id="maxScore" label="Note maximale"
                type="number" min="10" max="100"
                value={academicForm.maxScore}
                onChange={(e) => setAcademic('maxScore', e.target.value)}
                hint="Généralement 20 (système français)"
              />
              <Input
                id="passMark" label="Moyenne de passage"
                type="number" min="0"
                value={academicForm.passMark}
                onChange={(e) => setAcademic('passMark', e.target.value)}
                hint="Généralement 10/20"
              />
            </div>
          </div>
        </Card>

        {/* ── Blocage des bulletins ── */}
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
              checked={academicForm.feeGateEnabled}
              onChange={(e) => setAcademic('feeGateEnabled', e.target.checked)}
            />
            <span className="settings-toggle__track" />
            <span className="settings-toggle__label">
              {academicForm.feeGateEnabled ? 'Activé — PDF bloqué si frais impayés' : 'Désactivé — PDF envoyé sans condition'}
            </span>
          </label>
        </Card>

        {/* ── Export des données ── */}
        <Card className="settings-section">
          <h3 className="settings-section__title">Export des données</h3>
          <p className="settings-section__desc">
            Téléchargez toutes les données de votre établissement (élèves, classes, bulletins,
            notes, paiements) en format CSV dans une archive ZIP. Vos données vous appartiennent.
          </p>
          <div className="settings-export">
            <div className="settings-export__files">
              <span>📄 eleves.csv</span>
              <span>📄 classes.csv</span>
              <span>📄 matieres.csv</span>
              <span>📄 bulletins.csv</span>
              <span>📄 notes.csv</span>
              <span>📄 paiements.csv</span>
            </div>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? 'Export en cours…' : '⬇️ Exporter toutes mes données'}
            </Button>
          </div>
        </Card>

      </div>
    </AppShell>
  );
}

export default SettingsPage;
