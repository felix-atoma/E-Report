import api from './api';

export const incidentReportsService = {
  create: (data) => api.post('/incident-reports', data),
  list: (params) => api.get('/incident-reports', { params }),
  mine: () => api.get('/incident-reports/mine'),
  get: (id) => api.get(`/incident-reports/${id}`),
  updateStatus: (id, data) => api.patch(`/incident-reports/${id}/status`, data),
  delete: (id) => api.delete(`/incident-reports/${id}`),
};
