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
  getFicheData: (id) => api.get(`/mock-exams/${id}/fiche`),
  saveSubjectGrades: (id, subjectId, grades, coefficient) =>
    api.patch(`/mock-exams/${id}/fiche/${subjectId}`, { grades, coefficient }),
  signSubjectFiche: (id, subjectId) =>
    api.post(`/mock-exams/${id}/fiche/${subjectId}/sign`),
  unsignSubjectFiche: (id, subjectId) =>
    api.delete(`/mock-exams/${id}/fiche/${subjectId}/sign`),
  updateType: (id, examType) =>
    api.patch(`/mock-exams/${id}/type`, { examType }),
  updateDates: (id, examDate, examEndDate) =>
    api.patch(`/mock-exams/${id}/dates`, { examDate: examDate || null, examEndDate: examEndDate || null }),
};
