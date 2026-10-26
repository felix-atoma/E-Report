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

  // Teinte du papier mesurée sur la photo (papier gris, ombre, lumière jaune…) : la plupart des pixels
  // sont du papier ; tout ce qui est à peine plus foncé que lui (grain, ombre légère) devient transparent
  const hist = new Uint32Array(256);
  for (let i = 0; i < px.length; i += 4) hist[Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2])]++;
  let acc = 0, paper = 255;
  for (let l = 0; l < 256; l++) { acc += hist[l]; if (acc >= (px.length / 4) * 0.4) { paper = l; break; } }
  const cut = Math.min(215, paper - 45);   // plus clair que ça : fond
  const soft = cut - 55;                   // entre les deux : bord adouci

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      if (px[i + 3] < 20 || lum > cut) {
        px[i + 3] = 0;                       // papier / fond → transparent
      } else {
        if (lum > soft) px[i + 3] = Math.round(px[i + 3] * (cut - lum) / 55); // bords adoucis
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error('Aucune signature détectée dans ce fichier');

  // Encre d'une seule couleur (moyenne des traits foncés) : rendu net et image très légère
  // (une photo garde des centaines de nuances qui alourdissaient l'envoi au serveur)
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] > 200) { r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
  }
  const ink = n ? [Math.round(r / n * 0.6), Math.round(g / n * 0.6), Math.round(b / n * 0.6)] : [17, 24, 39];
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    px[i] = ink[0]; px[i + 1] = ink[1]; px[i + 2] = ink[2];
    // Alpha arrondi par paliers : bords lisses, beaucoup moins de valeurs différentes à compresser
    px[i + 3] = px[i + 3] > 230 ? 255 : Math.round(px[i + 3] / 32) * 32;
  }
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
