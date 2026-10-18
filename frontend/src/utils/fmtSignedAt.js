/**
 * Date ET heure de signature d'une fiche : « 18 octobre 2026 à 14:35 » (en anglais :
 * « 18 October 2026 at 14:35 »). short = « 18 oct. · 14:35 » pour les listes.
 */
export function fmtSignedAt(iso, { lang = 'fr', short = false } = {}) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const locale = lang === 'en' ? 'en-GB' : 'fr-FR';
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (short) return `${d.toLocaleDateString(locale, { day: '2-digit', month: 'short' })} · ${time}`;
  const date = d.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
  return `${date} ${lang === 'en' ? 'at' : 'à'} ${time}`;
}
