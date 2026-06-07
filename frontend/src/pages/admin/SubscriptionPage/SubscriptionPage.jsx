import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { subscriptionService } from '../../../services/subscriptionService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Loading from '../../../components/common/Loading/Loading';
import './SubscriptionPage.css';

const STATUS_ICON  = { TRIAL: '🕐', ACTIVE: '✅', EXPIRED: '🔴', SUSPENDED: '⛔' };
const STATUS_LABEL = { TRIAL: "Période d'essai", ACTIVE: 'Actif', EXPIRED: 'Expiré', SUSPENDED: 'Suspendu' };

const TIER_COLOR = {
  STARTER:    '#6366f1',
  BASIC:      '#0ea5e9',
  PRO:        '#f59e0b',
  ENTERPRISE: '#8b5cf6',
};

const OPERATORS = [
  { value: 'TMONEY', label: 'TMoney (Togocel)' },
  { value: 'FLOOZ',  label: 'Flooz (Moov)' },
  { value: 'MOOV',   label: 'Moov Money' },
];

function StatusCard({ data, billingPeriod }) {
  const locale   = navigator.language || 'fr-FR';
  const expiry   = data.expiry ?? data.trialEndsAt;
  const price    = billingPeriod === 'ANNUAL' ? data.currentPrice?.annual : data.currentPrice?.monthly;
  const statusClass = `sub-status-card sub-status-card--${(data.status ?? 'trial').toLowerCase()}`;

  return (
    <div className={statusClass}>
      <div className="sub-status-left">
        <span className="sub-status-icon">{STATUS_ICON[data.status] ?? '🕐'}</span>
        <div>
          <p className="sub-status-label">Statut de l'abonnement</p>
          <p className="sub-status-value">{STATUS_LABEL[data.status] ?? data.status}</p>
          {expiry && (
            <p className="sub-status-expiry">
              {data.status === 'TRIAL' ? "Essai jusqu'au" : 'Valide jusqu\'au'} :{' '}
              <strong>{new Date(expiry).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
              {data.daysLeft != null && ` (${data.daysLeft} j restants)`}
            </p>
          )}
        </div>
      </div>

      {/* Tier badge + price */}
      <div className="sub-status-right">
        {data.tier && (
          <span className="sub-tier-badge" style={{ background: TIER_COLOR[data.tier] }}>
            {data.tier}
          </span>
        )}
        <p className="sub-status-student-count">{data.studentCount ?? 0} élève(s)</p>
        {price != null && (
          <p className="sub-status-price">
            {price.toLocaleString(locale)} <span>FCFA/{billingPeriod === 'ANNUAL' ? 'an' : 'mois'}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function TierTable({ pricing, currentTier }) {
  const locale = navigator.language || 'fr-FR';
  const tiers  = ['STARTER', 'BASIC', 'PRO', 'ENTERPRISE'];
  return (
    <div className="sub-tier-table-wrap">
      {tiers.map((t) => {
        const p = pricing?.[t];
        const active = t === currentTier;
        return (
          <div key={t} className={`sub-tier-row${active ? ' sub-tier-row--active' : ''}`}>
            <span className="sub-tier-row-badge" style={{ background: TIER_COLOR[t] }}>{t}</span>
            <span className="sub-tier-row-threshold">{p?.label ?? ''}</span>
            <span className="sub-tier-row-price">
              {p ? `${p.monthly.toLocaleString(locale)} / ${p.annual.toLocaleString(locale)} FCFA` : '—'}
            </span>
            {active && <span className="sub-tier-row-current">Votre tier</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function SubscriptionPage() {
  const { t } = useTranslation();
  const qc     = useQueryClient();
  const locale = navigator.language || 'fr-FR';

  const [billingPeriod, setBillingPeriod] = useState('MONTHLY'); // 'MONTHLY' | 'ANNUAL'
  const [payMethod, setPayMethod]         = useState(null);      // 'MOMO' | 'NOTCHPAY'
  const [momoForm, setMomoForm]           = useState({ momoPhone: '', momoReference: '', momoOperator: 'TMONEY' });
  const [momoErrors, setMomoErrors]       = useState({});

  const { data: statusData, isLoading } = useQuery({
    queryKey: ['subscription-status'],
    queryFn:  () => subscriptionService.getStatus().then((r) => r.data),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['subscription-history'],
    queryFn:  () => subscriptionService.getHistory().then((r) => r.data),
  });

  const notchpayMutation = useMutation({
    mutationFn: () => subscriptionService.initiateNotchpay({ plan: billingPeriod }),
    onSuccess:  (res) => { window.location.href = res.data.url; },
    onError:    (err) => toast.error(err?.response?.data?.message ?? 'Erreur de paiement'),
  });

  const momoMutation = useMutation({
    mutationFn: () => subscriptionService.submitMomo({ plan: billingPeriod, ...momoForm }),
    onSuccess: () => {
      toast.success('Paiement soumis ! Vérification en cours dans les 24h.');
      setPayMethod(null);
      setMomoForm({ momoPhone: '', momoReference: '', momoOperator: 'TMONEY' });
      qc.invalidateQueries({ queryKey: ['subscription-history'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  function validateMomo() {
    const errs = {};
    if (!momoForm.momoPhone)     errs.momoPhone    = 'Numéro requis';
    if (!momoForm.momoReference) errs.momoReference = 'Référence requise';
    return errs;
  }

  function handleMomoSubmit() {
    const errs = validateMomo();
    if (Object.keys(errs).length) { setMomoErrors(errs); return; }
    momoMutation.mutate();
  }

  if (isLoading) return <AppShell title="Abonnement"><Loading /></AppShell>;

  const momoInfo    = statusData?.momoInfo    ?? { number: '', operator: 'TMoney' };
  const currentPrice = billingPeriod === 'ANNUAL'
    ? (statusData?.currentPrice?.annual  ?? 0)
    : (statusData?.currentPrice?.monthly ?? 0);

  return (
    <AppShell title="Abonnement">
      <PageHeader
        title="Mon abonnement"
        subtitle="Gérez votre plan NovaBulletin"
      />

      <div className="sub-page">

        {/* Current status + tier */}
        {statusData && <StatusCard data={statusData} billingPeriod={billingPeriod} />}

        {/* Tier breakdown */}
        {statusData?.pricing && (
          <Card>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Tarifs par nombre d'élèves</h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Votre tier est détecté automatiquement selon le nombre d'élèves inscrits dans votre établissement.
            </p>
            <TierTable pricing={statusData.pricing} currentTier={statusData.tier} />
          </Card>
        )}

        {/* Billing period toggle */}
        <Card>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Période de facturation</h3>
          <div className="sub-billing-toggle">
            <button
              className={`sub-billing-btn${billingPeriod === 'MONTHLY' ? ' sub-billing-btn--active' : ''}`}
              onClick={() => setBillingPeriod('MONTHLY')}
            >
              <span className="sub-billing-label">Mensuel</span>
              <span className="sub-billing-price">
                {(statusData?.currentPrice?.monthly ?? 0).toLocaleString(locale)} FCFA/mois
              </span>
            </button>
            <button
              className={`sub-billing-btn${billingPeriod === 'ANNUAL' ? ' sub-billing-btn--active' : ''}`}
              onClick={() => setBillingPeriod('ANNUAL')}
            >
              <span className="sub-billing-badge">2 mois offerts</span>
              <span className="sub-billing-label">Annuel</span>
              <span className="sub-billing-price">
                {(statusData?.currentPrice?.annual ?? 0).toLocaleString(locale)} FCFA/an
              </span>
            </button>
          </div>
        </Card>

        {/* Payment method */}
        <Card>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Mode de paiement</h3>
          <div className="sub-methods">
            {/* Mobile Money */}
            <button
              className={`sub-method-btn${payMethod === 'MOMO' ? ' sub-method-btn--active' : ''}`}
              onClick={() => setPayMethod(payMethod === 'MOMO' ? null : 'MOMO')}
            >
              <span className="sub-method-icon">📱</span>
              <div>
                <div className="sub-method-label">Mobile Money</div>
                <div className="sub-method-desc">TMoney, Flooz, Moov — paiement direct</div>
              </div>
            </button>

            {/* Notchpay */}
            <button
              className={`sub-method-btn${payMethod === 'NOTCHPAY' ? ' sub-method-btn--active' : ''}`}
              onClick={() => setPayMethod(payMethod === 'NOTCHPAY' ? null : 'NOTCHPAY')}
            >
              <span className="sub-method-icon">💳</span>
              <div>
                <div className="sub-method-label">Notchpay</div>
                <div className="sub-method-desc">Paiement sécurisé en ligne (TMoney, Flooz, carte)</div>
              </div>
            </button>

            {/* Mastercard — coming soon */}
            <button className="sub-method-btn sub-method-btn--disabled" disabled>
              <span className="sub-method-icon">💳</span>
              <div>
                <div className="sub-method-label">
                  Mastercard / Visa
                  <span className="sub-method-soon">Bientôt</span>
                </div>
                <div className="sub-method-desc">Paiement par carte bancaire internationale</div>
              </div>
            </button>
          </div>

          {/* MoMo flow */}
          {payMethod === 'MOMO' && (
            <div style={{ marginTop: '1.25rem' }}>
              <div className="sub-momo-box">
                <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '0.85rem' }}>
                  Envoyez {currentPrice.toLocaleString(locale)} FCFA au :
                </p>
                <p className="sub-momo-number">{momoInfo.number || '+228 XX XX XX XX'}</p>
                <p className="sub-momo-operator">Opérateur : {momoInfo.operator}</p>
                <ul className="sub-momo-steps">
                  <li>Envoyez le montant exact au numéro ci-dessus</li>
                  <li>Notez la référence de transaction affichée sur votre téléphone</li>
                  <li>Remplissez le formulaire ci-dessous pour confirmer votre paiement</li>
                </ul>
              </div>

              <div className="sub-form" style={{ marginTop: '1rem' }}>
                <Input
                  id="momo-phone"
                  label="Votre numéro MoMo (utilisé pour le paiement)"
                  placeholder="+228 XX XX XX XX"
                  value={momoForm.momoPhone}
                  error={momoErrors.momoPhone}
                  onChange={(e) => setMomoForm((f) => ({ ...f, momoPhone: e.target.value }))}
                />
                <Select
                  id="momo-operator"
                  label="Opérateur"
                  value={momoForm.momoOperator}
                  options={OPERATORS}
                  onChange={(e) => setMomoForm((f) => ({ ...f, momoOperator: e.target.value }))}
                />
                <Input
                  id="momo-ref"
                  label="Référence de transaction (affiché sur votre téléphone)"
                  placeholder="ex: TG2024XXXX"
                  value={momoForm.momoReference}
                  error={momoErrors.momoReference}
                  onChange={(e) => setMomoForm((f) => ({ ...f, momoReference: e.target.value }))}
                />
                <Button
                  onClick={handleMomoSubmit}
                  disabled={momoMutation.isPending}
                  style={{ alignSelf: 'flex-start' }}
                >
                  {momoMutation.isPending ? 'Envoi…' : 'Confirmer mon paiement'}
                </Button>
              </div>
            </div>
          )}

          {/* Notchpay flow */}
          {payMethod === 'NOTCHPAY' && (
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Vous serez redirigé vers la plateforme sécurisée Notchpay pour payer via TMoney, Flooz ou carte bancaire.
                Votre abonnement sera activé automatiquement après le paiement.
              </p>
              <Button
                onClick={() => notchpayMutation.mutate()}
                disabled={notchpayMutation.isPending}
                style={{ alignSelf: 'flex-start' }}
              >
                {notchpayMutation.isPending
                  ? 'Redirection…'
                  : `Payer ${currentPrice.toLocaleString(locale)} FCFA via Notchpay`}
              </Button>
            </div>
          )}
        </Card>

        {/* Payment history */}
        {history.length > 0 && (
          <Card>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Historique des paiements</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="sub-history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Tier</th>
                    <th>Facturation</th>
                    <th>Montant</th>
                    <th>Méthode</th>
                    <th>Référence</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.createdAt).toLocaleDateString(locale)}</td>
                      <td>
                        {p.tier ? (
                          <span className="sub-tier-pill" style={{ background: TIER_COLOR[p.tier] ?? '#6b7280' }}>
                            {p.tier}
                          </span>
                        ) : '—'}
                      </td>
                      <td>{p.plan === 'ANNUAL' ? 'Annuel' : 'Mensuel'}</td>
                      <td>{Number(p.amount).toLocaleString(locale)} FCFA</td>
                      <td>{p.method === 'MOMO_MANUAL' ? 'Mobile Money' : 'Notchpay'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {p.momoReference ?? p.notchpayRef ?? '—'}
                      </td>
                      <td>
                        <span className={`sub-status-pill sub-status-pill--${p.status}`}>
                          {p.status === 'PENDING_REVIEW' ? 'En vérification'
                            : p.status === 'APPROVED'    ? 'Approuvé'
                            : p.status === 'REJECTED'    ? 'Rejeté'
                            : 'Échoué'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
