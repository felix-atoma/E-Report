import api from './api';

export const transfersService = {
  list: (params) => api.get('/transfers', { params }),
  create: (data) => api.post('/transfers', data),
  update: (id, data) => api.patch(`/transfers/${id}`, data),
  remove: (id) => api.delete(`/transfers/${id}`),
};
