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
  getAnnualReport: (studentId, academicYear) => api.get('/reports/annual', { params: { studentId, academicYear } }),
};
