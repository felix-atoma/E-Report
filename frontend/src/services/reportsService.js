import api from './api';

export const reportsService = {
  list: (params) => api.get('/reports', { params }),
  get: (id) => api.get(`/reports/${id}`),
  create: (data) => api.post('/reports', data),
  update: (id, data) => api.patch(`/reports/${id}`, data),
  submit: (id) => api.patch(`/reports/${id}/submit`),
  publish: (id) => api.patch(`/reports/${id}/publish`),
  regeneratePdf: (id) => api.post(`/reports/${id}/pdf`),
  titulaireUpsert: (data) => api.put('/reports/titulaire', data),
  bulkZip: (dto) => api.post('/reports/bulk-zip', dto, { responseType: 'blob' }),
  bulkPublish: (dto) => api.post('/reports/bulk-publish', dto),
  classStatus: (params) => api.get('/reports/class-status', { params }),
  aiComment: (id) => api.post(`/reports/${id}/ai-comment`),
  getAnnualReport: (studentId, academicYear) => api.get('/reports/annual', { params: { studentId, academicYear } }),
  // Décision du conseil (bulletin de la dernière période) ; decision vide = revenir à la décision proposée
  setCouncilDecision: (reportId, decision) => api.patch(`/reports/${reportId}/council-decision`, { decision }),
  palmares: (params) => api.get('/reports/palmares', { params }),
};
