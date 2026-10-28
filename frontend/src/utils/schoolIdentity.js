/**
 * Nom de l'établissement et directeur à afficher selon le cycle de la classe — même règle que le serveur
 * (backend/src/common/utils/school-identity.util.ts). Deux cycles sous un même compte : « École … » pour
 * le primaire, « Collège … » pour le secondaire, chacun avec son directeur et sa signature.
 */
const PRIMARY = /^\s*(CI|CP\s*[12]?|CE\s*[12]|CM\s*[12])\s*$/i;

export function schoolIdentity(branding, institutionName, level) {
  const b = branding ?? {};
  const primary = PRIMARY.test(level ?? '');
  const twoCycles = !!(b.schoolNamePrimary || b.directorSignaturePrimary || b.directorNamePrimary);
  if (primary && twoCycles) {
    return { primary, name: b.schoolNamePrimary || institutionName, directorSignature: b.directorSignaturePrimary || null, directorName: b.directorNamePrimary || null };
  }
  return { primary, name: (!primary && b.schoolNameSecondary) || institutionName, directorSignature: b.directorSignature || null, directorName: b.directorName || null };
}
