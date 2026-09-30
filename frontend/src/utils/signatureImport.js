// Import d'une signature depuis un fichier (PNG, JPG, PDF) :
// 1) rendu en image (PDF : première page via pdf.js, chargé seulement si besoin)
// 2) fond blanc/gris clair rendu transparent (signature scannée sur papier)
// 3) recadrage automatique sur la signature (marges vides supprimées)
// Retourne un canvas prêt à être dessiné dans le SignaturePad.

export const SIGNATURE_ACCEPT = 'image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf';
const MAX_BYTES = 8 * 1024 * 1024;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de lire l'image"));
    img.src = src;
  });
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Lecture du fichier impossible'));
    r.readAsDataURL(file);
  });
}

async function pdfFirstPageToCanvas(file) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
  const { default: workerUrl } = await import('pdfjs-dist/legacy/build/pdf.worker.min.js?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  // Échelle limitée : une page A4 scannée reste gérable sur un téléphone
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2, 1800 / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  doc.destroy();
  return canvas;
}

async function imageFileToCanvas(file) {
  const img = await loadImage(await readAsDataUrl(file));
  const scale = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Fond clair → transparent, puis recadrage sur les pixels restants (avec une petite marge). */
function cleanAndCrop(src) {
  const ctx = src.getContext('2d', { willReadFrequently: true });
  const { width, height } = src;
  const image = ctx.getImageData(0, 0, width, height);
  const px = image.data;
  let minX = width, minY = height, maxX = -1, maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      if (px[i + 3] < 20 || lum > 215) {
        px[i + 3] = 0;                       // papier / fond → transparent
      } else {
        if (lum > 160) px[i + 3] = Math.round(px[i + 3] * (215 - lum) / 55); // bords adoucis
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error('Aucune signature détectée dans ce fichier');
  ctx.putImageData(image, 0, 0);

  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.04) + 2;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad); maxY = Math.min(height - 1, maxY + pad);

  const out = document.createElement('canvas');
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext('2d').drawImage(src, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

export async function signatureFileToCanvas(file) {
  if (!file) throw new Error('Aucun fichier');
  if (file.size > MAX_BYTES) throw new Error('Fichier trop volumineux (8 Mo maximum)');
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isImage = /^image\/(png|jpe?g)$/.test(file.type) || /\.(png|jpe?g)$/i.test(file.name);
  if (!isPdf && !isImage) throw new Error('Format non pris en charge (PNG, JPG ou PDF)');
  const raw = isPdf ? await pdfFirstPageToCanvas(file) : await imageFileToCanvas(file);
  return cleanAndCrop(raw);
}
