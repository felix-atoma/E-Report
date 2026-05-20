import { useState, useEffect } from 'react';
import './PrintFormatPicker.css';

const FORMATS = [
  { label: 'A1',          value: 'A1 portrait' },
  { label: 'A2',          value: 'A2 portrait' },
  { label: 'A3 Portrait', value: 'A3 portrait' },
  { label: 'A3 Paysage',  value: 'A3 landscape' },
  { label: 'A4 Portrait', value: 'A4 portrait' },
  { label: 'A4 Paysage',  value: 'A4 landscape' },
  { label: 'A5',          value: 'A5 portrait' },
];

const STYLE_ID = '__dynamic-print-format__';

export default function PrintFormatPicker({ defaultFormat = 'A4 portrait' }) {
  const [format, setFormat] = useState(defaultFormat);

  useEffect(() => {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = `@page { size: ${format}; margin: 0; }`;
  }, [format]);

  // Clean up when component unmounts so it doesn't affect other pages
  useEffect(() => {
    return () => {
      const el = document.getElementById(STYLE_ID);
      if (el) el.remove();
    };
  }, []);

  return (
    <div className="pfp-wrap" title="Format d'impression">
      <span className="pfp-label">📄</span>
      <select
        className="pfp-select"
        value={format}
        onChange={(e) => setFormat(e.target.value)}
      >
        {FORMATS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
    </div>
  );
}
