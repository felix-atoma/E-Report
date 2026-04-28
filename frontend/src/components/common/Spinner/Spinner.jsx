import './Spinner.css';

function Spinner({ size = 'md', label = 'Chargement…' }) {
  return (
    <span className={`spinner spinner--${size}`} role="status" aria-label={label}>
      <span className="spinner__ring" />
    </span>
  );
}

export default Spinner;
