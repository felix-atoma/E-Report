import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoIcon from '../../../assets/images/novabulletin-tablet.svg';
import { usePwaInstall } from '../../../utils/pwaInstall';
import './PwaInstallPrompt.css';

const DISMISS_KEY = 'pwa-prompt-dismissed';
const recentlyDismissed = () => {
  try {
    const d = localStorage.getItem(DISMISS_KEY);
    return !!d && Date.now() - Number(d) < 7 * 86400000;
  } catch { return false; }
};

/**
 * Bandeau « Installer NovaBulletin » :
 *  - Android / ordinateur : bouton « Installer » (fenêtre du navigateur) ;
 *  - iPhone / iPad : Safari n'a pas de bouton, on montre « Partager › Sur l'écran d'accueil ».
 * Masqué dans l'application déjà installée, sur la page /installer et pendant 7 jours après ✕.
 */
export default function PwaInstallPrompt() {
  const { canPrompt, installed, ios, promptInstall } = usePwaInstall();
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState(recentlyDismissed);

  if (installed || hidden || pathname === '/installer') return null;
  if (!canPrompt && !ios) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setHidden(true);
  };
  const install = async () => {
    if ((await promptInstall()) === 'accepted') setHidden(true);
  };

  return (
    <div className="pwa-prompt">
      <div className="pwa-prompt__icon">
        <img src={logoIcon} alt="" width="36" height="36" />
      </div>
      <div className="pwa-prompt__text">
        <strong>Installer NovaBulletin</strong>
        {ios ? (
          <span>
            Touchez <b>Partager</b> <ShareIcon /> puis <b>« Sur l'écran d'accueil »</b>.{' '}
            <Link to="/installer" onClick={() => setHidden(true)}>Aide</Link>
          </span>
        ) : (
          <span>Une icône sur votre écran d'accueil, comme une application</span>
        )}
      </div>
      {!ios && <button className="pwa-prompt__install" onClick={install}>Installer</button>}
      <button className="pwa-prompt__dismiss" onClick={dismiss} aria-label="Fermer">✕</button>
    </div>
  );
}

/** Icône « Partager » d'iOS (carré avec flèche vers le haut). */
export function ShareIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-2px' }} aria-label="Partager">
      <path d="M12 3v12" /><path d="M7 8l5-5 5 5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}
