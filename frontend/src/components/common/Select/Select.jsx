import ReactSelect from 'react-select';
import './Select.css';

const getStyles = (error) => ({
  control: (base, state) => ({
    ...base,
    minHeight: '38px',
    fontSize: '0.9375rem',
    fontFamily: 'inherit',
    borderColor: error
      ? 'var(--color-danger, #ef4444)'
      : state.isFocused
      ? 'var(--color-primary, #1e40af)'
      : 'var(--color-border, #e5e7eb)',
    borderRadius: 'var(--radius-md, 6px)',
    boxShadow: state.isFocused
      ? error
        ? '0 0 0 3px rgba(239,68,68,0.12)'
        : '0 0 0 3px rgba(30,64,175,0.12)'
      : 'none',
    '&:hover': {
      borderColor: error
        ? 'var(--color-danger, #ef4444)'
        : 'var(--color-primary, #1e40af)',
    },
    cursor: 'pointer',
    backgroundColor: '#fff',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }),
  valueContainer: (base) => ({ ...base, padding: '0 0.75rem' }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--color-text-muted, #9ca3af)',
    fontSize: '0.9375rem',
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--color-text, #1f2937)',
    fontSize: '0.9375rem',
  }),
  option: (base, state) => ({
    ...base,
    fontSize: '0.9375rem',
    cursor: 'pointer',
    backgroundColor: state.isSelected
      ? 'var(--color-primary, #1e40af)'
      : state.isFocused
      ? 'rgba(30,64,175,0.07)'
      : '#fff',
    color: state.isSelected ? '#fff' : 'var(--color-text, #1f2937)',
    '&:active': { backgroundColor: 'rgba(30,64,175,0.15)' },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 'var(--radius-md, 6px)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    border: '1px solid var(--color-border, #e5e7eb)',
    zIndex: 200,
  }),
  menuList: (base) => ({ ...base, padding: '4px' }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: 'var(--color-text-muted, #6b7280)',
    transition: 'transform 0.2s',
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    padding: '0 0.5rem',
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'var(--color-text-muted, #6b7280)',
    padding: '0 0.25rem',
    '&:hover': { color: 'var(--color-danger, #ef4444)' },
  }),
});

function Select({
  label,
  id,
  error,
  hint,
  options = [],
  placeholder = 'Sélectionner…',
  className = '',
  required,
  value,
  onChange,
  isMulti = false,
  isClearable = false,
  isDisabled = false,
  isLoading = false,
  ...rest
}) {
  const selected = isMulti
    ? options.filter((o) => (value ?? []).includes(o.value))
    : (options.find((o) => o.value === value) ?? null);

  function handleChange(option) {
    if (!onChange) return;
    if (isMulti) {
      onChange({ target: { value: option ? option.map((o) => o.value) : [] } });
    } else {
      onChange({ target: { value: option?.value ?? '' } });
    }
  }

  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label htmlFor={id} className="form-field__label">
          {label}
          {required && <span className="form-field__required" aria-hidden="true"> *</span>}
        </label>
      )}
      <ReactSelect
        inputId={id}
        options={options}
        value={selected}
        onChange={handleChange}
        placeholder={placeholder}
        isMulti={isMulti}
        isClearable={isClearable}
        isDisabled={isDisabled}
        isLoading={isLoading}
        styles={getStyles(error)}
        classNamePrefix="rs"
        noOptionsMessage={() => 'Aucune option'}
        loadingMessage={() => 'Chargement…'}
        aria-invalid={!!error}
        {...rest}
      />
      {hint && !error && <p id={`${id}-hint`} className="form-field__hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="form-field__error" role="alert">{error}</p>}
    </div>
  );
}

export default Select;
