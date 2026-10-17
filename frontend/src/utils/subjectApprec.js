import { appreciationOn20 } from './appreciation';

/**
 * Appréciation d'une note (sur 20) dans la langue de la matière — barème commun (utils/appreciation.js).
 * La langue est déduite de subject.nameFr, subject.nameEn ou subject.code.
 */
function detectLang(subject) {
  if (!subject) return 'fr';
  const hay = [subject.nameFr, subject.nameEn, subject.code]
    .filter(Boolean).join(' ').toLowerCase();

  if (/anglais|english|\bang\b|\beng\b/.test(hay)) return 'en';
  if (/allemand|deutsch|german|\ball\b|\bger\b|\bdeu\b/.test(hay)) return 'de';
  if (/espagnol|spanish|\besp\b|\bspa\b/.test(hay)) return 'es';
  if (/arabe|arabic|\bara\b/.test(hay)) return 'ar';
  if (/portugais|portuguese|\bpor\b/.test(hay)) return 'pt';
  if (/chinois|chinese|\bzh\b/.test(hay)) return 'zh';
  if (/italien|italian|\bit\b/.test(hay)) return 'it';
  return 'fr';
}

/**
 * @param {number|string|null} score  — note sur 20
 * @param {object|null}        subject — { nameFr, nameEn, code }
 * @returns {string} appréciation dans la langue de la matière, ou '' sans note
 */
export function subjectApprec(score, subject = null) {
  if (score == null || score === '') return '';
  const v = parseFloat(score);
  if (isNaN(v)) return '';
  return appreciationOn20(v, detectLang(subject));
}
