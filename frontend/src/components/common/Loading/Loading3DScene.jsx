/* CSS-only orbital loader — replaces the R3F canvas that crashed in production */
import './Loading3DScene.css';

export default function Loading3DScene({ size = 130 }) {
  return (
    <div className="orb-loader" style={{ width: size, height: size }}>
      <div className="orb-loader__core" />
      <div className="orb-loader__ring orb-loader__ring--1" />
      <div className="orb-loader__ring orb-loader__ring--2" />
      <div className="orb-loader__ring orb-loader__ring--3" />
      <div className="orb-loader__dot orb-loader__dot--1" />
      <div className="orb-loader__dot orb-loader__dot--2" />
      <div className="orb-loader__dot orb-loader__dot--3" />
    </div>
  );
}
