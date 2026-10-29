import Loading3DScene from '../Loading/Loading3DScene';
import './Spinner.css';

const SIZES = { sm: 28, md: 44, lg: 64 };

/** Petit indicateur de chargement : le même cube 3D, en format réduit. */
function Spinner({ size = 'md', label = 'Chargement…' }) {
  return (
    <span className={`spinner spinner--${size}`} role="status" aria-label={label}>
      <Loading3DScene size={SIZES[size] ?? SIZES.md} />
    </span>
  );
}

export default Spinner;
