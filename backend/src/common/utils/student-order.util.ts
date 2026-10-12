/**
 * Ordre alphabétique des élèves sur les fiches de notes : par nom, sans tenir compte des accents ni
 * des majuscules (« Ébo » avec les E, « adjo » avec les A) ; à nom égal, par matricule.
 * Un élève sans nom est classé par son matricule.
 */
export function byStudentName<T>(nameOf: (item: T) => { name?: string | null; admissionNumber?: string | null }) {
  return (a: T, b: T): number => {
    const sa = nameOf(a);
    const sb = nameOf(b);
    const na = (sa.name ?? sa.admissionNumber ?? '').trim();
    const nb = (sb.name ?? sb.admissionNumber ?? '').trim();
    return na.localeCompare(nb, 'fr', { sensitivity: 'base' })
      || (sa.admissionNumber ?? '').localeCompare(sb.admissionNumber ?? '', 'fr', { numeric: true });
  };
}
