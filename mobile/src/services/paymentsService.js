import api from './api';

export const paymentsService = {
  getStudentStatus: (studentId, term) =>
    api.get(`/students/${studentId}/payment-status`, { params: { term } }),
  getHistory: (params) => api.get('/payments', { params }),
  getReceipt: (id) => api.get(`/payments/${id}/receipt`, { responseType: 'blob' }),
};
