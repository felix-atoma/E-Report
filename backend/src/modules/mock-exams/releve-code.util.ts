import { createHmac } from 'crypto';

/**
 * Code de vérification d'un relevé (imprimé et encodé dans le QR code) : « R-XXXXXXXX-YYYYYYYY-SSSSSS ».
 * XXXXXXXX / YYYYYYYY : début des identifiants de la session et de l'élève ; SSSSSS : signature
 * (HMAC) qui empêche de fabriquer un code valide. Rien n'est stocké : le code se recalcule.
 */
const secret = () => process.env.JWT_SECRET || 'novabulletin-releve';

function signature(examId: string, studentId: string): string {
  return createHmac('sha256', secret()).update(`releve:${examId}:${studentId}`).digest('hex').slice(0, 6).toUpperCase();
}

export function releveCode(examId: string, studentId: string): string {
  return `R-${examId.slice(0, 8).toUpperCase()}-${studentId.slice(0, 8).toUpperCase()}-${signature(examId, studentId)}`;
}

/** Préfixes des identifiants contenus dans le code, ou null si le format est invalide. */
export function parseReleveCode(code: string): { examPrefix: string; studentPrefix: string } | null {
  const m = /^R-([0-9A-F]{8})-([0-9A-F]{8})-([0-9A-F]{6})$/.exec((code ?? '').trim().toUpperCase());
  return m ? { examPrefix: m[1].toLowerCase(), studentPrefix: m[2].toLowerCase() } : null;
}

/** Le code correspond-il bien à cette session et à cet élève ? */
export function releveCodeMatches(code: string, examId: string, studentId: string): boolean {
  return (code ?? '').trim().toUpperCase() === releveCode(examId, studentId);
}
