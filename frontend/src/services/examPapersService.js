import api from './api';

// Épreuves : import du sujet (PDF / photos / Word) → transcription IA → correction → soumission
export const examPapersService = {
  // La transcription par l'IA peut prendre une à deux minutes : délai d'attente allongé
  create: (formData) => api.post('/exam-papers', formData, { timeout: 5 * 60 * 1000 }),
  list: (params) => api.get('/exam-papers', { params }),
  get: (id) => api.get(`/exam-papers/${id}`),
  update: (id, data) => api.patch(`/exam-papers/${id}`, data),
  submit: (id) => api.post(`/exam-papers/${id}/submit`),
  returnToAuthor: (id, comment) => api.post(`/exam-papers/${id}/return`, { comment }),
  markPrinted: (id) => api.post(`/exam-papers/${id}/printed`),
  delete: (id) => api.delete(`/exam-papers/${id}`),
  downloadDocx: (id) => api.get(`/exam-papers/${id}/docx`, { responseType: 'blob' }),
};

export const EXAM_PAPER_KINDS = [
  { value: 'DEVOIR_SURVEILLE', label: 'Devoir surveillé' },
  { value: 'COMPOSITION_MENSUELLE', label: 'Composition mensuelle' },
  { value: 'COMPOSITION_TRIMESTRIELLE', label: 'Composition trimestrielle' },
  { value: 'EXAMEN_BLANC', label: 'Examen blanc' },
];
export const kindLabel = (k) => EXAM_PAPER_KINDS.find((x) => x.value === k)?.label ?? k;

export const EXAM_PAPER_STATUS = {
  DRAFT: { label: 'Brouillon', color: '#475569', bg: '#f1f5f9' },
  SUBMITTED: { label: "Soumise à l'administration", color: '#1d4ed8', bg: '#eff6ff' },
  RETURNED: { label: 'À corriger', color: '#b45309', bg: '#fffbeb' },
  PRINTED: { label: 'Imprimée', color: '#15803d', bg: '#f0fdf4' },
};

/** Message d'erreur du serveur, lisible */
export function apiErrorMessage(err, fallback = 'Une erreur est survenue. Réessayez.') {
  const m = err?.response?.data?.message;
  return m ? [].concat(m).join(' · ') : fallback;
}

/** Télécharge la réponse binaire sous le nom donné par le serveur */
export function saveBlobResponse(res, fallbackName) {
  const cd = res.headers?.['content-disposition'] ?? '';
  const name = /filename="?([^";]+)"?/.exec(cd)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
