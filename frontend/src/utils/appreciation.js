/**
 * Barème des appréciations (seuils sur 20) — le même que celui du serveur
 * (backend/src/common/utils/appreciation.util.ts).
 *
 *   18 à 20      Excellent
 *   16 à 17,99   Très Bien
 *   14 à 15,99   Bien
 *   12 à 13,99   Assez Bien
 *   10 à 11,99   Passable
 *    8 à 9,99    Insuffisant
 *    0 à 7,99    Très Insuffisant
 */
export const APPRECIATION_THRESHOLDS = [18, 16, 14, 12, 10, 8];

export const APPRECIATION_LABELS = {
  fr: ['Excellent', 'Très Bien', 'Bien', 'Assez Bien', 'Passable', 'Insuffisant', 'Très Insuffisant'],
  en: ['Excellent', 'Very Good', 'Good', 'Fairly Good', 'Satisfactory', 'Insufficient', 'Very Poor'],
  de: ['Ausgezeichnet', 'Sehr gut', 'Gut', 'Befriedigend', 'Ausreichend', 'Ungenügend', 'Sehr ungenügend'],
  es: ['Excelente', 'Muy bien', 'Bien', 'Bastante bien', 'Suficiente', 'Insuficiente', 'Muy insuficiente'],
  ar: ['ممتاز', 'جيد جداً', 'جيد', 'مستحسن', 'مقبول', 'ضعيف', 'ضعيف جداً'],
  pt: ['Excelente', 'Muito bom', 'Bom', 'Satisfatório', 'Suficiente', 'Insuficiente', 'Muito insuficiente'],
  zh: ['优秀', '很好', '良好', '中等', '及格', '不及格', '很差'],
  it: ['Eccellente', 'Ottimo', 'Buono', 'Discreto', 'Sufficiente', 'Insufficiente', 'Gravemente insufficiente'],
};

/** Rang du niveau (0 = Excellent … 6 = Très Insuffisant) pour une note sur 20. */
export function appreciationLevel(score20) {
  const i = APPRECIATION_THRESHOLDS.findIndex((t) => score20 >= t);
  return i === -1 ? APPRECIATION_THRESHOLDS.length : i;
}

/** Appréciation d'une note ramenée sur 20, dans la langue demandée. */
export function appreciationOn20(score20, lang = 'fr') {
  const labels = APPRECIATION_LABELS[lang] ?? APPRECIATION_LABELS.fr;
  return labels[appreciationLevel(score20)];
}

/** Langue d'une matière d'après son nom (anglais, allemand, espagnol, arabe). */
export function subjectLangFromName(subjectName) {
  const n = (subjectName ?? '').toLowerCase();
  if (n.includes('anglais') || n.includes('english')) return 'en';
  if (n.includes('allemand') || n.includes('deutsch')) return 'de';
  if (n.includes('espagnol') || n.includes('español')) return 'es';
  if (n.includes('arabe') || n.includes('arabic')) return 'ar';
  return 'fr';
}

/** Couleurs des appréciations françaises (palmarès, grilles). */
export const APPRECIATION_COLORS = {
  'Excellent':        { color: '#6d28d9', bg: '#ede9fe' },
  'Très Bien':        { color: '#15803d', bg: '#dcfce7' },
  'Bien':             { color: '#1d4ed8', bg: '#dbeafe' },
  'Assez Bien':       { color: '#a16207', bg: '#fef3c7' },
  'Passable':         { color: '#b45309', bg: '#ffedd5' },
  'Insuffisant':      { color: '#b91c1c', bg: '#fee2e2' },
  'Très Insuffisant': { color: '#7f1d1d', bg: '#fecaca' },
};
