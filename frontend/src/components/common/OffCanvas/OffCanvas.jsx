import { useEffect, Suspense, lazy, Component } from 'react';
import './OffCanvas.css';

const OffCanvas3DOrb = lazy(() => import('./OffCanvas3DOrb'));

let orbFailed = false;
class OrbErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { orbFailed = true; return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

function OffCanvas({ open, onClose, title, subtitle, children, size = 'md', footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="offcanvas-overlay" onClick={onClose} role="dialog" aria-modal aria-label={title}>
      <div className={`offcanvas offcanvas--${size}`} onClick={(e) => e.stopPropagation()}>

        {/* 3D Header */}
        <div className="offcanvas__header">
          {!orbFailed && (
            <OrbErrorBoundary>
              <Suspense fallback={null}>
                <OffCanvas3DOrb size={120} />
              </Suspense>
            </OrbErrorBoundary>
          )}

          <div className="offcanvas__header-content">
            <h2 className="offcanvas__title">{title}</h2>
            {subtitle && <p className="offcanvas__subtitle">{subtitle}</p>}
            <span className="offcanvas__title-accent" aria-hidden="true" />
          </div>

          <button className="offcanvas__close" onClick={onClose} aria-label="Fermer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="offcanvas__body">{children}</div>
        {footer && <div className="offcanvas__footer">{footer}</div>}
      </div>
    </div>
  );
}

export default OffCanvas;
