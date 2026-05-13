import api from './api';

export const usersService = {
  list: () => api.get('/users'),
  listTeachers: () => api.get('/users/teachers'),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  uploadAvatar: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/users/${id}/avatar`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deactivate: (id) => api.patch(`/users/${id}/deactivate`),
  activate: (id) => api.patch(`/users/${id}/activate`),
  delete: (id) => api.delete(`/users/${id}`),
};
