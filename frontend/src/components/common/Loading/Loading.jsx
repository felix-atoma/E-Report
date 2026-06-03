import Loading3DScene from './Loading3DScene';
import './Loading.css';

function Loading({ fullPage = false, label = 'Chargement…', size = 130 }) {
  return (
    <div className={`loading ${fullPage ? 'loading--full-page' : ''}`} role="status" aria-label={label}>
      <div className="loading__scene">
        <Loading3DScene size={fullPage ? 160 : size} />
      </div>
      <p className="loading__label">{label}</p>
    </div>
  );
}

export default Loading;
