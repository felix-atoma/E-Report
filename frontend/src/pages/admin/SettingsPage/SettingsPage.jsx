import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

const DEFAULT_INFO = {
  name: '', country: '', countryMotto: '', circonscription: '',
  email: '', phone: '', address: '', website: '', motto: '', missionStatement: '',
};

const DEFAULT_ACADEMIC = {
  academicYear: '', termType: 'TRIMESTRE', currentTerm: '1',
  passMark: '10', maxScore: '20', feeGateEnabled: true,
};

const DEFAULT_PAYMENT = { notchpayPublicKey: '', notchpayHashKey: '' };

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
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { setInstitution } = useInstitution();

  const TERM_TYPES = [
    { value: 'TRIMESTRE', label: t('settings.termTypes.TRIMESTRE') },
    { value: 'SEMESTRE',  label: t('settings.termTypes.SEMESTRE') },
    { value: 'CUSTOM',    label: t('settings.termTypes.CUSTOM') },
  ];

  const [infoForm, setInfoForm]         = useState(DEFAULT_INFO);
  const [academicForm, setAcademicForm] = useState(DEFAULT_ACADEMIC);
  const [paymentForm, setPaymentForm]   = useState(DEFAULT_PAYMENT);
  const [infoOpen, setInfoOpen]         = useState(false);
  const [academicOpen, setAcademicOpen] = useState(false);
  const [paymentOpen, setPaymentOpen]   = useState(false);
  const [exporting, setExporting]       = useState(false);
  const [rolloverOpen, setRolloverOpen] = useState(false);
  const [rolloverForm, setRolloverForm] = useState({ fromYear: '', toYear: '' });
  const [rollingOver, setRollingOver]   = useState(false);

  const { data: institution, isLoading } = useQuery({
    queryKey: ['institution-me'],
    queryFn: () => institutionsService.me().then((r) => r.data),
  });

  const { data: paymentSettings } = useQuery({
    queryKey: ['institution-payment-settings'],
    queryFn: () => institutionsService.getPaymentSettings().then((r) => r.data),
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

  useEffect(() => {
    if (!paymentSettings) return;
    setPaymentForm({
      notchpayPublicKey: paymentSettings.notchpayPublicKey ?? '',
      notchpayHashKey:   '',
    });
  }, [paymentSettings]);

  const infoMutation = useMutation({
    mutationFn: (data) => institutionsService.update(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['institution-me'] });
      if (res?.data) setInstitution(res.data);
      toast.success(t('settings.toast.infoSaved'));
      setInfoOpen(false);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('settings.toast.saveError')),
  });

  const academicMutation = useMutation({
    mutationFn: (data) => institutionsService.updateAcademicSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['institution-me'] });
      toast.success(t('settings.toast.academicSaved'));
      setAcademicOpen(false);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('settings.toast.saveError')),
  });

  const paymentMutation = useMutation({
    mutationFn: (data) => institutionsService.updatePaymentSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['institution-payment-settings'] });
      toast.success(t('settings.toast.paymentSaved'));
      setPaymentOpen(false);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('settings.toast.saveError')),
  });

  function setInfo(field, value) { setInfoForm((f) => ({ ...f, [field]: value })); }
  function setAcademic(field, value) { setAcademicForm((f) => ({ ...f, [field]: value })); }
  function setPayment(field, value) { setPaymentForm((f) => ({ ...f, [field]: value })); }

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

  function handlePaymentSave() {
    paymentMutation.mutate({
      notchpayPublicKey: paymentForm.notchpayPublicKey || undefined,
      notchpayHashKey:   paymentForm.notchpayHashKey   || undefined,
    });
  }

  async function handleRollover() {
    if (!rolloverForm.fromYear || !rolloverForm.toYear) { toast.error(t('settings.toast.rolloverFillYears')); return; }
    if (!window.confirm(t('settings.rolloverDesc'))) return;
    setRollingOver(true);
    try {
      const res = await studentsService.yearRollover(rolloverForm.fromYear, rolloverForm.toYear);
      toast.success(res.data?.message ?? t('settings.toast.rolloverSuccess'));
      setRolloverOpen(false);
      qc.invalidateQueries({ queryKey: ['institution-me'] });
    } catch (err) {
      toast.error(err?.response?.data?.message ?? t('settings.toast.rolloverError'));
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
      toast.error(t('settings.toast.exportError'));
    } finally {
      setExporting(false);
    }
  }

  const termCountOptions =
    academicForm.termType === 'SEMESTRE'
      ? [{ value: '1', label: t('fees.terms.SEMESTRE_1') }, { value: '2', label: t('fees.terms.SEMESTRE_2') }]
      : [
          { value: '1', label: t('fees.terms.TRIMESTRE_1') },
          { value: '2', label: t('fees.terms.TRIMESTRE_2') },
          { value: '3', label: t('fees.terms.TRIMESTRE_3') },
        ];

  const bs = institution?.brandingSettings ?? {};
  const ac = institution?.academicSettings ?? {};

  if (isLoading) return <AppShell title={t('settings.title')}><div className="settings-loading">{t('action.loading')}</div></AppShell>;

  return (
    <AppShell title={t('settings.title')}>
      <PageHeader title={t('settings.title')} subtitle={institution?.name} />

      <div className="settings-page__grid">

        <Card className="settings-section">
          <div className="settings-section__header">
            <div>
              <h3 className="settings-section__title">{t('settings.institutionInfo')}</h3>
              <p className="settings-section__desc">{t('settings.institutionDesc')}</p>
            </div>
            <Button size="sm" onClick={() => setInfoOpen(true)}>{t('action.edit')}</Button>
          </div>
          <div className="settings-summary">
            <SummaryRow label={t('settings.schoolName')}     value={institution?.name} />
            <SummaryRow label={t('settings.country')}        value={institution?.country} />
            <SummaryRow label={t('settings.countryMotto')}   value={institution?.countryMotto} />
            <SummaryRow label={t('settings.circonscription')} value={bs.circonscription} />
            <SummaryRow label={t('users.email')}             value={institution?.email} />
            <SummaryRow label={t('settings.phone')}          value={institution?.phone} />
            <SummaryRow label={t('settings.address')}        value={institution?.address} />
            <SummaryRow label={t('settings.website')}        value={institution?.website} />
            <SummaryRow label={t('settings.motto')}          value={institution?.motto} />
          </div>
        </Card>

        <Card className="settings-section">
          <div className="settings-section__header">
            <div>
              <h3 className="settings-section__title">{t('settings.academicSection')}</h3>
              <p className="settings-section__desc">{t('settings.academicDesc')}</p>
            </div>
            <Button size="sm" onClick={() => setAcademicOpen(true)}>{t('action.edit')}</Button>
          </div>
          <div className="settings-summary">
            <SummaryRow label={t('settings.academicYear')} value={institution?.academicYear} />
            <SummaryRow label={t('settings.termSystem')}   value={TERM_TYPES.find((opt) => opt.value === (ac.termType ?? 'TRIMESTRE'))?.label} />
            <SummaryRow label={t('settings.currentPeriod')} value={`${t('fees.period')} ${ac.currentTerm ?? 1}`} />
            <SummaryRow label={t('settings.maxScore')}     value={ac.maxScore ? `${ac.maxScore}` : '20'} />
            <SummaryRow label={t('settings.passMark')}     value={ac.passMark ? `${ac.passMark}` : '10'} />
            <div className="settings-summary__row">
              <span className="settings-summary__label">{t('settings.feeGateStatus')}</span>
              <span className={`settings-summary__badge ${ac.feeGateEnabled !== false ? 'settings-summary__badge--on' : 'settings-summary__badge--off'}`}>
                {ac.feeGateEnabled !== false ? t('settings.on') : t('settings.off')}
              </span>
            </div>
          </div>
        </Card>

        <Card className="settings-section">
          <div className="settings-section__header">
            <div>
              <h3 className="settings-section__title">{t('settings.paymentSection')}</h3>
              <p className="settings-section__desc">{t('settings.paymentDesc')}</p>
            </div>
            <Button size="sm" onClick={() => setPaymentOpen(true)}>{t('action.edit')}</Button>
          </div>
          <div className="settings-summary">
            <SummaryRow label={t('settings.notchpayPublicKey')} value={paymentSettings?.notchpayPublicKey || undefined} />
            <div className="settings-summary__row">
              <span className="settings-summary__label">{t('settings.notchpayHashKey')}</span>
              <span className={`settings-summary__badge ${paymentSettings?.notchpayHashKeyConfigured ? 'settings-summary__badge--on' : 'settings-summary__badge--off'}`}>
                {paymentSettings?.notchpayHashKeyConfigured ? t('settings.configured') : t('settings.notConfigured')}
              </span>
            </div>
          </div>
        </Card>

        <Card className="settings-section">
          <h3 className="settings-section__title">{t('settings.rollover')}</h3>
          <p className="settings-section__desc">{t('settings.rolloverDesc')}</p>
          {rolloverOpen ? (
            <div className="settings-rollover">
              <div className="settings-rollover__row">
                <div className="form-field">
                  <label className="form-field__label">{t('settings.fromYear')}</label>
                  <input className="settings-rollover__input" placeholder="2023-2024"
                    value={rolloverForm.fromYear}
                    onChange={(e) => setRolloverForm((f) => ({ ...f, fromYear: e.target.value }))} />
                </div>
                <div className="settings-rollover__arrow">→</div>
                <div className="form-field">
                  <label className="form-field__label">{t('settings.toYear')}</label>
                  <input className="settings-rollover__input" placeholder="2024-2025"
                    value={rolloverForm.toYear}
                    onChange={(e) => setRolloverForm((f) => ({ ...f, toYear: e.target.value }))} />
                </div>
              </div>
              <div className="settings-rollover__btns">
                <Button variant="ghost" size="sm" onClick={() => setRolloverOpen(false)}>{t('action.cancel')}</Button>
                <Button size="sm" onClick={handleRollover} disabled={rollingOver}>
                  {rollingOver ? t('settings.rolloverInProgress') : t('settings.confirmRollover')}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setRolloverOpen(true)}>
              {t('settings.rolloverBtn')}
            </Button>
          )}
        </Card>

        <Card className="settings-section">
          <h3 className="settings-section__title">{t('settings.exportData')}</h3>
          <p className="settings-section__desc">{t('settings.exportDataDesc')}</p>
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
              {exporting ? t('settings.exporting') : t('settings.exportBtn')}
            </Button>
          </div>
        </Card>

      </div>

      <OffCanvas
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        title={t('settings.institutionInfo')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setInfoOpen(false)} disabled={infoMutation.isPending}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleInfoSave} disabled={infoMutation.isPending}>
              {infoMutation.isPending ? t('action.saving') : t('action.save')}
            </Button>
          </>
        }
      >
        <div className="settings-section__body">
          <Input
            id="instName" label={t('settings.schoolName')}
            value={infoForm.name} placeholder="ex: Lycée Démonstration de Lomé"
            onChange={(e) => setInfo('name', e.target.value)}
          />
          <div className="settings-row">
            <Input
              id="instCountry" label={t('settings.country')}
              value={infoForm.country} placeholder="ex: République Togolaise"
              onChange={(e) => setInfo('country', e.target.value)}
              hint={t('settings.countryHint')}
            />
            <Input
              id="instCountryMotto" label={t('settings.countryMotto')}
              value={infoForm.countryMotto} placeholder="ex: Travail · Liberté · Patrie"
              onChange={(e) => setInfo('countryMotto', e.target.value)}
            />
          </div>
          <Input
            id="instCirconscription" label={t('settings.circonscription')}
            value={infoForm.circonscription}
            placeholder="ex : Inspection de l'Enseignement du 1er Degré de Lomé-Commune"
            onChange={(e) => setInfo('circonscription', e.target.value)}
            hint={t('settings.circoHint')}
          />
          <div className="settings-row">
            <Input
              id="instEmail" label={t('settings.officialEmail')} type="email"
              value={infoForm.email} placeholder="contact@etablissement.tg"
              onChange={(e) => setInfo('email', e.target.value)}
            />
            <Input
              id="instPhone" label={t('settings.phone')}
              value={infoForm.phone} placeholder="+228 XX XX XX XX"
              onChange={(e) => setInfo('phone', e.target.value)}
            />
          </div>
          <div className="settings-row">
            <Input
              id="instAddress" label={t('settings.address')}
              value={infoForm.address} placeholder="ex: Lomé, Togo"
              onChange={(e) => setInfo('address', e.target.value)}
            />
            <Input
              id="instWebsite" label={t('settings.website')}
              value={infoForm.website} placeholder="https://…"
              onChange={(e) => setInfo('website', e.target.value)}
            />
          </div>
          <Input
            id="instMotto" label={t('settings.motto')}
            value={infoForm.motto} placeholder="ex: L'excellence au service de la nation"
            onChange={(e) => setInfo('motto', e.target.value)}
          />
          <div className="settings-field">
            <label className="settings-field__label" htmlFor="instMission">{t('settings.missionStatement')}</label>
            <textarea
              id="instMission" className="settings-field__textarea" rows={3}
              value={infoForm.missionStatement}
              placeholder={t('settings.missionPlaceholder')}
              onChange={(e) => setInfo('missionStatement', e.target.value)}
            />
          </div>
        </div>
      </OffCanvas>

      <OffCanvas
        open={academicOpen}
        onClose={() => setAcademicOpen(false)}
        title={t('settings.academicSection')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAcademicOpen(false)} disabled={academicMutation.isPending}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleAcademicSave} disabled={academicMutation.isPending}>
              {academicMutation.isPending ? t('action.saving') : t('action.save')}
            </Button>
          </>
        }
      >
        <div className="settings-section__body">
          <Input
            id="academicYear" label={t('settings.currentYear')}
            value={academicForm.academicYear} placeholder="ex: 2024-2025"
            onChange={(e) => setAcademic('academicYear', e.target.value)}
          />
          <div className="settings-row">
            <Select
              id="termType" label={t('settings.termSystem')}
              value={academicForm.termType} options={TERM_TYPES}
              onChange={(e) => setAcademic('termType', e.target.value)}
            />
            <Select
              id="currentTerm" label={t('settings.currentPeriod')}
              value={academicForm.currentTerm} options={termCountOptions}
              onChange={(e) => setAcademic('currentTerm', e.target.value)}
            />
          </div>
          <div className="settings-row">
            <Input
              id="maxScore" label={t('settings.maxScore')} type="number" min="10" max="100"
              value={academicForm.maxScore}
              onChange={(e) => setAcademic('maxScore', e.target.value)}
              hint={t('settings.maxScoreHint')}
            />
            <Input
              id="passMark" label={t('settings.passMark')} type="number" min="0"
              value={academicForm.passMark}
              onChange={(e) => setAcademic('passMark', e.target.value)}
              hint={t('settings.passMarkHint')}
            />
          </div>

          <div className="settings-section__divider" />

          <div>
            <p className="settings-field__label" style={{ marginBottom: '0.5rem' }}>{t('settings.feeGate')}</p>
            <p className="settings-section__desc" style={{ marginBottom: '0.75rem' }}>
              {t('settings.feeGateDesc')}
            </p>
            <label className="settings-toggle">
              <input
                type="checkbox" className="settings-toggle__input"
                checked={academicForm.feeGateEnabled}
                onChange={(e) => setAcademic('feeGateEnabled', e.target.checked)}
              />
              <span className="settings-toggle__track" />
              <span className="settings-toggle__label">
                {academicForm.feeGateEnabled ? t('settings.feeGateOn') : t('settings.feeGateOff')}
              </span>
            </label>
          </div>
        </div>
      </OffCanvas>

      <OffCanvas
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title={t('settings.paymentSection')}
        subtitle={t('settings.paymentOffCanvasSubtitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPaymentOpen(false)} disabled={paymentMutation.isPending}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handlePaymentSave} disabled={paymentMutation.isPending}>
              {paymentMutation.isPending ? t('action.saving') : t('action.save')}
            </Button>
          </>
        }
      >
        <div className="settings-section__body">
          <p className="settings-section__desc">{t('settings.paymentOffCanvasDesc')}</p>
          <Input
            id="notchpayPublicKey" label={t('settings.notchpayPublicKey')}
            value={paymentForm.notchpayPublicKey} placeholder="pk_test_… ou pk_live_…"
            onChange={(e) => setPayment('notchpayPublicKey', e.target.value)}
            hint={t('settings.notchpayPublicKeyHint')}
          />
          <Input
            id="notchpayHashKey" label={t('settings.notchpayHashKey')} type="password"
            value={paymentForm.notchpayHashKey}
            placeholder={paymentSettings?.notchpayHashKeyConfigured ? '••••••••••••' : ''}
            onChange={(e) => setPayment('notchpayHashKey', e.target.value)}
            hint={t('settings.notchpayHashKeyHint')}
          />
        </div>
      </OffCanvas>

    </AppShell>
  );
}

export default SettingsPage;
