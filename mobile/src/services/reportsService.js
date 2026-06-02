import api from './api';

export const reportsService = {
  getAll: (params) => api.get('/reports', { params }),
  getById: (id) => api.get(`/reports/${id}`),
  create: (data) => api.post('/reports', data),
  update: (id, dto) => api.patch(`/reports/${id}`, dto),
  submit: (id) => api.patch(`/reports/${id}/submit`),
  publish: (id) => api.patch(`/reports/${id}/publish`),
  titulaireUpsert: (data) => api.put('/reports/titulaire', data),
  getForStudent: (studentId) => api.get(`/students/${studentId}/reports`),
  getAnnualReport: (studentId, academicYear) =>
    api.get('/reports/annual', { params: { studentId, academicYear } }),
  getDeliveryStatus: (id) => api.get(`/reports/${id}/delivery-status`),
  downloadPdf: (id) => api.get(`/reports/${id}/pdf`, { responseType: 'blob' }),
};
