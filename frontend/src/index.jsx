import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary/ErrorBoundary';
import './locales/i18n';
// Capte dès le démarrage l'événement « installer l'application » (il ne se produit qu'une fois)
import './utils/pwaInstall';
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
// (rechargement automatique) et vérifie toutes les heures, et au retour sur l'onglet, si l'app reste ouverte.
if (import.meta.env.PROD) {
  // Nouvelle version installée pendant que l'onglet est ouvert : la charger au prochain clic sur un lien
  // de l'appli ou au retour sur l'onglet (jamais au milieu d'une saisie de notes).
  let updateReady = false;
  let hadController = !!navigator.serviceWorker?.controller;
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (hadController) updateReady = true;
    hadController = true;
  });
  document.addEventListener('click', (e) => {
    if (!updateReady || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = e.target.closest?.('a[href]');
    if (!a || a.target === '_blank' || a.origin !== window.location.origin) return;
    e.preventDefault();
    window.location.assign(a.href);
  }, true);

  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onRegisteredSW(_url, registration) {
        // Vérification horaire d'une nouvelle version ; sans réseau elle échoue : on réessaiera l'heure suivante
        if (!registration) return;
        setInterval(() => { registration.update().catch(() => {}); }, 60 * 60 * 1000);
        // Onglet laissé ouvert : vérifier aussi quand l'utilisateur y revient
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState !== 'visible') return;
          if (updateReady) window.location.reload();
          else registration.update().catch(() => {});
        });
      },
    });
  }).catch(() => { /* navigateur sans service worker */ });
}

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  // Coupures réseau côté utilisateur (mise à jour de l'application impossible hors ligne) : pas des bugs
  ignoreErrors: [/Failed to update a ServiceWorker/i, /Failed to register a ServiceWorker/i],
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
