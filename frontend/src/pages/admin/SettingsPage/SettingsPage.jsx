import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { institutionsService } from '../../../services/institutionsService';
import { studentsService } from '../../../services/studentsService';
import { useInstitution } from '../../../context/InstitutionContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import './SettingsPage.css';

const TERM_TYPES = [
  { value: 'TRIMESTRE', label: 'Trimestriel (3 trimestres)' },
  { value: 'SEMESTRE',  label: 'Semestriel (2 semestres)' },
  { value: 'CUSTOM',    label: 'Personnalisé' },
];

const DEFAULT_INFO = {
  name: '', country: '', countryMotto: '', circonscription: '',
  email: '', phone: '', address: '', website: '', motto: '', missionStatement: '',
};

const DEFAULT_ACADEMIC = {
  academicYear: '', termType: 'TRIMESTRE', currentTerm: '1',
  passMark: '10', maxScore: '20', feeGateEnabled: true,
};

function SummaryRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="settings-summary__row">
      <span className="settings-summary__label">{label}</span>
      <span className="settings-summary__value">{value}</span>
    </div>
  );
}

function SettingsPage() {
  const qc = useQueryClient();
  const { setInstitution } = useInstitution();

  const [infoForm, setInfoForm]         = useState(DEFAULT_INFO);
  const [academicForm, setAcademicForm] = useState(DEFAULT_ACADEMIC);
  const [infoOpen, setInfoOpen]         = useState(false);
  const [academicOpen, setAcademicOpen] = useState(false);
  const [exporting, setExporting]       = useState(false);
  const [rolloverOpen, setRolloverOpen] = useState(false);
  const [rolloverForm, setRolloverForm] = useState({ fromYear: '', toYear: '' });
  const [rollingOver, setRollingOver]   = useState(false);

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
      setInfoOpen(false);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de sauvegarde'),
  });

  const academicMutation = useMutation({
    mutationFn: (data) => institutionsService.updateAcademicSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['institution-me'] });
      toast.success('Paramètres académiques enregistrés');
      setAcademicOpen(false);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de sauvegarde'),
  });

  function setInfo(field, value) { setInfoForm((f) => ({ ...f, [field]: value })); }
  function setAcademic(field, value) { setAcademicForm((f) => ({ ...f, [field]: value })); }

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

  async function handleRollover() {
    if (!rolloverForm.fromYear || !rolloverForm.toYear) { toast.error('Renseignez les deux années'); return; }
    if (!window.confirm(`Réinscrire tous les élèves de ${rolloverForm.fromYear} vers ${rolloverForm.toYear} ?`)) return;
    setRollingOver(true);
    try {
      const res = await studentsService.yearRollover(rolloverForm.fromYear, rolloverForm.toYear);
      toast.success(res.data?.message ?? 'Passage en année suivante réussi');
      setRolloverOpen(false);
      qc.invalidateQueries({ queryKey: ['institution-me'] });
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Erreur lors du passage de l\'année');
    } finally {
      setRollingOver(false);
    }
  }

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

  const termCountOptions =
    academicForm.termType === 'SEMESTRE'
      ? [{ value: '1', label: '1er semestre' }, { value: '2', label: '2ème semestre' }]
      : [
          { value: '1', label: '1er trimestre' },
          { value: '2', label: '2ème trimestre' },
          { value: '3', label: '3ème trimestre' },
        ];

  const bs = institution?.brandingSettings ?? {};
  const ac = institution?.academicSettings ?? {};

  if (isLoading) return <AppShell title="Paramètres"><div className="settings-loading">Chargement…</div></AppShell>;

  return (
    <AppShell title="Paramètres">
      <PageHeader title="Paramètres" subtitle={institution?.name} />

      <div className="settings-page__grid">

        {/* ── Informations ── */}
        <Card className="settings-section">
          <div className="settings-section__header">
            <div>
              <h3 className="settings-section__title">Informations de l'établissement</h3>
              <p className="settings-section__desc">Nom, coordonnées et textes affichés sur les bulletins.</p>
            </div>
            <Button size="sm" onClick={() => setInfoOpen(true)}>Modifier</Button>
          </div>
          <div className="settings-summary">
            <SummaryRow label="Nom"            value={institution?.name} />
            <SummaryRow label="Pays"           value={institution?.country} />
            <SummaryRow label="Devise nat."    value={institution?.countryMotto} />
            <SummaryRow label="Circonscription" value={bs.circonscription} />
            <SummaryRow label="Email"          value={institution?.email} />
            <SummaryRow label="Téléphone"      value={institution?.phone} />
            <SummaryRow label="Adresse"        value={institution?.address} />
            <SummaryRow label="Site web"       value={institution?.website} />
            <SummaryRow label="Devise"         value={institution?.motto} />
          </div>
        </Card>

        {/* ── Paramètres académiques ── */}
        <Card className="settings-section">
          <div className="settings-section__header">
            <div>
              <h3 className="settings-section__title">Paramètres académiques</h3>
              <p className="settings-section__desc">Année en cours, système de périodes et règles de notation.</p>
            </div>
            <Button size="sm" onClick={() => setAcademicOpen(true)}>Modifier</Button>
          </div>
          <div className="settings-summary">
            <SummaryRow label="Année scolaire" value={institution?.academicYear} />
            <SummaryRow label="Système"        value={TERM_TYPES.find((t) => t.value === (ac.termType ?? 'TRIMESTRE'))?.label} />
            <SummaryRow label="Période cours"  value={`Période ${ac.currentTerm ?? 1}`} />
            <SummaryRow label="Note max"       value={ac.maxScore ? `${ac.maxScore}` : '20'} />
            <SummaryRow label="Moy. passage"   value={ac.passMark ? `${ac.passMark}` : '10'} />
            <div className="settings-summary__row">
              <span className="settings-summary__label">Blocage PDF</span>
              <span className={`settings-summary__badge ${ac.feeGateEnabled !== false ? 'settings-summary__badge--on' : 'settings-summary__badge--off'}`}>
                {ac.feeGateEnabled !== false ? 'Activé' : 'Désactivé'}
              </span>
            </div>
          </div>
        </Card>

        {/* ── Export ── */}
        {/* ── Academic year rollover ─────────────────────────────────── */}
        <Card className="settings-section">
          <h3 className="settings-section__title">Passage en année suivante</h3>
          <p className="settings-section__desc">
            Réinscrit automatiquement tous les élèves dans les mêmes classes pour une nouvelle année scolaire.
          </p>
          {rolloverOpen ? (
            <div className="settings-rollover">
              <div className="settings-rollover__row">
                <div className="form-field">
                  <label className="form-field__label">Année source</label>
                  <input className="settings-rollover__input" placeholder="2023-2024"
                    value={rolloverForm.fromYear}
                    onChange={(e) => setRolloverForm((f) => ({ ...f, fromYear: e.target.value }))} />
                </div>
                <div className="settings-rollover__arrow">→</div>
                <div className="form-field">
                  <label className="form-field__label">Nouvelle année</label>
                  <input className="settings-rollover__input" placeholder="2024-2025"
                    value={rolloverForm.toYear}
                    onChange={(e) => setRolloverForm((f) => ({ ...f, toYear: e.target.value }))} />
                </div>
              </div>
              <div className="settings-rollover__btns">
                <Button variant="ghost" size="sm" onClick={() => setRolloverOpen(false)}>Annuler</Button>
                <Button size="sm" onClick={handleRollover} disabled={rollingOver}>
                  {rollingOver ? 'En cours…' : 'Confirmer le passage'}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setRolloverOpen(true)}>
              🔄 Passer à l'année suivante
            </Button>
          )}
        </Card>

        <Card className="settings-section">
          <h3 className="settings-section__title">Export des données</h3>
          <p className="settings-section__desc">
            Téléchargez toutes les données de votre établissement (élèves, classes, bulletins,
            notes, paiements) en format CSV dans une archive ZIP.
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

      {/* ── OffCanvas: Informations ── */}
      <OffCanvas
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        title="Informations de l'établissement"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setInfoOpen(false)} disabled={infoMutation.isPending}>
              Annuler
            </Button>
            <Button onClick={handleInfoSave} disabled={infoMutation.isPending}>
              {infoMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <div className="settings-section__body">
          <Input
            id="instName" label="Nom de l'établissement"
            value={infoForm.name} placeholder="ex: Lycée Démonstration de Lomé"
            onChange={(e) => setInfo('name', e.target.value)}
          />
          <div className="settings-row">
            <Input
              id="instCountry" label="Pays / République"
              value={infoForm.country} placeholder="ex: République Togolaise"
              onChange={(e) => setInfo('country', e.target.value)}
              hint="Affiché en en-tête du bulletin"
            />
            <Input
              id="instCountryMotto" label="Devise nationale"
              value={infoForm.countryMotto} placeholder="ex: Travail · Liberté · Patrie"
              onChange={(e) => setInfo('countryMotto', e.target.value)}
            />
          </div>
          <Input
            id="instCirconscription" label="Circonscription scolaire"
            value={infoForm.circonscription}
            placeholder="ex : Inspection de l'Enseignement du 1er Degré de Lomé-Commune"
            onChange={(e) => setInfo('circonscription', e.target.value)}
            hint="Affiché dans l'en-tête du bulletin sous le nom de l'école"
          />
          <div className="settings-row">
            <Input
              id="instEmail" label="Email officiel" type="email"
              value={infoForm.email} placeholder="contact@etablissement.tg"
              onChange={(e) => setInfo('email', e.target.value)}
            />
            <Input
              id="instPhone" label="Téléphone"
              value={infoForm.phone} placeholder="+228 XX XX XX XX"
              onChange={(e) => setInfo('phone', e.target.value)}
            />
          </div>
          <div className="settings-row">
            <Input
              id="instAddress" label="Adresse"
              value={infoForm.address} placeholder="ex: Lomé, Togo"
              onChange={(e) => setInfo('address', e.target.value)}
            />
            <Input
              id="instWebsite" label="Site web"
              value={infoForm.website} placeholder="https://…"
              onChange={(e) => setInfo('website', e.target.value)}
            />
          </div>
          <Input
            id="instMotto" label="Devise / Slogan"
            value={infoForm.motto} placeholder="ex: L'excellence au service de la nation"
            onChange={(e) => setInfo('motto', e.target.value)}
          />
          <div className="settings-field">
            <label className="settings-field__label" htmlFor="instMission">Déclaration de mission</label>
            <textarea
              id="instMission" className="settings-field__textarea" rows={3}
              value={infoForm.missionStatement}
              placeholder="Description courte de la mission de l'établissement…"
              onChange={(e) => setInfo('missionStatement', e.target.value)}
            />
          </div>
        </div>
      </OffCanvas>

      {/* ── OffCanvas: Paramètres académiques ── */}
      <OffCanvas
        open={academicOpen}
        onClose={() => setAcademicOpen(false)}
        title="Paramètres académiques"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAcademicOpen(false)} disabled={academicMutation.isPending}>
              Annuler
            </Button>
            <Button onClick={handleAcademicSave} disabled={academicMutation.isPending}>
              {academicMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <div className="settings-section__body">
          <Input
            id="academicYear" label="Année scolaire en cours"
            value={academicForm.academicYear} placeholder="ex: 2024-2025"
            onChange={(e) => setAcademic('academicYear', e.target.value)}
          />
          <div className="settings-row">
            <Select
              id="termType" label="Système de périodes"
              value={academicForm.termType} options={TERM_TYPES}
              onChange={(e) => setAcademic('termType', e.target.value)}
            />
            <Select
              id="currentTerm" label="Période en cours"
              value={academicForm.currentTerm} options={termCountOptions}
              onChange={(e) => setAcademic('currentTerm', e.target.value)}
            />
          </div>
          <div className="settings-row">
            <Input
              id="maxScore" label="Note maximale" type="number" min="10" max="100"
              value={academicForm.maxScore}
              onChange={(e) => setAcademic('maxScore', e.target.value)}
              hint="Généralement 20 (système français)"
            />
            <Input
              id="passMark" label="Moyenne de passage" type="number" min="0"
              value={academicForm.passMark}
              onChange={(e) => setAcademic('passMark', e.target.value)}
              hint="Généralement 10/20"
            />
          </div>

          <div className="settings-section__divider" />

          <div>
            <p className="settings-field__label" style={{ marginBottom: '0.5rem' }}>Blocage des bulletins PDF</p>
            <p className="settings-section__desc" style={{ marginBottom: '0.75rem' }}>
              Lorsqu'activé, le PDF du bulletin est bloqué jusqu'au paiement des frais scolaires.
            </p>
            <label className="settings-toggle">
              <input
                type="checkbox" className="settings-toggle__input"
                checked={academicForm.feeGateEnabled}
                onChange={(e) => setAcademic('feeGateEnabled', e.target.checked)}
              />
              <span className="settings-toggle__track" />
              <span className="settings-toggle__label">
                {academicForm.feeGateEnabled ? 'Activé — PDF bloqué si frais impayés' : 'Désactivé — PDF envoyé sans condition'}
              </span>
            </label>
          </div>
        </div>
      </OffCanvas>

    </AppShell>
  );
}

export default SettingsPage;
