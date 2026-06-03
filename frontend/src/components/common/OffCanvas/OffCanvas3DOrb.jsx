/* CSS-only orb — replaces the R3F canvas */
import './OffCanvas3DOrb.css';

export default function OffCanvas3DOrb() {
  return (
    <div className="oc-orb" aria-hidden="true">
      <div className="oc-orb__core" />
      <div className="oc-orb__ring oc-orb__ring--1" />
      <div className="oc-orb__ring oc-orb__ring--2" />
      <div className="oc-orb__glow" />
    </div>
  );
}
