import toast from 'react-hot-toast';

/**
 * Pluie de confettis brillants à chaque message de réussite (toast.success) : petits morceaux colorés
 * qui tombent du haut sur toute la largeur de la page en tournoyant (reflets qui scintillent), avec
 * quelques étoiles qui pétillent. Purement décoratif : ne bloque aucun clic, ignoré si l'appareil
 * demande moins d'animations, au plus une fois par seconde.
 */
// Dégradés « métallisés » : la couleur claire au milieu donne le reflet quand le confetti tourne
const SHINY = [
  'linear-gradient(135deg,#b8860b,#ffe680 50%,#d4a017)',   // or
  'linear-gradient(135deg,#c0c0c0,#ffffff 50%,#a8a8a8)',   // argent
  'linear-gradient(135deg,#db2777,#f9a8d4 50%,#be185d)',   // rose
  'linear-gradient(135deg,#2563eb,#93c5fd 50%,#1d4ed8)',   // bleu
  'linear-gradient(135deg,#16a34a,#86efac 50%,#15803d)',   // vert
  'linear-gradient(135deg,#7c3aed,#c4b5fd 50%,#6d28d9)',   // violet
  'linear-gradient(135deg,#ea580c,#fdba74 50%,#c2410c)',   // orange
];
const PIECES = 70;
const SPARKS = 14;
let lastRun = 0;

function reducedMotion() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

const rand = (min, max) => min + Math.random() * (max - min);

export function sprinkleFlowers() {
  if (typeof document === 'undefined' || reducedMotion()) return;
  const now = Date.now();
  if (now - lastRun < 1000) return;
  lastRun = now;

  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.className = 'success-sprinkle no-print';
  Object.assign(layer.style, {
    position: 'fixed', inset: '0', pointerEvents: 'none', overflow: 'hidden', zIndex: '10000', perspective: '600px',
  });
  document.body.appendChild(layer);

  const width = window.innerWidth;
  const height = window.innerHeight;
  let longest = 0;

  // Confettis : rubans et pastilles qui se retournent en tombant (le reflet passe d'un côté à l'autre)
  for (let i = 0; i < PIECES; i++) {
    const piece = document.createElement('span');
    const ribbon = Math.random() < 0.65;
    const w = ribbon ? rand(5, 9) : rand(5, 8);
    const h = ribbon ? rand(10, 16) : w;
    Object.assign(piece.style, {
      position: 'absolute', top: '-20px',
      left: `${(i / PIECES) * (width + 40) - 20 + rand(-1, 1) * (width / PIECES) * 1.5}px`,
      width: `${w}px`, height: `${h}px`, borderRadius: ribbon ? '1px' : '50%',
      background: SHINY[Math.floor(Math.random() * SHINY.length)],
      boxShadow: '0 0 3px rgba(255,255,255,.6)', willChange: 'transform, opacity',
    });
    layer.appendChild(piece);
    const fall = height + 40;
    const drift = rand(-60, 60);
    const flips = rand(2, 5) * 360;            // retournements : c'est ce qui fait briller
    const spin = rand(-540, 540);
    const duration = rand(2400, 4000);
    const delay = rand(0, 700);
    longest = Math.max(longest, duration + delay);
    piece.animate(
      [
        { transform: 'translate3d(0,0,0) rotateX(0) rotateY(0) rotateZ(0)', opacity: 0 },
        { transform: `translate3d(${drift * 0.3}px, ${fall * 0.15}px, 0) rotateX(${flips * 0.15}deg) rotateY(${flips * 0.1}deg) rotateZ(${spin * 0.15}deg)`, opacity: 1, offset: 0.08 },
        { transform: `translate3d(${drift}px, ${fall * 0.8}px, 0) rotateX(${flips * 0.8}deg) rotateY(${flips * 0.6}deg) rotateZ(${spin * 0.8}deg)`, opacity: 1, offset: 0.8 },
        { transform: `translate3d(${drift * 1.2}px, ${fall}px, 0) rotateX(${flips}deg) rotateY(${flips * 0.75}deg) rotateZ(${spin}deg)`, opacity: 0 },
      ],
      { duration, delay, easing: 'cubic-bezier(.25,.6,.45,1)', fill: 'both' },
    );
  }

  // Étoiles qui pétillent un instant à différents endroits de la page
  for (let i = 0; i < SPARKS; i++) {
    const star = document.createElement('span');
    star.textContent = '✦';
    Object.assign(star.style, {
      position: 'absolute', left: `${rand(4, 96)}%`, top: `${rand(5, 75)}%`,
      fontSize: `${rand(10, 18)}px`, lineHeight: '1', color: Math.random() < 0.6 ? '#facc15' : '#ffffff',
      textShadow: '0 0 6px rgba(250,204,21,.9), 0 0 12px rgba(255,255,255,.7)', willChange: 'transform, opacity',
    });
    layer.appendChild(star);
    const duration = rand(700, 1100);
    const delay = rand(100, 1800);
    longest = Math.max(longest, duration + delay);
    star.animate(
      [
        { transform: 'scale(0) rotate(0deg)', opacity: 0 },
        { transform: 'scale(1.2) rotate(45deg)', opacity: 1, offset: 0.4 },
        { transform: 'scale(0) rotate(90deg)', opacity: 0 },
      ],
      { duration, delay, easing: 'ease-out', fill: 'both' },
    );
  }

  setTimeout(() => layer.remove(), longest + 300);
}

// Toutes les réussites de l'application passent par toast.success : on y ajoute les confettis
const originalSuccess = toast.success;
toast.success = (...args) => {
  sprinkleFlowers();
  return originalSuccess(...args);
};
