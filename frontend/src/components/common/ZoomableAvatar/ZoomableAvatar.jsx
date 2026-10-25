import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Avatar from '../Avatar/Avatar';
import './ZoomableAvatar.css';

/**
 * Photo de profil qui s'agrandit au clic (plein écran, fond sombre) ; fermeture par clic, ✕ ou Échap.
 * Sans photo : simple avatar (initiales), non cliquable.
 */
export default function ZoomableAvatar({ src, name, size = 'xl', ...rest }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  if (!src) return <Avatar name={name} src={src} size={size} {...rest} />;

  return (
    <>
      <button type="button" className="zavatar" onClick={() => setOpen(true)} title="Agrandir la photo" aria-label={`Agrandir la photo de ${name ?? "l'élève"}`}>
        <Avatar name={name} src={src} size={size} {...rest} />
        <span className="zavatar__hint" aria-hidden="true">🔍</span>
      </button>
      {open && createPortal(
        <div className="zavatar-overlay" role="dialog" aria-modal="true" aria-label={`Photo de ${name ?? "l'élève"}`} onClick={() => setOpen(false)}>
          <button type="button" className="zavatar-overlay__close" aria-label="Fermer" onClick={() => setOpen(false)}>✕</button>
          <figure className="zavatar-overlay__figure" onClick={(e) => e.stopPropagation()}>
            <img src={src} alt={name ?? ''} className="zavatar-overlay__img" />
            {name && <figcaption className="zavatar-overlay__name">{name}</figcaption>}
          </figure>
        </div>,
        document.body,
      )}
    </>
  );
}
