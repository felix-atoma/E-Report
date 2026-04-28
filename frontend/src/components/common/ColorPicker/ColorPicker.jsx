import './ColorPicker.css';

function ColorPicker({ id, label, value = '#000000', onChange, hint }) {
  function handleHex(e) {
    const v = e.target.value;
    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
  }

  return (
    <div className="color-picker">
      {label && <label htmlFor={id} className="form-field__label">{label}</label>}
      <div className="color-picker__row">
        <input
          id={id}
          type="color"
          className="color-picker__swatch"
          value={value.length === 7 ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="color-picker__hex"
          value={value}
          onChange={handleHex}
          maxLength={7}
          placeholder="#000000"
          aria-label={`Valeur hexadécimale pour ${label ?? 'couleur'}`}
        />
      </div>
      {hint && <p className="form-field__hint">{hint}</p>}
    </div>
  );
}

export default ColorPicker;
