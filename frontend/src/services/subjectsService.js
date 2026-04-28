import api from './api';

export const subjectsService = {
  list: () => api.get('/subjects'),
  get: (id) => api.get(`/subjects/${id}`),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.patch(`/subjects/${id}`, data),
  deactivate: (id) => api.delete(`/subjects/${id}`),
};
