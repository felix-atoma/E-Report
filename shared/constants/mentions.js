export const MENTIONS = [
  { min: 18, max: 20,    fr: 'Excellent',     en: 'Excellent' },
  { min: 16, max: 17.99, fr: 'Très Bien',     en: 'Very Good' },
  { min: 14, max: 15.99, fr: 'Bien',          en: 'Good' },
  { min: 12, max: 13.99, fr: 'Assez Bien',    en: 'Fair' },
  { min: 10, max: 11.99, fr: 'Passable',      en: 'Pass' },
  { min: 0,  max: 9.99,  fr: 'Insuffisant',   en: 'Fail' },
];

export function getMention(average, lang = 'fr') {
  const m = MENTIONS.find((x) => average >= x.min && average <= x.max);
  return m ? m[lang] : '';
}
