import { useRef } from 'react';
import './SearchBar.css';

function SearchBar({ value, onChange, placeholder = 'Rechercher…', className = '' }) {
  const ref = useRef();
  return (
    <div className={`search-bar ${className}`}>
      <span className="search-bar__icon" aria-hidden="true">🔍</span>
      <input
        ref={ref}
        type="search"
        className="search-bar__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className="search-bar__clear" onClick={() => { onChange(''); ref.current.focus(); }} aria-label="Effacer">
          ✕
        </button>
      )}
    </div>
  );
}

export default SearchBar;
