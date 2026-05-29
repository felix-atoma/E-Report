import { useState, useEffect } from 'react';
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
        <svg viewBox="0 0 192 192" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
          <rect width="192" height="192" rx="42" fill="#1E2A78"/>
          <g transform="translate(96 96)">
            <path d="M 0 -60 C 5 -26, 26 -5, 60 0 C 26 5, 5 26, 0 60 C -5 26, -26 5, -60 0 C -26 -5, -5 -26, 0 -60 Z" fill="#FFB547"/>
          </g>
        </svg>
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
