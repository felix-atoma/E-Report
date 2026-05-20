/**
 * Returns the appreciation for a score, in the language of the subject.
 * Subject language is detected from subject.nameFr, subject.nameEn, or subject.code.
 */

const APPRECIATIONS = {
  fr: (v) => {
    if (v >= 16) return 'Très Bien';
    if (v >= 14) return 'Bien';
    if (v >= 12) return 'Assez Bien';
    if (v >= 10) return 'Passable';
    return 'Insuffisant';
  },
  en: (v) => {
    if (v >= 16) return 'Excellent';
    if (v >= 14) return 'Very Good';
    if (v >= 12) return 'Good';
    if (v >= 10) return 'Fair';
    return 'Insufficient';
  },
  de: (v) => {
    if (v >= 16) return 'Sehr gut';
    if (v >= 14) return 'Gut';
    if (v >= 12) return 'Befriedigend';
    if (v >= 10) return 'Ausreichend';
    return 'Ungenügend';
  },
  es: (v) => {
    if (v >= 16) return 'Sobresaliente';
    if (v >= 14) return 'Notable';
    if (v >= 12) return 'Bien';
    if (v >= 10) return 'Suficiente';
    return 'Insuficiente';
  },
  ar: (v) => {
    if (v >= 16) return 'ممتاز';
    if (v >= 14) return 'جيد جداً';
    if (v >= 12) return 'جيد';
    if (v >= 10) return 'مقبول';
    return 'ضعيف';
  },
  pt: (v) => {
    if (v >= 16) return 'Excelente';
    if (v >= 14) return 'Bom';
    if (v >= 12) return 'Suficiente';
    if (v >= 10) return 'Regular';
    return 'Insuficiente';
  },
  zh: (v) => {
    if (v >= 16) return '优秀';
    if (v >= 14) return '良好';
    if (v >= 12) return '一般';
    if (v >= 10) return '及格';
    return '不及格';
  },
  it: (v) => {
    if (v >= 16) return 'Ottimo';
    if (v >= 14) return 'Buono';
    if (v >= 12) return 'Discreto';
    if (v >= 10) return 'Sufficiente';
    return 'Insufficiente';
  },
};

// Detect the teaching language from the subject's name or code
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
 * @param {number|string|null} score  — raw score value
 * @param {object|null}        subject — { nameFr, nameEn, code }
 * @returns {string} appreciation in the subject's language, or '' if no score
 */
export function subjectApprec(score, subject = null) {
  if (score == null || score === '') return '';
  const v = parseFloat(score);
  if (isNaN(v)) return '';
  const lang = detectLang(subject);
  return (APPRECIATIONS[lang] ?? APPRECIATIONS.fr)(v);
}
