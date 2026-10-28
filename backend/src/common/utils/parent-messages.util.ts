/**
 * Messages envoyés aux parents (WhatsApp / SMS) : toujours en français PUIS en anglais dans le même
 * message, avec le nom du parent. Mise en forme WhatsApp (*gras*) ; pour un SMS, utiliser `toSmsText`.
 */
const EN_MENTION: Record<string, string> = {
  'excellent': 'Excellent', 'très bien': 'Very good', 'tres bien': 'Very good', 'bien': 'Good', 'assez bien': 'Fairly good',
  'passable': 'Satisfactory', 'insuffisant': 'Insufficient', 'très insuffisant': 'Very insufficient', 'tres insuffisant': 'Very insufficient',
};
const enMention = (m: string) => EN_MENTION[(m ?? '').trim().toLowerCase()] ?? m;
const enTerm = (t: string) => {
  const n = /(\d)/.exec(t ?? '')?.[1];
  if (!n) return t;
  const ord = n === '1' ? '1st' : n === '2' ? '2nd' : n === '3' ? '3rd' : `${n}th`;
  return /semestre|semester/i.test(t) ? `${ord} semester` : `${ord} term`;
};
const frMoney = (v: number, cur = 'FCFA') => `${Math.round(v).toLocaleString('fr-FR').replace(/ | /g, ' ')} ${cur}`;
const enMoney = (v: number, cur = 'FCFA') => `${Math.round(v).toLocaleString('en-GB')} ${cur}`;

/** « Bonjour M. X, » / « Hello Mr X, » — sans nom (ou nom générique) : « Cher parent, » / « Dear parent, » */
function greet(parentName?: string | null) {
  const n = (parentName ?? '').trim();
  if (!n || /^parent( de)?\b/i.test(n)) return { fr: 'Cher parent,', en: 'Dear parent,' };
  // Civilité en anglais : M. → Mr, Mme → Mrs, Mlle → Miss
  const enName = n.replace(/^M\.\s*/i, 'Mr ').replace(/^Mme\.?\s*/i, 'Mrs ').replace(/^Mlle\.?\s*/i, 'Miss ');
  return { fr: `Bonjour ${n},`, en: `Hello ${enName},` };
}

const join = (fr: string[], en: string[], school: string) => [...fr, '', ...en, '', `🏫 ${school}`].join('\n');

/** Version SMS : sans gras, sans emojis (un emoji rend le SMS plus cher), sur une seule ligne. */
export function toSmsText(message: string): string {
  const clean = message
    .replace(/\*/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, '');
  // Chaque ligne devient une phrase (point ajouté si besoin) ; les blocs français / anglais séparés par « | »
  return clean.split(/\n{2,}/).map((block) => block.split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean)
    // Pas de point après un lien (il casserait le lien sur certains téléphones)
    .map((l) => (/[.,:;!?]$/.test(l) || /https?:\/\/\S+$/.test(l) ? l : `${l}.`)).join(' '))
    .filter(Boolean).join(' | ');
}

export function bulletinMessage(p: {
  parentName?: string | null; studentName: string; termName: string; academicYear: string;
  average: string; mention: string; pdfUrl: string | null; school: string;
}) {
  const g = greet(p.parentName);
  const fr = [g.fr, `📋 *Bulletin disponible — ${p.termName} ${p.academicYear}*`, `📚 Élève : ${p.studentName}`,
    `📊 Moyenne : ${p.average}  |  Mention : ${p.mention}`,
    p.pdfUrl ? `📥 Télécharger : ${p.pdfUrl}` : '⚠️ Bulletin retenu — veuillez régulariser les frais scolaires.'];
  const en = [g.en, `📋 *Report card available — ${enTerm(p.termName)} ${p.academicYear}*`, `📚 Student: ${p.studentName}`,
    `📊 Average: ${String(p.average).replace(',', '.')}  |  Grade: ${enMention(p.mention)}`,
    p.pdfUrl ? `📥 Download: ${p.pdfUrl}` : '⚠️ Report card on hold — please settle outstanding school fees.'];
  return join(fr, en, p.school);
}

export function receiptMessage(p: {
  parentName?: string | null; school: string; studentName: string; amount: number; currency?: string;
  date: Date; receiptNumber: string; academicYear: string; balance: number;
}) {
  const g = greet(p.parentName);
  const cur = p.currency ?? 'FCFA';
  const fr = [g.fr, `✅ *Paiement reçu — ${p.school}*`,
    `${frMoney(p.amount, cur)} pour ${p.studentName} le ${p.date.toLocaleDateString('fr-FR')}.`, `Reçu n° ${p.receiptNumber}`,
    p.balance > 0 ? `Solde restant ${p.academicYear} : ${frMoney(p.balance, cur)}.` : `Les frais ${p.academicYear} sont entièrement réglés. Merci !`];
  const en = [g.en, `✅ *Payment received — ${p.school}*`,
    `${enMoney(p.amount, cur)} for ${p.studentName} on ${p.date.toLocaleDateString('en-GB')}.`, `Receipt no. ${p.receiptNumber}`,
    p.balance > 0 ? `Remaining balance for ${p.academicYear}: ${enMoney(p.balance, cur)}.` : `School fees for ${p.academicYear} are fully paid. Thank you!`];
  return join(fr, en, p.school);
}

export function feeReminderMessage(p: {
  severity: 'FRIENDLY' | 'URGENT'; parentName?: string | null; studentName: string; balance: number; currency?: string; school: string;
}) {
  const g = greet(p.parentName);
  const cur = p.currency ?? 'FCFA';
  if (p.severity === 'URGENT') {
    return join(
      ['⚠️ *AVIS IMPORTANT*', g.fr,
        `Les frais scolaires de *${p.studentName}* restent impayés (*${frMoney(p.balance, cur)}*) depuis plus de deux mois.`,
        "Sans régularisation rapide, l'établissement se réserve le droit d'exclure l'élève conformément à son règlement intérieur.",
        'Merci de régulariser la situation dans les plus brefs délais.'],
      ['⚠️ *IMPORTANT NOTICE*', g.en,
        `School fees for *${p.studentName}* remain unpaid (*${enMoney(p.balance, cur)}*) for more than two months.`,
        'Without prompt payment, the school reserves the right to exclude the student in accordance with its internal regulations.',
        'Please settle this matter urgently.'],
      p.school,
    );
  }
  return join(
    [g.fr, `Nous vous rappelons amicalement que les frais scolaires de *${p.studentName}* ne sont pas encore réglés (*${frMoney(p.balance, cur)}* restant).`,
      'Merci de procéder au paiement dans les meilleurs délais.'],
    [g.en, `This is a friendly reminder that school fees for *${p.studentName}* have not yet been settled (*${enMoney(p.balance, cur)}* outstanding).`,
      'Please make payment as soon as possible.'],
    p.school,
  );
}

export function heldBulletinMessage(p: { parentName?: string | null; studentName: string; outstanding: number; currency?: string; school: string }) {
  const g = greet(p.parentName);
  const cur = p.currency ?? 'FCFA';
  return join(
    [g.fr, `Le bulletin de *${p.studentName}* est retenu pour frais impayés${p.outstanding > 0 ? ` (*${frMoney(p.outstanding, cur)}*)` : ''}.`,
      "Merci de régulariser auprès de l'administration de l'école pour le recevoir."],
    [g.en, `*${p.studentName}*'s report card is on hold due to unpaid fees${p.outstanding > 0 ? ` (*${enMoney(p.outstanding, cur)}*)` : ''}.`,
      'Please settle with the school office to receive it.'],
    p.school,
  );
}
