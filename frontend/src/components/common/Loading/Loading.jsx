import { Component, Suspense, lazy } from 'react';
import './Loading.css';

const Loading3DScene = lazy(() => import('./Loading3DScene'));

// Detect WebGL once at module load — never attempt canvas if unavailable
const canWebGL = (() => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch { return false; }
})();

let webglFailed = false;

class SceneErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { webglFailed = true; return { failed: true }; }
  render() {
    if (this.state.failed) return <span className="loading__fallback-ring" aria-hidden="true" />;
    return this.props.children;
  }
}

function Loading({ fullPage = false, label = 'Chargement…', size = 130 }) {
  const use3D = canWebGL && !webglFailed;
  return (
    <div className={`loading ${fullPage ? 'loading--full-page' : ''}`} role="status" aria-label={label}>
      <div className="loading__scene">
        {use3D ? (
          <SceneErrorBoundary>
            <Suspense fallback={<span className="loading__fallback-ring" aria-hidden="true" />}>
              <Loading3DScene size={fullPage ? 160 : size} />
            </Suspense>
          </SceneErrorBoundary>
        ) : (
          <span className="loading__fallback-ring" aria-hidden="true" />
        )}
      </div>
      <p className="loading__label">{label}</p>
    </div>
  );
}

export default Loading;
