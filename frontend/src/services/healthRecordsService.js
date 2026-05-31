import api from './api';

export const healthRecordsService = {
  list: (params) => api.get('/health-records', { params }),
  listByStudent: (studentId) => api.get(`/health-records/student/${studentId}`),
  create: (data) => api.post('/health-records', data),
  update: (id, data) => api.patch(`/health-records/${id}`, data),
  remove: (id) => api.delete(`/health-records/${id}`),
};
