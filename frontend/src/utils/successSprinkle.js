import toast from 'react-hot-toast';

/**
 * Pluie de petites fleurs à chaque message de réussite (toast.success) : elles tombent du haut sur
 * toute la largeur de la page en se balançant, puis disparaissent en bas. Purement décoratif : ne
 * bloque aucun clic, ignoré si l'appareil demande moins d'animations, au plus une fois par seconde.
 */
const PETALS = ['🌸', '🌼', '🌺', '🌷', '💮', '✿', '❀'];
const COUNT = 42;
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

  const width = window.innerWidth;
  const height = window.innerHeight;
  let longest = 0;
  for (let i = 0; i < COUNT; i++) {
    const flower = document.createElement('span');
    flower.textContent = PETALS[Math.floor(Math.random() * PETALS.length)];
    const size = 10 + Math.random() * 10;                 // petites fleurs
    Object.assign(flower.style, {
      position: 'absolute', top: '-24px',
      // Réparties sur toute la largeur (un peu au-delà des bords pour couvrir les côtés)
      left: `${(i / COUNT) * (width + 40) - 20 + (Math.random() - 0.5) * (width / COUNT) * 2}px`,
      fontSize: `${size}px`, lineHeight: '1', color: '#ec4899', willChange: 'transform, opacity',
    });
    layer.appendChild(flower);

    // Chute jusqu'en bas de la page avec un balancement de gauche à droite
    const fall = height + 48;
    const sway = 25 + Math.random() * 45;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const spin = (Math.random() - 0.5) * 720;
    const duration = 2600 + Math.random() * 1800;
    const delay = Math.random() * 900;
    longest = Math.max(longest, duration + delay);
    flower.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 0 },
        { transform: `translate(${dir * sway}px, ${fall * 0.25}px) rotate(${spin * 0.25}deg)`, opacity: 1, offset: 0.12 },
        { transform: `translate(${-dir * sway}px, ${fall * 0.5}px) rotate(${spin * 0.5}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dir * sway}px, ${fall * 0.75}px) rotate(${spin * 0.75}deg)`, opacity: 0.9, offset: 0.75 },
        { transform: `translate(0, ${fall}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration, delay, easing: 'linear', fill: 'both' },
    );
  }
  setTimeout(() => layer.remove(), longest + 300);
}

// Toutes les réussites de l'application passent par toast.success : on y ajoute la pluie de fleurs
const originalSuccess = toast.success;
toast.success = (...args) => {
  sprinkleFlowers();
  return originalSuccess(...args);
};
