import { Component, Suspense, lazy } from 'react';
import './Loading.css';

const Loading3DScene = lazy(() => import('./Loading3DScene'));

// Once WebGL fails once, skip it for the entire session — prevents navigation throttling
let webglFailed = false;

class SceneErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    webglFailed = true;
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <span className="loading__fallback-ring" aria-hidden="true" />;
    return this.props.children;
  }
}

function Loading({ fullPage = false, label = 'Chargement…', size = 130 }) {
  return (
    <div className={`loading ${fullPage ? 'loading--full-page' : ''}`} role="status" aria-label={label}>
      <div className="loading__scene">
        {webglFailed ? (
          <span className="loading__fallback-ring" aria-hidden="true" />
        ) : (
          <SceneErrorBoundary>
            <Suspense fallback={<span className="loading__fallback-ring" aria-hidden="true" />}>
              <Loading3DScene size={fullPage ? 160 : size} />
            </Suspense>
          </SceneErrorBoundary>
        )}
      </div>
      <p className="loading__label">{label}</p>
    </div>
  );
}

export default Loading;
