import './Loading3DScene.css';

/**
 * Chargement : cube 3D qui tourne (CSS pur, sans bibliothèque 3D — léger et fiable sur téléphone).
 * Faces aux couleurs de NovaBulletin (bleu nuit et jaune).
 */
export default function Loading3DScene({ size = 130 }) {
  const edge = Math.round(size * 0.46);
  return (
    <div className="cube-loader" style={{ width: size, height: size, '--cube': `${edge}px` }} aria-hidden="true">
      <div className="cube-loader__cube">
        <span className="cube-loader__face cube-loader__face--front" />
        <span className="cube-loader__face cube-loader__face--back" />
        <span className="cube-loader__face cube-loader__face--right" />
        <span className="cube-loader__face cube-loader__face--left" />
        <span className="cube-loader__face cube-loader__face--top" />
        <span className="cube-loader__face cube-loader__face--bottom" />
      </div>
      <div className="cube-loader__shadow" />
    </div>
  );
}
