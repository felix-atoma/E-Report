import './Loading.css';
import Spinner from '../Spinner/Spinner';

function Loading({ fullPage = false, label = 'Chargement…' }) {
  return (
    <div className={`loading ${fullPage ? 'loading--full-page' : ''}`}>
      <Spinner size="lg" label={label} />
      <p className="loading__label">{label}</p>
    </div>
  );
}

export default Loading;
