import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary/ErrorBoundary';
import './locales/i18n';
import './styles/main.scss';

// In dev mode, unregister any stale service worker left from a production build.
// A production SW intercepts requests and routes them to the production API,
// breaking local development. Reload once after unregistering so the clean
// session takes effect immediately.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length > 0) {
      Promise.all(regs.map((r) => r.unregister())).then(() => window.location.reload());
    }
  });
}

// Application installée (PWA) : prend la nouvelle version dès qu'elle est déployée
// (rechargement automatique) et vérifie toutes les heures si l'app reste ouverte.
if (import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onRegisteredSW(_url, registration) {
        if (registration) setInterval(() => registration.update(), 60 * 60 * 1000);
      },
    });
  }).catch(() => { /* navigateur sans service worker */ });
}

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  sendDefaultPii: true,
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
