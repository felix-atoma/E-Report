import { useRef, useEffect, useState, useCallback } from 'react';
import { signatureFileToCanvas, SIGNATURE_ACCEPT } from '../../../utils/signatureImport';
import './SignaturePad.css';

export default function SignaturePad({ onChange, width = 480, height = 180 }) {
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const drawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [imported, setImported] = useState(false);

  // Normalise event coords relative to canvas
  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (src.clientY - rect.top)  * (canvasRef.current.height / rect.height),
    };
  }

  const emit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange?.(canvas.toDataURL('image/png'));
  }, [onChange]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    setImported(false);
    setImportError('');
    onChange?.(null);
  }, [onChange]);

  // Signature importée (PNG, JPG ou PDF) : nettoyée, recadrée puis dessinée centrée dans le cadre
  async function handleImport(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportError('');
    try {
      const sig = await signatureFileToCanvas(file);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const margin = 8;
      const ratio = Math.min((canvas.width - margin * 2) / sig.width, (canvas.height - margin * 2) / sig.height);
      const w = sig.width * ratio;
      const h = sig.height * ratio;
      ctx.drawImage(sig, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      setIsEmpty(false);
      setImported(true);
      emit();
    } catch (err) {
      setImportError(err?.message ?? "Échec de l'import");
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    function start(e) {
      e.preventDefault();
      drawing.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function move(e) {
      e.preventDefault();
      if (!drawing.current) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      setIsEmpty(false);
    }

    function stop(e) {
      e.preventDefault();
      if (!drawing.current) return;
      drawing.current = false;
      emit();
    }

    canvas.addEventListener('mousedown',  start);
    canvas.addEventListener('mousemove',  move);
    canvas.addEventListener('mouseup',    stop);
    canvas.addEventListener('mouseleave', stop);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove',  move,  { passive: false });
    canvas.addEventListener('touchend',   stop);

    return () => {
      canvas.removeEventListener('mousedown',  start);
      canvas.removeEventListener('mousemove',  move);
      canvas.removeEventListener('mouseup',    stop);
      canvas.removeEventListener('mouseleave', stop);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove',  move);
      canvas.removeEventListener('touchend',   stop);
    };
  }, [emit]);

  return (
    <div className="sig-pad">
      <div className="sig-pad__instructions">
        Signez dans le cadre ci-dessous à l'aide de votre souris ou de votre doigt,
        ou importez votre signature (PNG, JPG ou PDF).
      </div>
      <div className="sig-pad__import">
        <button
          type="button"
          className="sig-pad__import-btn"
          onClick={() => fileRef.current?.click()}
          disabled={importing}
        >
          {importing ? 'Import en cours…' : '📎 Importer ma signature (PNG, JPG, PDF)'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={SIGNATURE_ACCEPT}
          onChange={handleImport}
          style={{ display: 'none' }}
        />
        {importError && <span className="sig-pad__import-error">{importError}</span>}
      </div>
      <div className="sig-pad__canvas-wrap">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="sig-pad__canvas"
        />
        {isEmpty && (
          <div className="sig-pad__placeholder">Votre signature ici…</div>
        )}
      </div>
      <div className="sig-pad__footer">
        <button type="button" className="sig-pad__clear" onClick={clear} disabled={isEmpty}>
          ↩ Effacer
        </button>
        {!isEmpty && (
          <span className="sig-pad__ok">{imported ? '✔ Signature importée' : '✔ Signature saisie'}</span>
        )}
      </div>
    </div>
  );
}
