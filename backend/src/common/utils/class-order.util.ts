/**
 * Ordre croissant des classes, du plus petit niveau au plus grand :
 * CI → CP (CP1, CP2) → CE1 → CE2 → CM1 → CM2 → 6e → 5e → 4e → 3e → 2nde → 1ère → Terminale.
 * Calculé à partir du niveau (et, à défaut, du nom) de la classe ; niveau inconnu → à la fin.
 */
export function levelRank(level?: string | null, name?: string | null): number {
  const rank = (raw: string): number | null => {
    const l = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s\-_.]/g, '');
    if (!l) return null;
    if (/^(ci|clos|maternelle|grandesection|gs)/.test(l)) return 1;
    if (/^cp2/.test(l)) return 3;
    if (/^cp/.test(l)) return 2; // CP, CP1
    if (/^ce1/.test(l)) return 4;
    if (/^ce2/.test(l)) return 5;
    if (/^cm1/.test(l)) return 6;
    if (/^cm2/.test(l)) return 7;
    if (/^(6|six)/.test(l)) return 8;
    if (/^(5|cinq)/.test(l)) return 9;
    if (/^(4|quat)/.test(l)) return 10;
    if (/^(3|trois)/.test(l)) return 11;
    if (/^(2|seconde)/.test(l)) return 12;
    if (/^(1|premi)/.test(l)) return 13;
    if (/^(terminale|tle|term)/.test(l)) return 14;
    return null;
  };
  return rank(level ?? '') ?? rank(name ?? '') ?? 50;
}

const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });

/** Tri : année la plus récente d'abord, puis niveau croissant, puis nom (« Seconde L » avant « Seconde S », « Cp1 » avant « Cp2 »). */
export function compareClasses(
  a: { level?: string | null; name: string; academicYear?: string | null },
  b: { level?: string | null; name: string; academicYear?: string | null },
): number {
  const year = (b.academicYear ?? '').localeCompare(a.academicYear ?? '');
  if (year) return year;
  return levelRank(a.level, a.name) - levelRank(b.level, b.name) || collator.compare(a.name.trim(), b.name.trim());
}
