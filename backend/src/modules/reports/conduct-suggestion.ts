/**
 * Conduite proposée au titulaire pour un trimestre, à partir de ce que l'école a déjà enregistré :
 * absences non justifiées, retards et dossier disciplinaire de la période. Le titulaire la confirme
 * ou la modifie ; rien n'est imposé.
 *
 *   Médiocre  : exclusion ou suspension, ou 10 jours d'absence non justifiée ou plus
 *   Passable  : avertissement, ou 4 jours d'absence ou plus, ou 5 h de retard ou plus
 *   Bien      : au moins une absence non justifiée, 1 h de retard ou plus, ou une remarque
 *   Très bien : rien à signaler
 */
export type ConductRatingValue = 'TRES_BIEN' | 'BIEN' | 'PASSABLE' | 'MEDIOCRE';

export interface ConductSuggestion {
  rating: ConductRatingValue;
  reason: string;
}

export function suggestConduct(input: {
  absentDays?: number | null;
  lateMinutes?: number | null;
  warnings?: number | null;
  discipline?: { type: string }[];
}): ConductSuggestion {
  const absent = input.absentDays ?? 0;
  const late = input.lateMinutes ?? 0;
  const records = input.discipline ?? [];
  const count = (t: string) => records.filter((r) => r.type === t).length;
  const serious = count('EXCLUSION') + count('SUSPENSION');
  const warningsTotal = count('WARNING') + (input.warnings ?? 0);
  const minor = count('NOTE') + count('OTHER');

  const facts: string[] = [];
  if (absent) facts.push(`${absent} j d'absence non justifiée`);
  if (late) facts.push(`${String(Math.round((late / 60) * 10) / 10).replace('.', ',')} h de retard`);
  if (serious) facts.push(`${serious} exclusion(s) / suspension(s)`);
  if (warningsTotal) facts.push(`${warningsTotal} avertissement(s)`);
  if (minor) facts.push(`${minor} remarque(s) disciplinaire(s)`);
  const reason = facts.length ? facts.join(' · ') : 'Rien à signaler sur la période';

  let rating: ConductRatingValue = 'TRES_BIEN';
  if (serious > 0 || absent >= 10) rating = 'MEDIOCRE';
  else if (warningsTotal > 0 || absent >= 4 || late >= 300) rating = 'PASSABLE';
  else if (absent >= 1 || late >= 60 || minor > 0) rating = 'BIEN';
  return { rating, reason };
}
