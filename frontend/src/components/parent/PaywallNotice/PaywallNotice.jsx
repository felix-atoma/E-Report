import Button from '../../common/Button/Button';
import './PaywallNotice.css';

function PaywallNotice({ studentName, termName, balance, currency = 'FCFA', onContact }) {
  return (
    <div className="paywall-notice">
      <div className="paywall-notice__header">
        <span className="paywall-notice__icon" aria-hidden="true">📋</span>
        <h2 className="paywall-notice__title">Bulletin disponible</h2>
      </div>
      <p className="paywall-notice__message">
        Le bulletin de <strong>{studentName}</strong> pour le <strong>{termName}</strong> est
        disponible. Veuillez régler les frais de scolarité pour y accéder.
      </p>
      <div className="paywall-notice__balance">
        <span className="paywall-notice__balance-label">Solde restant</span>
        <span className="paywall-notice__balance-amount">
          {balance.toLocaleString('fr-FR')} {currency}
        </span>
      </div>
      <div className="paywall-notice__actions">
        <Button variant="primary" onClick={onContact}>
          Contacter la comptabilité
        </Button>
      </div>
    </div>
  );
}

export default PaywallNotice;
