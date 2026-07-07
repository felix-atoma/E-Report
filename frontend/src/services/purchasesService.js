import api from './api';

export const purchasesService = {
  list:    (params) => api.get('/purchases', { params }),
  summary: ()      => api.get('/purchases/summary'),
  create:  (data)  => api.post('/purchases', data),
  update:  (id, data) => api.patch(`/purchases/${id}`, data),
  remove:  (id)    => api.delete(`/purchases/${id}`),
};
