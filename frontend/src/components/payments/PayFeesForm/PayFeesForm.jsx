import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentsService } from '../../../services/paymentsService';
import Button from '../../common/Button/Button';
import Loading from '../../common/Loading/Loading';
import './PayFeesForm.css';

const METHODS = [
  {
    id: 'notchpay',
    label: 'Mobile Money',
    description: 'TMoney, Flooz, MoMo — paiement instantané',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/>
        <line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
    ),
  },
  {
    id: 'cinetpay',
    label: 'CinetPay',
    description: 'Carte bancaire, Wave, Mobile Money via CinetPay',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
];

function PayFeesForm({ studentId, academicYear, onClose }) {
  const [selected, setSelected] = useState('notchpay');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: status, isLoading } = useQuery({
    queryKey: ['fee-status', studentId, academicYear],
    queryFn: () =>
      paymentsService.getMyChildStatus(studentId, { academicYear }).then((r) => r.data),
    enabled: !!studentId,
  });

  const fmt = (n) => Number(n ?? 0).toLocaleString('fr-FR');

  const handlePay = async () => {
    setError('');
    setLoading(true);
    try {
      const res = selected === 'notchpay'
        ? await paymentsService.initiateMomo({ studentId, academicYear })
        : await paymentsService.initiateCinetPay({ studentId, academicYear });
      window.location.href = res.data.url;
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Une erreur est survenue. Veuillez réessayer.');
      setLoading(false);
    }
  };

  if (isLoading) return <Loading />;

  const remaining = Number(status?.balance ?? 0);
  const totalDue  = Number(status?.totalDue ?? 0);
  const totalPaid = Number(status?.totalPaid ?? 0);
  const alreadyPaid = status?.status === 'PAID' || status?.status === 'EXEMPT';

  return (
    <div className="pay-fees-form">
      <div className="pay-fees-form__summary">
        <h3 className="pay-fees-form__section-title">Récapitulatif des frais</h3>
        <div className="pay-fees-form__balance-row">
          <span className="pay-fees-form__balance-label">Total dû</span>
          <span className="pay-fees-form__balance-value">{fmt(totalDue)} FCFA</span>
        </div>
        <div className="pay-fees-form__balance-row">
          <span className="pay-fees-form__balance-label">Déjà payé</span>
          <span className="pay-fees-form__balance-value pay-fees-form__balance-value--paid">{fmt(totalPaid)} FCFA</span>
        </div>
        <div className="pay-fees-form__balance-row pay-fees-form__balance-row--total">
          <span className="pay-fees-form__balance-label">Reste à payer</span>
          <span className={`pay-fees-form__balance-value ${remaining > 0 ? 'pay-fees-form__balance-value--due' : 'pay-fees-form__balance-value--clear'}`}>
            {fmt(remaining)} FCFA
          </span>
        </div>
        {academicYear && (
          <p className="pay-fees-form__year">Année scolaire {academicYear}</p>
        )}
      </div>

      {alreadyPaid ? (
        <div className="pay-fees-form__paid-notice">
          <div className="pay-fees-form__paid-icon">✅</div>
          <p className="pay-fees-form__paid-text">Les frais de cet élève sont à jour pour l'année {academicYear}.</p>
          <Button variant="secondary" onClick={onClose}>Fermer</Button>
        </div>
      ) : (
        <div className="pay-fees-form__methods">
          <h3 className="pay-fees-form__section-title">Choisir un mode de paiement</h3>
          <div className="pay-fees-form__methods-list">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`pay-fees-form__method-btn ${selected === m.id ? 'pay-fees-form__method-btn--active' : ''}`}
                onClick={() => setSelected(m.id)}
              >
                <span className="pay-fees-form__method-icon">{m.icon}</span>
                <span className="pay-fees-form__method-text">
                  <span className="pay-fees-form__method-label">{m.label}</span>
                  <span className="pay-fees-form__method-desc">{m.description}</span>
                </span>
                <span className="pay-fees-form__method-check">
                  {selected === m.id && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </span>
              </button>
            ))}
          </div>

          {error && <p className="pay-fees-form__error">{error}</p>}

          <div className="pay-fees-form__cta">
            <p className="pay-fees-form__cta-amount">
              Montant à régler : <strong>{fmt(remaining)} FCFA</strong>
            </p>
            <Button onClick={handlePay} disabled={loading || remaining <= 0} className="pay-fees-form__pay-btn">
              {loading ? <span className="login-form__spinner" style={{ width: 16, height: 16 }} /> : 'Payer maintenant'}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PayFeesForm;
