import api from './api';

export const mockExamsService = {
  list: (params) => api.get('/mock-exams', { params }),
  create: (data) => api.post('/mock-exams', data),
  getGradeSheet: (id) => api.get(`/mock-exams/${id}/grade-sheet`),
  saveGrades: (id, grades) => api.patch(`/mock-exams/${id}/grades`, { grades }),
  publish: (id) => api.patch(`/mock-exams/${id}/publish`),
  unpublish: (id) => api.patch(`/mock-exams/${id}/unpublish`),
  delete: (id) => api.delete(`/mock-exams/${id}`),
  getReleve: (id, studentId) =>
    api.get(`/mock-exams/${id}/releve`, { params: studentId ? { studentId } : {} }),
  getPalmares: (id) => api.get(`/mock-exams/${id}/palmares`),
  // Relevés en PDF (même charte que les bulletins) : un élève, ou toute la classe en ZIP
  downloadRelevePdf: (id, studentId) =>
    api.get(`/mock-exams/${id}/releve/pdf`, { params: { studentId }, responseType: 'blob' }),
  downloadReleveZip: (id) =>
    api.get(`/mock-exams/${id}/releve/zip`, { responseType: 'blob', timeout: 10 * 60 * 1000 }),
  getFicheData: (id) => api.get(`/mock-exams/${id}/fiche`),
  saveSubjectGrades: (id, subjectId, grades, coefficient) =>
    api.patch(`/mock-exams/${id}/fiche/${subjectId}`, { grades, coefficient }),
  // Signature manuscrite (image PNG) obligatoire pour le professeur, comme les fiches trimestrielles
  signSubjectFiche: (id, subjectId, signatureData) =>
    api.post(`/mock-exams/${id}/fiche/${subjectId}/sign`, { signatureData: signatureData ?? null }),
  unsignSubjectFiche: (id, subjectId) =>
    api.delete(`/mock-exams/${id}/fiche/${subjectId}/sign`),
  updateType: (id, examType) =>
    api.patch(`/mock-exams/${id}/type`, { examType }),
  updateDates: (id, examDate, examEndDate) =>
    api.patch(`/mock-exams/${id}/dates`, { examDate: examDate || null, examEndDate: examEndDate || null }),
};
