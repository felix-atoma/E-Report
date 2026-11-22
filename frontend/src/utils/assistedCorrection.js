export function normalizeAnswer(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function gradeResponse(question, response) {
  const answer = normalizeAnswer(response);
  if (!answer) return null;

  const points = Number(question.points) || 0;
  if (question.type === 'written') {
    const keywords = (question.keywords || '')
      .split(/[,;\n]/)
      .map(normalizeAnswer)
      .filter(Boolean);
    if (!keywords.length) return null;
    const matched = keywords.filter((keyword) => ` ${answer} `.includes(` ${keyword} `));
    return {
      score: Math.round((points * matched.length / keywords.length) * 100) / 100,
      source: 'local',
      feedback: `Repérage local : ${matched.length}/${keywords.length} mot(s)-clé(s). À vérifier par l’enseignant.`,
      needsReview: true,
    };
  }

  const accepted = [question.answer, ...(question.alternatives || '').split(/[,;\n]/)]
    .map(normalizeAnswer)
    .filter(Boolean);
  return {
    score: accepted.includes(answer) ? points : 0,
    source: 'local',
    feedback: accepted.includes(answer) ? 'Réponse reconnue par comparaison locale.' : 'Réponse différente du corrigé.',
    needsReview: false,
  };
}

const DB_NAME = 'ereport-assisted-correction';
const DB_VERSION = 1;
const ASSESSMENTS = 'assessments';
const SUBMISSIONS = 'submissions';

function openDb() {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('Le stockage local sécurisé n’est pas disponible sur cet appareil.'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ASSESSMENTS)) db.createObjectStore(ASSESSMENTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(SUBMISSIONS)) db.createObjectStore(SUBMISSIONS, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeRequest(storeName, mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function reserveAiCall(ownerId, assessmentId) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(ASSESSMENTS, 'readwrite');
    const store = transaction.objectStore(ASSESSMENTS);
    const request = store.get(assessmentId);
    let updatedAssessment;
    let unavailable = false;
    request.onsuccess = () => {
      const assessment = request.result;
      if (!assessment || assessment.ownerId !== ownerId || assessment.aiCallsUsed >= assessment.aiCallLimit) {
        unavailable = true;
        transaction.abort();
        return;
      }
      updatedAssessment = { ...assessment, aiCallsUsed: assessment.aiCallsUsed + 1 };
      store.put(updatedAssessment);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => resolve(updatedAssessment);
    transaction.onabort = () => unavailable ? resolve(null) : reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  }));
}

async function listOwned(storeName, ownerId) {
  const rows = await storeRequest(storeName, 'readonly', (store) => store.getAll());
  return rows.filter((row) => row.ownerId === ownerId);
}

export const assistedCorrectionStore = {
  listAssessments: (ownerId) => listOwned(ASSESSMENTS, ownerId),
  saveAssessment: (assessment) => storeRequest(ASSESSMENTS, 'readwrite', (store) => store.put(assessment)),
  listSubmissions: (ownerId, assessmentId) =>
    listOwned(SUBMISSIONS, ownerId).then((rows) => rows.filter((row) => row.assessmentId === assessmentId)),
  saveSubmission: (submission) => storeRequest(SUBMISSIONS, 'readwrite', (store) => store.put(submission)),
  reserveAiCall,
};
