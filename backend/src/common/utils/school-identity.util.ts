/**
 * Nom de l'établissement et directeur à imprimer selon le cycle de la classe. Une école peut avoir deux
 * cycles sous un même compte (ex. « École St Pierre Claver » pour le primaire, « Collège St Pierre Claver »
 * pour le secondaire), chacun avec son directeur et sa signature (réglés dans « Signature du directeur »).
 * Sans réglage propre au primaire : un seul nom et un seul directeur pour toute l'école.
 */
const PRIMARY = /^\s*(CI|CP\s*[12]?|CE\s*[12]|CM\s*[12])\s*$/i;

export function schoolIdentity(branding: unknown, institutionName: string, level?: string | null) {
  const b = (branding as Record<string, any>) ?? {};
  const primary = PRIMARY.test(level ?? '');
  const twoCycles = !!(b.schoolNamePrimary || b.directorSignaturePrimary || b.directorNamePrimary);
  if (primary && twoCycles) {
    return {
      primary, name: (b.schoolNamePrimary as string) || institutionName,
      directorSignature: (b.directorSignaturePrimary as string) || null, directorName: (b.directorNamePrimary as string) || null,
    };
  }
  return {
    primary, name: (!primary && (b.schoolNameSecondary as string)) || institutionName,
    directorSignature: (b.directorSignature as string) || null, directorName: (b.directorName as string) || null,
  };
}
