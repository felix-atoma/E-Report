import api from './api';

export const subscriptionService = {
  // School admin
  getStatus:        ()     => api.get('/subscription/status'),
  initiateNotchpay: (data) => api.post('/subscription/notchpay', data),
  submitMomo:       (data) => api.post('/subscription/momo', data),
  getHistory:       ()     => api.get('/subscription/history'),

  // Superadmin
  getPending:       ()     => api.get('/superadmin/subscriptions/pending'),
  getAll:           ()     => api.get('/superadmin/subscriptions'),
  approve:          (id)   => api.post(`/superadmin/subscriptions/${id}/approve`),
  reject:           (id, reason) => api.post(`/superadmin/subscriptions/${id}/reject`, { reason }),
};
