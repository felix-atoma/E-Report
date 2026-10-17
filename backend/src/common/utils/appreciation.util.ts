/**
 * Barème des appréciations (seuils sur 20) — utilisé partout : notes par matière, mention du bulletin,
 * relevés, examens blancs, devoirs surveillés et compositions.
 *
 *   18 à 20      Excellent
 *   16 à 17,99   Très Bien
 *   14 à 15,99   Bien
 *   12 à 13,99   Assez Bien
 *   10 à 11,99   Passable
 *    8 à 9,99    Insuffisant
 *    0 à 7,99    Très Insuffisant
 */
export const APPRECIATION_THRESHOLDS = [18, 16, 14, 12, 10, 8] as const;

export type AppreciationLang = 'fr' | 'en' | 'de' | 'es' | 'ar';

export const APPRECIATION_LABELS: Record<AppreciationLang, readonly string[]> = {
  fr: ['Excellent', 'Très Bien', 'Bien', 'Assez Bien', 'Passable', 'Insuffisant', 'Très Insuffisant'],
  en: ['Excellent', 'Very Good', 'Good', 'Fairly Good', 'Satisfactory', 'Insufficient', 'Very Poor'],
  de: ['Ausgezeichnet', 'Sehr gut', 'Gut', 'Befriedigend', 'Ausreichend', 'Ungenügend', 'Sehr ungenügend'],
  es: ['Excelente', 'Muy bien', 'Bien', 'Bastante bien', 'Suficiente', 'Insuficiente', 'Muy insuficiente'],
  ar: ['ممتاز', 'جيد جداً', 'جيد', 'مستحسن', 'مقبول', 'ضعيف', 'ضعيف جداً'],
};

/** Appréciation d'une note ramenée sur 20. */
export function appreciationOn20(score20: number, lang: AppreciationLang = 'fr'): string {
  const labels = APPRECIATION_LABELS[lang] ?? APPRECIATION_LABELS.fr;
  const i = APPRECIATION_THRESHOLDS.findIndex((t) => score20 >= t);
  return labels[i === -1 ? labels.length - 1 : i];
}

/** Langue d'enseignement d'une matière, d'après son nom (anglais, allemand, espagnol, arabe). */
export function subjectLang(subjectName?: string | null): AppreciationLang {
  const n = (subjectName ?? '').toLowerCase();
  if (n.includes('anglais') || n.includes('english')) return 'en';
  if (n.includes('allemand') || n.includes('deutsch')) return 'de';
  if (n.includes('espagnol') || n.includes('español')) return 'es';
  if (n.includes('arabe') || n.includes('arabic')) return 'ar';
  return 'fr';
}
