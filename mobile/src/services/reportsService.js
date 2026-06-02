import api from './api';

export const reportsService = {
  getAll: (params) => api.get('/reports', { params }),
  getById: (id) => api.get(`/reports/${id}`),
  getForStudent: (studentId) => api.get(`/students/${studentId}/reports`),
  update: (id, dto) => api.patch(`/reports/${id}`, dto),
  getDeliveryStatus: (id) => api.get(`/reports/${id}/delivery-status`),
  downloadPdf: (id) => api.get(`/reports/${id}/pdf`, { responseType: 'blob' }),
};
