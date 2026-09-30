// Deux familles de sessions partagent la même procédure (fiches par matière, signature,
// palmarès, relevés) : les examens blancs (« essais ») et les devoirs surveillés.

export const DS_TYPE = 'DEVOIR_SURVEILLE';

export const DS_TYPE_CFG = {
  value: DS_TYPE,
  label: 'Devoir surveillé',
  full: 'Devoir surveillé (toutes classes)',
  color: '#0f766e', bg: '#f0fdfa', border: '#5eead4',
  icon: '🖊️',
  desc: 'Devoirs surveillés',
};

export const isDsType = (examType) => examType === DS_TYPE;

/** Filtre une liste de sessions selon la famille demandée par la page. */
export function filterByKind(exams, kind) {
  return (exams ?? []).filter((e) => (kind === 'DS' ? isDsType(e.examType) : !isDsType(e.examType)));
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
};
