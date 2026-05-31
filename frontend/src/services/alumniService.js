import api from './api';

export const alumniService = {
  list: (params) => api.get('/alumni', { params }),
  upsert: (data) => api.post('/alumni', data),
  findByStudent: (studentId) => api.get(`/alumni/${studentId}`),
  remove: (studentId) => api.delete(`/alumni/${studentId}`),
};
