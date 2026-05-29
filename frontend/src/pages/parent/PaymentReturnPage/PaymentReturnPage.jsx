import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../../components/layout/AppShell/AppShell';

function PaymentReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  // FedaPay appends ?status=approved|declined|cancelled to the callback_url
  const status = params.get('status') ?? params.get('transaction[status]') ?? 'unknown';
  const isSuccess = status === 'approved';
  const isCancelled = status === 'cancelled';

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
          {isSuccess
            ? 'Paiement confirmé !'
            : isCancelled
            ? 'Paiement annulé'
            : 'Paiement échoué'}
        </h1>

        <p style={{ color: '#6b7280', maxWidth: 400 }}>
          {isSuccess
            ? 'Votre paiement a été reçu. Si un bulletin était retenu, il sera envoyé sous peu.'
            : isCancelled
            ? 'Vous avez annulé le paiement. Vous pouvez réessayer à tout moment.'
            : 'Le paiement n\'a pas abouti. Veuillez réessayer ou contacter l\'administration.'}
        </p>

        <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
          Redirection dans {countdown} seconde{countdown !== 1 ? 's' : ''}…
        </p>

        <button
          onClick={() => navigate('/parent/children')}
          style={{
            padding: '0.6rem 1.5rem', background: '#3b82f6', color: '#fff',
            border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Retour à mes enfants
        </button>
      </div>
    </AppShell>
  );
}

export default PaymentReturnPage;
