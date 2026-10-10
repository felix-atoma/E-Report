/**
 * Numéros des parents au format international (+228…). Un numéro saisi sans indicatif reçoit celui du
 * pays de l'école (Paramètres → pays) ; sans pays reconnu, le Togo (comportement historique).
 * Un numéro écrit avec « + » ou « 00 » est gardé tel quel.
 */
interface CountryRule {
  code: string;
  /** Longueurs possibles du numéro national (sans indicatif ni 0 initial à retirer) */
  lengths: number[];
  /** Le 0 initial est un préfixe national à retirer (Ghana 024… → +23324…) */
  trunkZero?: boolean;
}

const RULES: { match: RegExp; rule: CountryRule }[] = [
  { match: /togo/, rule: { code: '228', lengths: [8] } },
  { match: /benin/, rule: { code: '229', lengths: [8, 10] } },          // 10 chiffres (01…) depuis 2024
  { match: /ivoire|\bci\b/, rule: { code: '225', lengths: [10] } },
  { match: /senegal/, rule: { code: '221', lengths: [9] } },
  { match: /burkina/, rule: { code: '226', lengths: [8] } },
  { match: /\bmali\b/, rule: { code: '223', lengths: [8] } },
  { match: /niger(?!ia)/, rule: { code: '227', lengths: [8] } },
  { match: /guinee(?!.*(bissau|equatoriale))/, rule: { code: '224', lengths: [9] } },
  { match: /cameroun|cameroon/, rule: { code: '237', lengths: [9] } },
  { match: /gabon/, rule: { code: '241', lengths: [8] } },
  { match: /tchad|chad/, rule: { code: '235', lengths: [8] } },
  { match: /centrafrique|central african/, rule: { code: '236', lengths: [8] } },
  { match: /rdc|democratique|kinshasa|\bdrc\b/, rule: { code: '243', lengths: [9], trunkZero: true } },
  { match: /congo/, rule: { code: '242', lengths: [9] } },
  { match: /ghana/, rule: { code: '233', lengths: [9], trunkZero: true } },
  { match: /nigeria/, rule: { code: '234', lengths: [10], trunkZero: true } },
  { match: /madagascar/, rule: { code: '261', lengths: [9], trunkZero: true } },
];

const TOGO = RULES[0].rule;

/** Règle du pays de l'école (« Togo », « République du Bénin », « Côte d'Ivoire », « Ghana »…). */
export function countryRule(country?: string | null): CountryRule {
  const key = (country ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return (key && RULES.find((r) => r.match.test(key))?.rule) || TOGO;
}

/** +indicatif et chiffres, ou null si le numéro est inutilisable. */
export function toE164(phone: string | null | undefined, country?: string | null): string | null {
  let digits = (phone ?? '').replace(/^whatsapp:/, '').replace(/[\s\-().]/g, '');
  const international = digits.startsWith('+') || digits.startsWith('00');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  if (!/^\d+$/.test(digits)) return null;

  if (!international) {
    const rule = countryRule(country);
    const national = rule.trunkZero && digits.startsWith('0') ? digits.slice(1) : digits;
    if (rule.lengths.includes(national.length)) digits = `${rule.code}${national}`;
  }
  return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null;
}
