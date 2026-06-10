import api from './api';

export const paymentPlansService = {
  list: (params) => api.get('/payment-plans', { params }),
  get: (id) => api.get(`/payment-plans/${id}`),
  create: (data) => api.post('/payment-plans', data),
  payInstalment: (instalmentId, data) => api.post(`/payment-plans/instalments/${instalmentId}/pay`, data),
  delete: (id) => api.delete(`/payment-plans/${id}`),
};
