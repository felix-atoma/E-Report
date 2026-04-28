import './Input.css';

function Input({
  label,
  id,
  error,
  hint,
  prefix,
  suffix,
  className = '',
  required,
  ...props
}) {
  return (
    <div className={`form-field input-field ${className}`}>
      {label && (
        <label htmlFor={id} className="form-field__label">
          {label}
          {required && <span className="form-field__required" aria-hidden="true"> *</span>}
        </label>
      )}
      <div className="input-field__wrapper">
        {prefix && <span className="input-field__affix input-field__prefix">{prefix}</span>}
        <input
          id={id}
          className={`input-field__control ${error ? 'input-field__control--error' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          required={required}
          {...props}
        />
        {suffix && <span className="input-field__affix input-field__suffix">{suffix}</span>}
      </div>
      {hint && !error && <p id={`${id}-hint`} className="form-field__hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="form-field__error" role="alert">{error}</p>}
    </div>
  );
}

export default Input;
