// Nombres en toutes lettres (français), pour écrire la moyenne générale en lettres sur le bulletin.
// Copie identique de frontend/src/utils/numberToFrench.js — les garder synchronisées.

const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

/** Entier de 0 à 999 en lettres : 21 → « vingt et un », 80 → « quatre-vingts », 91 → « quatre-vingt-onze » */
export function intToFrench(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n < 20) return UNITS[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7 || t === 9) {
      const base = t === 7 ? 'soixante' : 'quatre-vingt';
      const rest = 10 + u;                       // 70-79 → soixante-dix…, 90-99 → quatre-vingt-dix…
      return t === 7 && u === 1 ? 'soixante et onze' : `${base}-${UNITS[rest]}`;
    }
    if (t === 8) return u === 0 ? 'quatre-vingts' : `quatre-vingt-${UNITS[u]}`;
    if (u === 0) return TENS[t];
    if (u === 1) return `${TENS[t]} et un`;
    return `${TENS[t]}-${UNITS[u]}`;
  }
  const h = Math.floor(n / 100);
  const r = n % 100;
  const hundreds = h === 1 ? 'cent' : `${UNITS[h]} cent${r === 0 ? 's' : ''}`;
  return r === 0 ? hundreds : `${hundreds} ${intToFrench(r)}`;
}

/**
 * Note avec deux décimales en lettres : 12,45 → « Douze virgule quarante-cinq »,
 * 12,05 → « Douze virgule zéro cinq », 12,50 → « Douze virgule cinquante », 12 → « Douze ».
 */
export function scoreToFrench(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '';
  const cents = Math.round(Number(value) * 100);
  const int = Math.floor(cents / 100);
  const dec = cents % 100;
  let words = intToFrench(int);
  if (dec > 0) words += ` virgule ${dec < 10 ? `zéro ${UNITS[dec]}` : intToFrench(dec)}`;
  return words.charAt(0).toUpperCase() + words.slice(1);
}
