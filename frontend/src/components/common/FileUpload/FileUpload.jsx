import { useRef, useState } from 'react';
import './FileUpload.css';

function FileUpload({ id, label, accept = 'image/*', value, onChange, hint, preview = false }) {
  const ref = useRef();
  const [dragging, setDragging] = useState(false);

  function handleFile(file) {
    if (!file) return;
    onChange(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  const previewSrc = value instanceof File
    ? URL.createObjectURL(value)
    : typeof value === 'string' ? value : null;

  return (
    <div className="file-upload">
      {label && <label className="form-field__label" htmlFor={id}>{label}</label>}
      <div
        className={`file-upload__zone ${dragging ? 'file-upload__zone--active' : ''}`}
        onClick={() => ref.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && ref.current.click()}
        aria-label={label ?? 'Téléverser un fichier'}
      >
        {preview && previewSrc ? (
          <img src={previewSrc} alt="Aperçu" className="file-upload__preview" />
        ) : (
          <div className="file-upload__prompt">
            <span className="file-upload__icon">📁</span>
            <span className="file-upload__text">
              {value instanceof File
                ? value.name
                : 'Cliquer ou déposer un fichier'}
            </span>
          </div>
        )}
        <input
          ref={ref}
          id={id}
          type="file"
          accept={accept}
          className="file-upload__input"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>
      {hint && <p className="form-field__hint">{hint}</p>}
    </div>
  );
}

export default FileUpload;
