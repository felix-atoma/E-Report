import { useState, useEffect } from 'react';
import logoIcon from '../../../assets/images/novabulletin-tablet.svg';
import './PwaInstallPrompt.css';

export default function PwaInstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      // Only show if not already installed and not dismissed recently
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed || Date.now() - Number(dismissed) > 7 * 86400000) {
        setVisible(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
    setPrompt(null);
  };

  const dismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="pwa-prompt">
      <div className="pwa-prompt__icon">
        <img src={logoIcon} alt="" width="36" height="36" />
      </div>
      <div className="pwa-prompt__text">
        <strong>Installer NovaBulletin</strong>
        <span>Accès rapide depuis votre écran d'accueil</span>
      </div>
      <button className="pwa-prompt__install" onClick={install}>Installer</button>
      <button className="pwa-prompt__dismiss" onClick={dismiss} aria-label="Fermer">✕</button>
    </div>
  );
}
