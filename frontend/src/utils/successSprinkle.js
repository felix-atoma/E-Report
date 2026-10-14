import toast from 'react-hot-toast';

/**
 * Pluie de fleurs à chaque message de réussite (toast.success) : quelques pétales tombent depuis le
 * coin des notifications puis disparaissent. Purement décoratif : ne bloque aucun clic, ignoré si
 * l'appareil demande moins d'animations, au plus une fois par seconde.
 */
const PETALS = ['🌸', '🌼', '🌺', '🌷', '💮', '✿'];
const COUNT = 16;
const DURATION = 1600;
let lastRun = 0;

function reducedMotion() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function sprinkleFlowers() {
  if (typeof document === 'undefined' || reducedMotion()) return;
  const now = Date.now();
  if (now - lastRun < 1000) return;
  lastRun = now;

  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.className = 'success-sprinkle no-print';
  Object.assign(layer.style, {
    position: 'fixed', inset: '0', pointerEvents: 'none', overflow: 'hidden', zIndex: '10000',
  });
  document.body.appendChild(layer);

  // Départ : près des notifications (en haut à droite), un peu dispersé
  const originX = window.innerWidth - Math.min(180, window.innerWidth / 3);
  for (let i = 0; i < COUNT; i++) {
    const petal = document.createElement('span');
    petal.textContent = PETALS[i % PETALS.length];
    const size = 14 + Math.random() * 12;
    Object.assign(petal.style, {
      position: 'absolute', left: `${originX + (Math.random() - 0.5) * 160}px`, top: '40px',
      fontSize: `${size}px`, lineHeight: '1', willChange: 'transform, opacity', color: '#ec4899',
    });
    layer.appendChild(petal);
    const dx = (Math.random() - 0.5) * 260;
    const dy = 180 + Math.random() * 260;
    const spin = (Math.random() - 0.5) * 540;
    petal.animate(
      [
        { transform: 'translate(0, -10px) rotate(0deg) scale(0.6)', opacity: 0 },
        { transform: `translate(${dx * 0.3}px, ${dy * 0.2}px) rotate(${spin * 0.3}deg) scale(1)`, opacity: 1, offset: 0.15 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(0.9)`, opacity: 0 },
      ],
      { duration: DURATION * (0.75 + Math.random() * 0.5), easing: 'cubic-bezier(.2,.6,.4,1)', delay: Math.random() * 180, fill: 'forwards' },
    );
  }
  setTimeout(() => layer.remove(), DURATION * 1.4 + 200);
}

// Toutes les réussites de l'application passent par toast.success : on y ajoute la pluie de fleurs
const originalSuccess = toast.success;
toast.success = (...args) => {
  sprinkleFlowers();
  return originalSuccess(...args);
};
