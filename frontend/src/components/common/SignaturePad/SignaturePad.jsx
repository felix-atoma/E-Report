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

  // Coordonnées du pointeur (souris, doigt ou stylet) dans le repère du canvas
  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (e.clientY - rect.top)  * (canvasRef.current.height / rect.height),
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

    // Pointer Events : souris, doigt et stylet (écran tactile, tablette graphique) avec le même code.
    // Stylet : l'épaisseur suit la pression ; le pointeur est « capturé » pour que le trait continue
    // même si le stylet sort un instant du cadre.
    let last = null;
    const widthFor = (e) => (e.pointerType === 'pen' && e.pressure > 0 ? 1 + e.pressure * 2.5 : 2);

    function start(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      canvas.setPointerCapture?.(e.pointerId);
      drawing.current = true;
      last = getPos(e);
      // Un simple point (tap) laisse aussi une trace
      ctx.beginPath();
      ctx.arc(last.x, last.y, widthFor(e) / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }

    function move(e) {
      if (!drawing.current) return;
      e.preventDefault();
      // Points intermédiaires fournis par le navigateur : trait fluide même en écrivant vite
      const points = e.getCoalescedEvents?.() ?? [];
      for (const p of points.length ? points : [e]) {
        const pos = getPos(p);
        ctx.lineWidth = widthFor(p);
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        last = pos;
      }
      setIsEmpty(false);
    }

    function stop(e) {
      if (!drawing.current) return;
      e.preventDefault();
      drawing.current = false;
      last = null;
      canvas.releasePointerCapture?.(e.pointerId);
      setIsEmpty(false);
      emit();
    }

    canvas.addEventListener('pointerdown',   start);
    canvas.addEventListener('pointermove',   move);
    canvas.addEventListener('pointerup',     stop);
    canvas.addEventListener('pointercancel', stop);

    return () => {
      canvas.removeEventListener('pointerdown',   start);
      canvas.removeEventListener('pointermove',   move);
      canvas.removeEventListener('pointerup',     stop);
      canvas.removeEventListener('pointercancel', stop);
    };
  }, [emit]);

  return (
    <div className="sig-pad">
      <div className="sig-pad__instructions">
        Signez dans le cadre ci-dessous avec la souris, le doigt ou un stylet (écran tactile, tablette),
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
