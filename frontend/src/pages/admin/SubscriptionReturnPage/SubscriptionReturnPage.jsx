import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function SubscriptionReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(6);

  const status      = params.get('status') ?? 'unknown';
  const isSuccess   = status === 'complete' || status === 'approved';
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f9fafb',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '3rem 2.5rem',
        maxWidth: '480px',
        width: '90%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
      }}>
        <div style={{ fontSize: '4rem', lineHeight: 1 }}>{icon}</div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color, margin: 0 }}>{heading}</h1>

        <p style={{ color: '#6b7280', maxWidth: 380, lineHeight: 1.6, margin: 0 }}>{body}</p>

        {isSuccess && (
          <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>
            Si l'abonnement n'est pas encore actif dans 5 minutes, contactez le support.
          </p>
        )}

        <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>
          Redirection dans {countdown} seconde{countdown !== 1 ? 's' : ''}…
        </p>

        <button
          onClick={() => navigate('/admin/subscription')}
          style={{
            padding: '0.65rem 1.75rem',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          Retour à l'abonnement
        </button>
      </div>
    </div>
  );
}
