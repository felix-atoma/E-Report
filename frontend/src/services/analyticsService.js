import api from './api';

export const analyticsService = {
  overview: () => api.get('/analytics/overview'),
  paymentSummary: (params) => api.get('/analytics/payment-summary', { params }),
  reportStats: (params) => api.get('/analytics/report-stats', { params }),
};
