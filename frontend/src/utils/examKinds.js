// Deux familles de sessions partagent la même procédure (fiches par matière, signature,
// palmarès, relevés) : les examens blancs (« essais ») et les devoirs surveillés.

export const DS_TYPE = 'DEVOIR_SURVEILLE';

export const DS_TYPE_CFG = {
  value: DS_TYPE,
  label: 'Devoir surveillé',
  full: 'Devoir surveillé — secondaire (6ème à Terminale), notes sur 20',
  color: '#0f766e', bg: '#f0fdfa', border: '#5eead4',
  icon: '🖊️',
  desc: 'Devoirs surveillés',
};

export const isDsType = (examType) => examType === DS_TYPE;

// Compositions mensuelles : primaire (CI → CM2), notes sur 10, même procédure que les DS
export const CM_TYPE = 'COMPOSITION_MENSUELLE';

export const CM_TYPE_CFG = {
  value: CM_TYPE,
  label: 'Composition mensuelle',
  full: 'Composition mensuelle — primaire (CI au CM2), notes sur 10',
  color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd',
  icon: '📒',
  desc: 'Compositions mensuelles',
};

export const isCmType = (examType) => examType === CM_TYPE;

/** Séances qui ne sont pas des examens : pas d'« admis / ajourné ». */
export const isNonExamType = (examType) => isDsType(examType) || isCmType(examType);

/** Barème des notes de la session : 10 pour les compositions mensuelles, 20 sinon. */
export const examScale = (examType) => (isCmType(examType) ? 10 : 20);

/** Note ramenée sur 20 (les seuils d'appréciation sont définis sur 20). */
export const to20 = (value, examType) => (value == null ? null : (value * 20) / examScale(examType));

/** Classes du primaire (CI → CM2) — même règle que le serveur. */
export const isPrimaryLevel = (level) => /^\s*(CI|CP\s*[12]?|CE\s*[12]|CM\s*[12])\s*$/i.test(level ?? '');
/** Classes du secondaire : 6ème → Terminale (devoirs surveillés). */
export const isSecondaryLevel = (level) =>
  /^\s*([3-6]\s*(e|è|eme|ème)|2\s*nde|seconde|1\s*(re|ere|ère)|premi[eè]re|tle|terminale)\s*$/i.test(level ?? '');

/** Types de sessions affichés par une page selon sa famille. */
export function typesForKind(kind, examTypes) {
  if (kind === 'DS') return [DS_TYPE_CFG];
  if (kind === 'CM') return [CM_TYPE_CFG];
  return examTypes;
}

/** Textes des pages selon la famille. */
export const KIND_TEXT = {
  ESSAI: {
    listTitle: 'Examens blancs',
    fichesTitle: 'Fiches de notes — Examens blancs',
    fichesSubtitle: 'Saisie des notes par matière et par professeur · CEPE · BEPC · BAC 1 · BAC 2',
    resultsTitle: 'Résultats des examens blancs',
    resultsSubtitle: 'Palmarès et relevés de notes par niveau · CEPE · BEPC · BAC 1 · BAC 2',
    empty: "Aucune session d'examen blanc créée.",
    listPath: '/teacher/mock-exams',
  },
  DS: {
    listTitle: 'Devoirs surveillés',
    listSubtitle: 'Créez un devoir surveillé par classe, puis chaque professeur saisit et signe les notes de sa matière',
    fichesTitle: 'Fiches de notes — Devoirs surveillés',
    fichesSubtitle: 'Saisie des notes des devoirs surveillés par matière et par professeur',
    resultsTitle: 'Résultats des devoirs surveillés',
    resultsSubtitle: 'Palmarès et relevés de notes des devoirs surveillés',
    empty: 'Aucun devoir surveillé créé.',
    listPath: '/teacher/devoirs-surveilles',
  },
  CM: {
    listTitle: 'Compositions mensuelles',
    listSubtitle: 'Primaire (CI au CM2) : créez une composition mensuelle par classe, puis chaque maître saisit et signe les notes sur 10',
    fichesTitle: 'Fiches de notes — Compositions mensuelles',
    fichesSubtitle: 'Saisie des notes des compositions mensuelles (sur 10) par matière',
    resultsTitle: 'Résultats des compositions mensuelles',
    resultsSubtitle: 'Palmarès et relevés de notes des compositions mensuelles (sur 10)',
    empty: 'Aucune composition mensuelle créée.',
    listPath: '/teacher/compositions-mensuelles',
  },
};
