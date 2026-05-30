import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary/ErrorBoundary';
import './locales/i18n';
import './styles/main.scss';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "https://e23f50286f8b8847ccdb82a0c495fe7c@o4511477173518336.ingest.de.sentry.io/4511477289975888",
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
