import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Code imprimé (QR) sur la carte d'élève : identifiant de l'élève + empreinte signée avec le secret du
 * serveur. Impossible à fabriquer sans le secret ; la page publique de vérification le contrôle.
 */
const secret = () => process.env.JWT_SECRET || 'novabulletin-card';
const sign = (studentId: string) => createHmac('sha256', secret()).update(`card:${studentId}`).digest('base64url').slice(0, 12);

export function studentCardCode(studentId: string): string {
  return `${studentId.replace(/-/g, '')}.${sign(studentId)}`;
}

/** Identifiant de l'élève si le code est authentique, sinon null. */
export function parseStudentCardCode(code: string): string | null {
  const m = /^([0-9a-f]{32})\.([A-Za-z0-9_-]{12})$/.exec((code ?? '').trim());
  if (!m) return null;
  const hex = m[1];
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  const a = Buffer.from(sign(id)); const b = Buffer.from(m[2]);
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}
