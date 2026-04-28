import { Link } from 'react-router-dom';
import './Breadcrumbs.css';

function Breadcrumbs({ items = [] }) {
  return (
    <nav className="breadcrumbs" aria-label="Fil d'Ariane">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="breadcrumbs__item">
            {i > 0 && <span className="breadcrumbs__sep" aria-hidden="true">›</span>}
            {isLast || !item.to
              ? <span className="breadcrumbs__current">{item.label}</span>
              : <Link to={item.to} className="breadcrumbs__link">{item.label}</Link>}
          </span>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;
