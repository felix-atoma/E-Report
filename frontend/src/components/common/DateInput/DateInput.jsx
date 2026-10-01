import { useEffect, useRef, useState } from 'react';
import './DateInput.css';

/*
 * Champ de date : saisie au clavier (jj/mm/aaaa, les « / » s'ajoutent tout seuls) OU choix dans le
 * calendrier (bouton 📅). Sur téléphone, le champ natif type="date" n'ouvre que le calendrier ;
 * celui-ci permet aussi de taper la date.
 *
 * Même contrat qu'un <input type="date"> : `value` au format AAAA-MM-JJ (ou ''), et `onChange`
 * reçoit un événement dont `target.value` est AAAA-MM-JJ (ou '' si le champ est vidé).
 */

const pad = (n) => String(n).padStart(2, '0');

/** AAAA-MM-JJ → jj/mm/aaaa */
function isoToText(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** jj/mm/aaaa → AAAA-MM-JJ, ou null si la date n'existe pas (ex. 31/02/2025) */
function textToIso(text) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (y < 1900 || date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/** Garde les chiffres et place les « / » : 12032025 → 12/03/2025 */
function maskDigits(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function DateInput({
  value = '',
  onChange,
  min,
  max,
  id,
  name,
  className = '',
  required,
  disabled,
  placeholder = 'jj/mm/aaaa',
  'aria-invalid': ariaInvalid,
  ...rest
}) {
  const [text, setText] = useState(isoToText(value));
  const [invalid, setInvalid] = useState(false);
  const pickerRef = useRef(null);

  // Valeur changée de l'extérieur (formulaire réinitialisé, calendrier…) : on resynchronise
  useEffect(() => {
    if (textToIso(text) !== (value || null)) {
      setText(isoToText(value));
      setInvalid(false);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = (iso) => {
    onChange?.({ target: { value: iso, name, id }, currentTarget: { value: iso, name, id } });
  };

  const outOfRange = (iso) => (min && iso < min) || (max && iso > max);

  const handleType = (e) => {
    const next = maskDigits(e.target.value);
    setText(next);
    if (next === '') {
      setInvalid(false);
      if (value) emit('');
      return;
    }
    if (next.length < 10) { setInvalid(false); return; }   // saisie en cours
    const iso = textToIso(next);
    if (!iso || outOfRange(iso)) { setInvalid(true); return; }
    setInvalid(false);
    if (iso !== value) emit(iso);
  };

  // Champ quitté avec une date incomplète : on la signale
  const handleBlur = () => {
    if (text && text.length < 10) setInvalid(true);
  };

  const openPicker = () => {
    const el = pickerRef.current;
    if (!el || disabled) return;
    try {
      if (typeof el.showPicker === 'function') el.showPicker();
      else { el.focus(); el.click(); }
    } catch {
      el.focus(); el.click();
    }
  };

  const handlePick = (e) => {
    const iso = e.target.value;
    setText(isoToText(iso));
    setInvalid(false);
    emit(iso);
  };

  return (
    <span className={`date-input${invalid ? ' date-input--invalid' : ''}${disabled ? ' date-input--disabled' : ''}`}>
      <input
        {...rest}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={`date-input__text ${className}`}
        placeholder={placeholder}
        maxLength={10}
        value={text}
        onChange={handleType}
        onBlur={handleBlur}
        required={required}
        disabled={disabled}
        aria-invalid={ariaInvalid || invalid || undefined}
        title={invalid ? 'Date invalide — format jj/mm/aaaa' : undefined}
      />
      <button
        type="button"
        className="date-input__btn"
        onClick={openPicker}
        disabled={disabled}
        aria-label="Ouvrir le calendrier"
        tabIndex={-1}
      >
        📅
      </button>
      {/* Calendrier natif, invisible : ouvert par le bouton */}
      <input
        ref={pickerRef}
        type="date"
        className="date-input__picker"
        value={value || ''}
        min={min}
        max={max}
        onChange={handlePick}
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
      />
    </span>
  );
}

export default DateInput;
