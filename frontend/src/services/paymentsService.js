import api from './api';

export const paymentsService = {
  list: (params) => api.get('/payments', { params }),
  get: (id) => api.get(`/payments/${id}`),
  record: (data) => api.post('/payments', data),
  getStudentStatus: (studentId, params) =>
    api.get(`/payments/student/${studentId}/status`, { params }),
  myHistory: () => api.get('/payments/my-history'),
  initiateMomo: (data) => api.post('/payments/initiate-momo', data),
  receipt: (id) => api.get(`/payments/${id}/receipt`, { responseType: 'arraybuffer' }),
};
