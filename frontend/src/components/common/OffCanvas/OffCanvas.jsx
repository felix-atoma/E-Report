import { useEffect } from 'react';
import './OffCanvas.css';

function OffCanvas({ open, onClose, title, children, size = 'md', footer }) {
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
        <div className="offcanvas__header">
          <h2 className="offcanvas__title">{title}</h2>
          <button className="offcanvas__close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="offcanvas__body">{children}</div>
        {footer && <div className="offcanvas__footer">{footer}</div>}
      </div>
    </div>
  );
}

export default OffCanvas;
