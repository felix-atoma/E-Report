import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function SubscriptionReturnPage() {
  const { t } = useTranslation();
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
  const state   = isSuccess ? 'success' : isCancelled ? 'cancelled' : 'error';
  const heading = t(`subscriptionReturn.${state}.heading`);
  const body    = t(`subscriptionReturn.${state}.body`);

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
            {t('subscriptionReturn.success.hint')}
          </p>
        )}

        <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>
          {t('subscriptionReturn.redirect', { count: countdown })}
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
          {t('subscriptionReturn.backBtn')}
        </button>
      </div>
    </div>
  );
}
