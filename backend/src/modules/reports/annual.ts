/**
 * Bulletin annuel : moyenne annuelle, rang annuel et décision proposée.
 * Toutes les moyennes sont sur 20 (comme en base) ; le primaire les affiche sur 10.
 */

/** Poids des périodes : EQUAL = moyenne simple ; LAST_DOUBLE = la dernière période compte double. */
export type AnnualWeighting = 'EQUAL' | 'LAST_DOUBLE';

export const ADMIS = 'Admis(e) en classe supérieure';
export const REDOUBLE = 'Redoublant(e)';

/** Nombre de périodes de l'année : 3 trimestres, 2 semestres, sinon la plus haute période publiée. */
export function expectedTermCount(termType: string | null | undefined, publishedTermNumbers: number[]): number {
  if (termType === 'TRIMESTRE') return 3;
  if (termType === 'SEMESTRE') return 2;
  return Math.max(1, ...publishedTermNumbers);
}

/** Réglages de l'école (academicSettings) avec leurs valeurs par défaut. */
export function annualSettings(academicSettings: unknown): { weighting: AnnualWeighting; promotionThreshold: number } {
  const s = (academicSettings as Record<string, unknown> | null) ?? {};
  const weighting: AnnualWeighting = s.annualWeighting === 'LAST_DOUBLE' ? 'LAST_DOUBLE' : 'EQUAL';
  const t = Number(s.promotionThreshold);
  return { weighting, promotionThreshold: Number.isFinite(t) && t > 0 && t <= 20 ? t : 10 };
}

/**
 * Moyenne annuelle à partir des moyennes des périodes publiées. Une période sans moyenne est
 * ignorée (elle comptait pour 0). Avec LAST_DOUBLE, la dernière période de l'année compte double.
 */
export function annualAverage(
  terms: { termNumber: number; overallAverage: number | null | undefined }[],
  expected: number,
  weighting: AnnualWeighting = 'EQUAL',
): number | null {
  let sum = 0;
  let weights = 0;
  for (const t of terms) {
    if (t.overallAverage == null) continue;
    const w = weighting === 'LAST_DOUBLE' && t.termNumber === expected ? 2 : 1;
    sum += t.overallAverage * w;
    weights += w;
  }
  return weights > 0 ? Math.round((sum / weights) * 100) / 100 : null;
}

export function proposedDecision(average: number | null, threshold: number): string | null {
  if (average == null) return null;
  return average >= threshold ? ADMIS : REDOUBLE;
}

/** Rangs avec ex æquo (1, 2, 2, 4) — les élèves sans moyenne ne sont pas classés. */
export function rankWithTies(entries: { id: string; average: number | null }[]): Map<string, number> {
  const sorted = entries.filter((e) => e.average != null).sort((a, b) => (b.average as number) - (a.average as number));
  const ranks = new Map<string, number>();
  sorted.forEach((e, i) => {
    const prev = sorted[i - 1];
    ranks.set(e.id, i > 0 && prev.average === e.average ? (ranks.get(prev.id) as number) : i + 1);
  });
  return ranks;
}
