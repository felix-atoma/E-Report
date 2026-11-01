import api from './api';

export const mockExamsService = {
  list:               (params)             => api.get('/mock-exams', { params }),
  create:             (data)               => api.post('/mock-exams', data),
  // Le serveur n'a pas de route « une session » : on la prend dans la liste (déjà limitée aux classes du professeur)
  get: async (id) => {
    const res = await api.get('/mock-exams');
    const exam = (res.data?.data ?? []).find((e) => e.id === id) ?? null;
    return { ...res, data: { ...res.data, data: exam } };
  },
  getGradeSheet:      (id)                 => api.get(`/mock-exams/${id}/grade-sheet`),
  saveGrades:         (id, grades)         => api.patch(`/mock-exams/${id}/grades`, { grades }),
  getFicheData:       (id)                 => api.get(`/mock-exams/${id}/fiche`),
  saveSubjectGrades:  (id, subjectId, data) => api.patch(`/mock-exams/${id}/fiche/${subjectId}`, data),
  // Signature manuscrite obligatoire pour le professeur (image PNG en data URL)
  signFiche:          (id, subjectId, signatureData) => api.post(`/mock-exams/${id}/fiche/${subjectId}/sign`, { signatureData }),
  unsignFiche:        (id, subjectId)      => api.delete(`/mock-exams/${id}/fiche/${subjectId}/sign`),
  getPalmares:        (id)                 => api.get(`/mock-exams/${id}/palmares`),
  getReleve:          (id, studentId)      => api.get(`/mock-exams/${id}/releve`, { params: studentId ? { studentId } : {} }),
  publish:            (id)                 => api.patch(`/mock-exams/${id}/publish`),
  unpublish:          (id)                 => api.patch(`/mock-exams/${id}/unpublish`),
  remove:             (id)                 => api.delete(`/mock-exams/${id}`),
};
