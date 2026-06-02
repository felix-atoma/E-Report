import api from './api';

export const paymentsService = {
  getAll: (params) => api.get('/payments', { params }),
  record: (data) => api.post('/payments', data),
  getStudentStatus: (studentId, params) =>
    api.get(`/payments/student/${studentId}/status`, { params }),
  myHistory: () => api.get('/payments/my-history'),
  getHistory: (params) => api.get('/payments', { params }),
  getReceipt: (id) => api.get(`/payments/${id}/receipt`, { responseType: 'blob' }),
};
