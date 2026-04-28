import api from './api';

export const bulletinsService = {
  list: () => api.get('/bulletins'),
  get: (id) => api.get(`/bulletins/${id}`),
  create: (data) => api.post('/bulletins', data),
  update: (id, data) => api.patch(`/bulletins/${id}`, data),
  publish: (id) => api.patch(`/bulletins/${id}/publish`),
  remove: (id) => api.delete(`/bulletins/${id}`),
};
