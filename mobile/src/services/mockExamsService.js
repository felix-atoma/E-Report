import api from './api';

export const mockExamsService = {
  list:               (params)             => api.get('/mock-exams', { params }),
  create:             (data)               => api.post('/mock-exams', data),
  get:                (id)                 => api.get(`/mock-exams/${id}`),
  getGradeSheet:      (id)                 => api.get(`/mock-exams/${id}/grade-sheet`),
  saveGrades:         (id, grades)         => api.patch(`/mock-exams/${id}/grades`, { grades }),
  getFicheData:       (id)                 => api.get(`/mock-exams/${id}/fiche`),
  saveSubjectGrades:  (id, subjectId, data) => api.patch(`/mock-exams/${id}/fiche/${subjectId}`, data),
  signFiche:          (id, subjectId)      => api.post(`/mock-exams/${id}/fiche/${subjectId}/sign`),
  unsignFiche:        (id, subjectId)      => api.delete(`/mock-exams/${id}/fiche/${subjectId}/sign`),
  getPalmares:        (id)                 => api.get(`/mock-exams/${id}/palmares`),
  getReleve:          (id, studentId)      => api.get(`/mock-exams/${id}/releve`, { params: studentId ? { studentId } : {} }),
  publish:            (id)                 => api.patch(`/mock-exams/${id}/publish`),
  unpublish:          (id)                 => api.patch(`/mock-exams/${id}/unpublish`),
  remove:             (id)                 => api.delete(`/mock-exams/${id}`),
};
