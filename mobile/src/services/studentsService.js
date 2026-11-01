import api from './api';

export const studentsService = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  me: () => api.get('/students/me'),
  myChildren: () => api.get('/students/my-children'),
};
