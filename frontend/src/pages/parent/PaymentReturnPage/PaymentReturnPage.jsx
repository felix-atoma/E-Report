import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../../components/layout/AppShell/AppShell';
import Button from '../../../components/common/Button/Button';

function PaymentReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(8);

  // Notchpay callback: ?reference=xxx&status=complete|failed|cancelled
  // FedaPay (legacy):  ?status=approved|declined|cancelled
  const reference = params.get('reference') ?? params.get('trxref');
  const rawStatus  = params.get('status') ?? params.get('transaction[status]') ?? 'unknown';

  const isSuccess  = rawStatus === 'complete' || rawStatus === 'approved';
  const isCancelled = rawStatus === 'cancelled';

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); navigate('/parent/children'); }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <AppShell title="Résultat du paiement">
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: '1.5rem',
      }}>
        <div style={{ fontSize: '4rem' }}>
          {isSuccess ? '✅' : isCancelled ? '↩️' : '❌'}
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: isSuccess ? '#16a34a' : isCancelled ? '#6b7280' : '#dc2626' }}>
          {isSuccess ? 'Paiement confirmé !' : isCancelled ? 'Paiement annulé' : 'Paiement échoué'}
        </h1>

        <p style={{ color: '#6b7280', maxWidth: 420 }}>
          {isSuccess
            ? 'Votre paiement a bien été reçu. Si un bulletin était retenu, il sera libéré sous peu.'
            : isCancelled
            ? 'Vous avez annulé le paiement. Vous pouvez réessayer à tout moment.'
            : 'Le paiement n\'a pas abouti. Veuillez réessayer ou contacter l\'administration.'}
        </p>

        {reference && (
          <p style={{ fontSize: '0.78rem', color: '#9ca3af', fontFamily: 'monospace' }}>
            Référence : {reference}
          </p>
        )}

        <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
          Redirection dans {countdown} seconde{countdown !== 1 ? 's' : ''}…
        </p>

        <Button onClick={() => navigate('/parent/children')}>
          Retour à mes enfants
        </Button>
      </div>
    </AppShell>
  );
}

export default PaymentReturnPage;
