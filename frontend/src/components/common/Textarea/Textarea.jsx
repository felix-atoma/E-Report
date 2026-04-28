import './Textarea.css';

function Textarea({ label, id, error, hint, rows = 4, className = '', required, ...props }) {
  return (
    <div className={`form-field textarea-field ${className}`}>
      {label && (
        <label htmlFor={id} className="form-field__label">
          {label}
          {required && <span className="form-field__required" aria-hidden="true"> *</span>}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        className={`textarea-field__control ${error ? 'textarea-field__control--error' : ''}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        required={required}
        {...props}
      />
      {hint && !error && <p id={`${id}-hint`} className="form-field__hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="form-field__error" role="alert">{error}</p>}
    </div>
  );
}

export default Textarea;
