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

// ── Static tier definitions (always shown, API data highlights current) ────────
const TIERS = [
  {
    key:       'STARTER',
    label:     'Starter',
    range:     'Moins de 50 élèves',
    rangeEN:   '< 50 students',
    color:     '#6366f1',
    monthly:   5000,
    annual:    50000,
  },
  {
    key:       'BASIC',
    label:     'Basic',
    range:     'De 50 à 99 élèves',
    rangeEN:   '50 – 99 students',
    color:     '#0ea5e9',
    monthly:   10000,
    annual:    100000,
  },
  {
    key:       'PRO',
    label:     'Pro',
    range:     'De 100 à 199 élèves',
    rangeEN:   '100 – 199 students',
    color:     '#f59e0b',
    monthly:   20000,
    annual:    200000,
  },
  {
    key:       'ENTERPRISE',
    label:     'Enterprise',
    range:     '200 élèves et plus',
    rangeEN:   '200+ students',
    color:     '#8b5cf6',
    monthly:   35000,
    annual:    350000,
  },
];

const OPERATORS = [
  { value: 'TMONEY', label: 'TMoney (Togocel)' },
  { value: 'FLOOZ',  label: 'Flooz (Moov)' },
  { value: 'MOOV',   label: 'Moov Money' },
];

export default function SubscriptionPage() {
  const qc     = useQueryClient();
  const { t }  = useTranslation();
  const locale = 'fr-FR';

  const STATUS_META = {
    FREE:      { icon: '🎁', label: 'Gratuit',                          cls: 'free' },
    TRIAL:     { icon: '🕐', label: t('subscription.status.TRIAL'),     cls: 'trial' },
    ACTIVE:    { icon: '✅', label: t('subscription.status.ACTIVE'),    cls: 'active' },
    EXPIRED:   { icon: '🔴', label: t('subscription.status.EXPIRED'),   cls: 'expired' },
    SUSPENDED: { icon: '⛔', label: t('subscription.status.SUSPENDED'), cls: 'suspended' },
  };

  const [billing, setBilling]       = useState('MONTHLY'); // 'MONTHLY' | 'ANNUAL'
  const [payMethod, setPayMethod]   = useState(null);      // 'MOMO' | 'NOTCHPAY' | 'CARD'
  const [momoForm, setMomoForm]     = useState({ momoPhone: '', momoReference: '', momoOperator: 'TMONEY' });
  const [momoErrors, setMomoErrors] = useState({});

  const { data: statusData, isLoading, isError } = useQuery({
    queryKey: ['subscription-status'],
    queryFn:  () => subscriptionService.getStatus().then((r) => r.data),
    retry: 2,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['subscription-history'],
    queryFn:  () => subscriptionService.getHistory().then((r) => r.data),
  });

  const notchpayMutation = useMutation({
    mutationFn: () => subscriptionService.initiateNotchpay({ plan: billing }),
    onSuccess:  (res) => { window.location.href = res.data.url; },
    onError:    (err) => toast.error(err?.response?.data?.message ?? 'Erreur de paiement'),
  });

  const momoMutation = useMutation({
    mutationFn: () => subscriptionService.submitMomo({ plan: billing, ...momoForm }),
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

  // Determine current tier — from API if available, otherwise null
  const currentTier     = statusData?.tier ?? null;
  const studentCount    = statusData?.studentCount ?? null;
  const status          = statusData?.status ?? null;
  const isFree          = status === 'FREE';
  const statusMeta      = STATUS_META[status] ?? null;
  const momoInfo        = statusData?.momoInfo ?? { number: '', operator: 'TMoney' };

  // Use API pricing if available, otherwise fall back to static TIERS
  const activeTierDef   = TIERS.find((t) => t.key === currentTier);
  const currentPrice    = isFree ? 0
    : billing === 'ANNUAL'
      ? (statusData?.currentPrice?.annual  ?? activeTierDef?.annual  ?? 0)
      : (statusData?.currentPrice?.monthly ?? activeTierDef?.monthly ?? 0);

  return (
    <AppShell title="Abonnement">
      <PageHeader
        title="Mon abonnement NovaBulletin"
        subtitle="Tarification automatique selon le nombre d'élèves inscrits"
      />

      <div className="sub-page">

        {/* ── Status banner ──────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="sub-status-card sub-status-card--trial" style={{ justifyContent: 'center' }}>
            <Loading />
          </div>
        )}

        {isError && (
          <div className="sub-status-card sub-status-card--expired">
            <div className="sub-status-left">
              <span className="sub-status-icon">⚠️</span>
              <div>
                <p className="sub-status-label">Impossible de charger le statut</p>
                <p className="sub-status-value">Erreur de connexion</p>
                <p className="sub-status-expiry">Vérifiez votre connexion et rafraîchissez la page.</p>
              </div>
            </div>
          </div>
        )}

        {statusMeta && (
          <div className={`sub-status-card sub-status-card--${statusMeta.cls}`}>
            <div className="sub-status-left">
              <span className="sub-status-icon">{statusMeta.icon}</span>
              <div>
                <p className="sub-status-label">Statut de l'abonnement</p>
                <p className="sub-status-value">{statusMeta.label}</p>
                {isFree ? (
                  <p className="sub-status-expiry">
                    Votre établissement a moins de 50 élèves — accès <strong>gratuit et illimité</strong>.
                    Un abonnement sera requis dès que vous dépasserez 50 élèves inscrits.
                  </p>
                ) : (statusData.expiry || statusData.trialEndsAt) ? (
                  <p className="sub-status-expiry">
                    {status === 'TRIAL' ? "Essai jusqu'au" : 'Valide jusqu\'au'} :{' '}
                    <strong>
                      {new Date(statusData.expiry ?? statusData.trialEndsAt).toLocaleDateString(locale, {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </strong>
                    {statusData.daysLeft != null && ` (${statusData.daysLeft} j restants)`}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="sub-status-right">
              {currentTier && activeTierDef && (
                <>
                  <span className="sub-tier-badge" style={{ background: activeTierDef.color }}>
                    {activeTierDef.label}
                  </span>
                  <p className="sub-status-student-count">
                    {studentCount} élève{studentCount !== 1 ? 's' : ''} détecté{studentCount !== 1 ? 's' : ''}
                  </p>
                </>
              )}
              {isFree ? (
                <p className="sub-status-price" style={{ color: '#16a34a' }}>
                  Gratuit <span>— &lt; 50 élèves</span>
                </p>
              ) : currentPrice > 0 ? (
                <p className="sub-status-price">
                  {currentPrice.toLocaleString(locale)}{' '}
                  <span>FCFA/{billing === 'ANNUAL' ? 'an' : 'mois'}</span>
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* ── Tier cards ─────────────────────────────────────────────────────── */}
        <Card>
          <h3 className="sub-section-title">Tarification par nombre d'élèves</h3>
          <p className="sub-section-sub">
            Votre tier est détecté <strong>automatiquement</strong> à chaque paiement selon le nombre d'élèves inscrits dans votre établissement.
          </p>

          <div className="sub-tier-grid">
            {TIERS.map((tier) => {
              const isCurrent = tier.key === currentTier;
              const isStarter = tier.key === 'STARTER';
              const price     = billing === 'ANNUAL' ? tier.annual : tier.monthly;
              return (
                <div
                  key={tier.key}
                  className={`sub-tier-card${isCurrent ? ' sub-tier-card--current' : ''}${isStarter ? ' sub-tier-card--free' : ''}`}
                  style={{ '--tier-color': tier.color }}
                >
                  {isCurrent && (
                    <div className="sub-tier-card__current-label">Votre tier actuel</div>
                  )}
                  {isStarter && !isCurrent && (
                    <div className="sub-tier-card__free-label">Gratuit</div>
                  )}
                  <div className="sub-tier-card__top">
                    <span className="sub-tier-card__name">{tier.label}</span>
                    <span className="sub-tier-card__range">{t(`subscription.tierRange.${tier.key}`)}</span>
                  </div>
                  {isStarter ? (
                    <div className="sub-tier-card__price">
                      <span className="sub-tier-card__amount sub-tier-card__amount--free">Gratuit</span>
                    </div>
                  ) : (
                    <>
                      <div className="sub-tier-card__price">
                        <span className="sub-tier-card__amount">{price.toLocaleString(locale)}</span>
                        <span className="sub-tier-card__currency">FCFA/{billing === 'ANNUAL' ? 'an' : 'mois'}</span>
                      </div>
                      {billing === 'ANNUAL' && (
                        <p className="sub-tier-card__saving">
                          soit {Math.round(tier.annual / 12).toLocaleString(locale)} FCFA/mois · 2 mois offerts
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── Billing period toggle (hidden for free schools) ───────────────── */}
        {!isFree && <Card>
          <h3 className="sub-section-title">Période de facturation</h3>
          <div className="sub-billing-toggle">
            <button
              className={`sub-billing-btn${billing === 'MONTHLY' ? ' sub-billing-btn--active' : ''}`}
              onClick={() => setBilling('MONTHLY')}
            >
              <span className="sub-billing-label">Mensuel</span>
              <span className="sub-billing-desc">Renouvelé chaque mois</span>
            </button>
            <button
              className={`sub-billing-btn${billing === 'ANNUAL' ? ' sub-billing-btn--active' : ''}`}
              onClick={() => setBilling('ANNUAL')}
            >
              <span className="sub-billing-badge">2 mois offerts</span>
              <span className="sub-billing-label">Annuel</span>
              <span className="sub-billing-desc">Renouvelé chaque année</span>
            </button>
          </div>
        </Card>}

        {/* ── Payment methods (hidden for free schools) ─────────────────────── */}
        {!isFree && <Card>
          <h3 className="sub-section-title">Mode de paiement</h3>
          {currentTier ? (
            <p className="sub-section-sub">
              Vous serez facturé{' '}
              <strong>{currentPrice.toLocaleString(locale)} FCFA</strong>
              {billing === 'ANNUAL' ? ' / an' : ' / mois'} (tier{' '}
              <strong>{activeTierDef?.label}</strong> — {activeTierDef ? t(`subscription.tierRange.${activeTierDef.key}`) : ''}).
            </p>
          ) : (
            <p className="sub-section-sub">
              Le montant exact sera calculé automatiquement selon votre nombre d'élèves au moment du paiement.
            </p>
          )}

          <div className="sub-methods">
            {/* Mobile Money */}
            <button
              className={`sub-method-btn${payMethod === 'MOMO' ? ' sub-method-btn--active' : ''}`}
              onClick={() => setPayMethod(payMethod === 'MOMO' ? null : 'MOMO')}
            >
              <span className="sub-method-icon">📱</span>
              <div>
                <div className="sub-method-label">Mobile Money</div>
                <div className="sub-method-desc">TMoney · Flooz · Moov</div>
              </div>
            </button>

            {/* Notchpay */}
            <button
              className={`sub-method-btn${payMethod === 'NOTCHPAY' ? ' sub-method-btn--active' : ''}`}
              onClick={() => setPayMethod(payMethod === 'NOTCHPAY' ? null : 'NOTCHPAY')}
            >
              <span className="sub-method-icon">🌐</span>
              <div>
                <div className="sub-method-label">Notchpay</div>
                <div className="sub-method-desc">Paiement sécurisé en ligne</div>
              </div>
            </button>

            {/* Mastercard / Visa via Notchpay */}
            <button
              className={`sub-method-btn${payMethod === 'CARD' ? ' sub-method-btn--active' : ''}`}
              onClick={() => setPayMethod(payMethod === 'CARD' ? null : 'CARD')}
            >
              <span className="sub-method-icon">💳</span>
              <div>
                <div className="sub-method-label">Mastercard / Visa</div>
                <div className="sub-method-desc">Carte bancaire internationale</div>
              </div>
            </button>
          </div>

          {/* MoMo flow */}
          {payMethod === 'MOMO' && (
            <div className="sub-payment-panel">
              <div className="sub-momo-box">
                <p className="sub-momo-title">
                  Envoyez <strong>{currentPrice > 0 ? `${currentPrice.toLocaleString(locale)} FCFA` : 'le montant correspondant à votre tier'}</strong> au numéro suivant :
                </p>
                <p className="sub-momo-number">{momoInfo.number || '+228 XX XX XX XX'}</p>
                <p className="sub-momo-operator">Opérateur : <strong>{momoInfo.operator}</strong></p>
                <ol className="sub-momo-steps">
                  <li>Envoyez le montant exact au numéro ci-dessus via votre opérateur</li>
                  <li>Notez la <strong>référence de transaction</strong> qui apparaît sur votre téléphone</li>
                  <li>Remplissez le formulaire ci-dessous — nous vérifierons et activerons sous 24h</li>
                </ol>
              </div>

              <div className="sub-form">
                <Input
                  id="momo-phone"
                  label="Votre numéro Mobile Money (utilisé pour le paiement)"
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
                  label="Référence de transaction (affichée sur votre téléphone après paiement)"
                  placeholder="ex : TG2024XXXXXXXXXXXX"
                  value={momoForm.momoReference}
                  error={momoErrors.momoReference}
                  onChange={(e) => setMomoForm((f) => ({ ...f, momoReference: e.target.value }))}
                />
                <Button
                  onClick={handleMomoSubmit}
                  disabled={momoMutation.isPending}
                  style={{ alignSelf: 'flex-start' }}
                >
                  {momoMutation.isPending ? 'Envoi en cours…' : 'Confirmer mon paiement MoMo'}
                </Button>
              </div>
            </div>
          )}

          {/* Notchpay flow */}
          {payMethod === 'NOTCHPAY' && (
            <div className="sub-payment-panel">
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Vous serez redirigé vers Notchpay pour payer via TMoney, Flooz ou carte bancaire.
                L'abonnement sera activé <strong>automatiquement</strong> après confirmation du paiement.
              </p>
              <Button
                onClick={() => notchpayMutation.mutate()}
                disabled={notchpayMutation.isPending}
                style={{ alignSelf: 'flex-start', marginTop: '1rem' }}
              >
                {notchpayMutation.isPending
                  ? 'Redirection…'
                  : currentPrice > 0
                    ? `Payer ${currentPrice.toLocaleString(locale)} FCFA via Notchpay`
                    : 'Payer via Notchpay'}
              </Button>
            </div>
          )}

          {/* Card flow (Visa / Mastercard via Notchpay) */}
          {payMethod === 'CARD' && (
            <div className="sub-payment-panel">
              <div className="sub-card-logos">
                <span className="sub-card-logo sub-card-logo--visa">VISA</span>
                <span className="sub-card-logo sub-card-logo--mc">MC</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Vous serez redirigé vers la page de paiement sécurisée Notchpay où vous pourrez
                saisir les informations de votre carte Visa ou Mastercard.
                L'abonnement sera activé <strong>automatiquement</strong> dès que le paiement sera confirmé.
              </p>
              <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
                <li>Paiement crypté SSL — vos données bancaires ne transitent pas par nos serveurs</li>
                <li>Reçu envoyé automatiquement par email</li>
              </ul>
              <Button
                onClick={() => notchpayMutation.mutate()}
                disabled={notchpayMutation.isPending}
                style={{ alignSelf: 'flex-start', marginTop: '1rem' }}
              >
                {notchpayMutation.isPending
                  ? 'Redirection…'
                  : currentPrice > 0
                    ? `Payer ${currentPrice.toLocaleString(locale)} FCFA par carte`
                    : 'Payer par carte bancaire'}
              </Button>
            </div>
          )}
        </Card>}

        {/* ── Payment history ────────────────────────────────────────────────── */}
        {history.length > 0 && (
          <Card>
            <h3 className="sub-section-title">Historique des paiements</h3>
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
                  {history.map((p) => {
                    const tierDef = TIERS.find((t) => t.key === p.tier);
                    return (
                      <tr key={p.id}>
                        <td>{new Date(p.createdAt).toLocaleDateString(locale)}</td>
                        <td>
                          {tierDef ? (
                            <span className="sub-tier-pill" style={{ background: tierDef.color }}>
                              {tierDef.label}
                            </span>
                          ) : '—'}
                        </td>
                        <td>{p.plan === 'ANNUAL' ? 'Annuel' : 'Mensuel'}</td>
                        <td>{Number(p.amount).toLocaleString(locale)} FCFA</td>
                        <td>{p.method === 'MOMO_MANUAL' ? 'Mobile Money' : 'Notchpay (en ligne)'}</td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
