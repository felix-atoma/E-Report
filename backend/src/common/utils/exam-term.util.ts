import { resolveTermRange } from '../../modules/attendance/attendance.service';

/**
 * Trimestre d'une session (devoir surveillé…) : d'abord son nom (« … du premier trimestre », « DS 2e trimestre »),
 * sinon sa date comparée aux dates des trimestres (Paramètres), sinon la date du jour.
 */
export function examTermNumber(
  exam: { label?: string | null; examDate?: Date | null; academicYear: string },
  academicSettings?: unknown,
): number {
  const label = (exam.label ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const near = (re: string) => new RegExp(`(${re})\\s*(trimestre|semestre)|(trimestre|semestre)\\s*(${re})\\b`).test(label);
  if (near('troisieme|3e|3eme|3')) return 3;
  if (near('deuxieme|second|seconde|2e|2eme|2nd|2')) return 2;
  if (near('premier|premiere|1er|1re|1ere|1')) return 1;
  const when = exam.examDate ? new Date(exam.examDate) : new Date();
  for (const n of [1, 2, 3]) {
    const range = resolveTermRange(academicSettings, exam.academicYear, 'TRIMESTRE', n);
    if (range && when >= range.start && when <= range.end) return n;
  }
  return 1;
}
