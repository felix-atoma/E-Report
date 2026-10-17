/**
 * Dates d'une session (examen blanc, devoir surveillé, composition).
 * Les épreuves n'ont pas lieu le week-end : seuls les jours du lundi au vendredi sont listés.
 *
 * - Pas de date             → null
 * - Un seul jour            → "Du 11 mai 2026"
 * - Même mois               → "Session du 15, 16, 19 et 20 octobre 2026"
 * - Sur deux mois           → "Session du 30 avril au 2 mai 2026"
 */
export function fmtSessionDates(start, end) {
  if (!start) return null;
  const s = new Date(start);
  const long = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  if (!end) return `Du ${long(s)}`;
  const e = new Date(end);
  if (e <= s) return `Du ${long(s)}`;

  const days = [];
  for (const d = new Date(s); d <= e && days.length < 40; d.setUTCDate(d.getUTCDate() + 1)) days.push(new Date(d));
  const weekdays = days.filter((d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6);
  const list = weekdays.length ? weekdays : days;

  const sameMonth = list.every((d) => d.getUTCMonth() === list[0].getUTCMonth() && d.getUTCFullYear() === list[0].getUTCFullYear());
  if (sameMonth && list.length <= 10) {
    const nums = list.map((d) => d.getUTCDate());
    const txt = nums.length > 1 ? `${nums.slice(0, -1).join(', ')} et ${nums[nums.length - 1]}` : String(nums[0]);
    const monthYear = list[0].toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return `Session du ${txt} ${monthYear}`;
  }
  const from = s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  return `Session du ${from} au ${long(e)}`;
}
