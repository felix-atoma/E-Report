import { useEffect, useState } from 'react';

/**
 * Installation de l'application (PWA), partagée par la fenêtre « Installer NovaBulletin », la page
 * /installer et les boutons « Installer l'application ».
 *  - Android / ordinateur (Chrome, Edge…) : le navigateur fournit l'événement beforeinstallprompt,
 *    gardé ici pour l'utiliser depuis n'importe quel bouton.
 *  - iPhone / iPad (Safari) : pas d'événement — on explique « Partager › Sur l'écran d'accueil ».
 * Ce module est importé au démarrage (index.jsx) pour ne pas rater l'événement.
 */
let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((f) => f());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    try { localStorage.setItem('pwa-installed', '1'); } catch { /* ignore */ }
    notify();
  });
}

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

export const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export const isAndroid = () => typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

/** Lance la fenêtre d'installation du navigateur. Renvoie 'accepted', 'dismissed' ou 'unavailable'. */
export async function promptInstall() {
  if (!deferred) return 'unavailable';
  const e = deferred;
  deferred = null;
  e.prompt();
  const { outcome } = await e.userChoice;
  notify();
  return outcome;
}

export function usePwaInstall() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const f = () => rerender((x) => x + 1);
    listeners.add(f);
    return () => listeners.delete(f);
  }, []);
  return {
    canPrompt: !!deferred,
    installed: isStandalone(),
    ios: isIOS(),
    android: isAndroid(),
    promptInstall,
  };
}
