import api from './api';

export const reportsService = {
  getAll: (params) => api.get('/reports', { params }),
  getById: (id) => api.get(`/reports/${id}`),
  create: (data) => api.post('/reports', data),
  update: (id, dto) => api.patch(`/reports/${id}`, dto),
  submit: (id) => api.patch(`/reports/${id}/submit`),
  publish: (id) => api.patch(`/reports/${id}/publish`),
  titulaireUpsert: (data) => api.put('/reports/titulaire', data),
  getAnnualReport: (studentId, academicYear) =>
    api.get('/reports/annual', { params: { studentId, academicYear } }),
};
