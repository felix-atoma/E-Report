/**
 * Formats a mock exam session date range.
 *
 * - No dates          → null
 * - Start only        → "Du 11 mai 2026"
 * - Same month range  → "Session du 11, 12, 13 mai 2026"
 * - Cross-month range → "Session du 30 avril au 2 mai 2026"
 */
export function fmtSessionDates(start, end) {
  if (!start) return null;

  const s = new Date(start);

  if (!end) {
    return `Du ${s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }

  const e = new Date(end);

  // Clamp: if end before start treat as same day
  if (e <= s) {
    return `Du ${s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }

  if (
    s.getMonth() === e.getMonth() &&
    s.getFullYear() === e.getFullYear()
  ) {
    // Same month — list every day number
    const days = [];
    const cur = new Date(s);
    while (cur <= e) {
      days.push(cur.getDate());
      cur.setDate(cur.getDate() + 1);
    }
    const monthYear = s.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return `Session du ${days.join(', ')} ${monthYear}`;
  }

  // Different months — "du X mois au Y mois année"
  const startStr = s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const endStr   = e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return `Session du ${startStr} au ${endStr}`;
}
