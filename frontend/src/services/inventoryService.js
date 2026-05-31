import api from './api';

export const inventoryService = {
  list: (params) => api.get('/inventory', { params }),
  summary: () => api.get('/inventory/summary'),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.patch(`/inventory/${id}`, data),
  remove: (id) => api.delete(`/inventory/${id}`),
};
