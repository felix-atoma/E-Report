/**
 * Dates d'une session (devoir surveillé, examen blanc, composition) en toutes lettres.
 * Les épreuves n'ont pas lieu le week-end : entre la date de début et la date de fin, seuls les
 * jours du lundi au vendredi sont listés — 15 → 20 octobre donne « 15, 16, 19 et 20 octobre 2026 ».
 */
export function formatSessionDays(start?: Date | string | null, end?: Date | string | null, lang: 'fr' | 'en' = 'fr'): string | null {
  if (!start) return null;
  const locale = lang === 'en' ? 'en-GB' : 'fr-FR';
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const long = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  if (!e || e.getTime() <= s.getTime()) return long(s);

  const days: Date[] = [];
  for (const d = new Date(s); d.getTime() <= e.getTime() && days.length < 40; d.setUTCDate(d.getUTCDate() + 1)) days.push(new Date(d));
  const weekdays = days.filter((d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6);
  const list = weekdays.length ? weekdays : days;
  const and = lang === 'en' ? ' and ' : ' et ';
  const join = (parts: string[]) => (parts.length > 1 ? parts.slice(0, -1).join(', ') + and + parts[parts.length - 1] : parts[0]);

  const sameMonth = list.every((d) => d.getUTCMonth() === list[0].getUTCMonth() && d.getUTCFullYear() === list[0].getUTCFullYear());
  if (sameMonth && list.length <= 10) {
    const monthYear = list[0].toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return `${join(list.map((d) => String(d.getUTCDate())))} ${monthYear}`;
  }
  const from = s.toLocaleDateString(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' });
  return lang === 'en' ? `${from} to ${long(e)}` : `du ${from} au ${long(e)}`;
}
