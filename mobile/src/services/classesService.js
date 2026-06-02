import api from './api';

export const classesService = {
  getAll: () => api.get('/classes'),
  getById: (id) => api.get(`/classes/${id}`),
};
