import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../../components/layout/AppShell/AppShell';

export default function SubscriptionReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(6);

  // Notchpay appends ?status=complete|failed|cancelled to the callback URL
  const status     = params.get('status') ?? 'unknown';
  const isSuccess  = status === 'complete' || status === 'approved';
  const isCancelled = status === 'cancelled';

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); navigate('/admin/subscription'); }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  const icon    = isSuccess ? '✅' : isCancelled ? '↩️' : '❌';
  const color   = isSuccess ? '#16a34a' : isCancelled ? '#6b7280' : '#dc2626';
  const heading = isSuccess
    ? 'Paiement reçu !'
    : isCancelled
    ? 'Paiement annulé'
    : 'Paiement non abouti';
  const body = isSuccess
    ? "Votre paiement a bien été reçu. L'abonnement sera activé automatiquement dans quelques instants. Vous recevrez une confirmation par email."
    : isCancelled
    ? "Vous avez annulé le paiement. Vous pouvez réessayer à tout moment depuis la page Abonnement."
    : "Le paiement n'a pas abouti. Veuillez réessayer ou utiliser le paiement Mobile Money si le problème persiste.";

  return (
    <AppShell title="Résultat du paiement">
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: '1.5rem',
      }}>
        <div style={{ fontSize: '4rem' }}>{icon}</div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{heading}</h1>

        <p style={{ color: '#6b7280', maxWidth: 420, lineHeight: 1.6 }}>{body}</p>

        {isSuccess && (
          <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>
            Si l'abonnement n'est pas encore actif dans 5 minutes, contactez le support.
          </p>
        )}

        <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
          Redirection dans {countdown} seconde{countdown !== 1 ? 's' : ''}…
        </p>

        <button
          onClick={() => navigate('/admin/subscription')}
          style={{
            padding: '0.6rem 1.5rem', background: '#3b82f6', color: '#fff',
            border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Retour à l'abonnement
        </button>
      </div>
    </AppShell>
  );
}
