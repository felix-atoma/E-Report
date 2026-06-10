import api from './api';

export const analyticsService = {
  overview: () => api.get('/analytics/overview'),
  paymentSummary: (params) => api.get('/analytics/payment-summary', { params }),
  reportStats: (params) => api.get('/analytics/report-stats', { params }),
  classStats: (classId, academicYear, termNumber) =>
    api.get('/analytics/class-stats', { params: { classId, academicYear, termNumber } }),
  recordsSummary: () => api.get('/analytics/records-summary'),
  remindUnpaid: (academicYear) => api.post('/analytics/remind-unpaid', null, { params: { academicYear } }),
  atRisk: (academicYear) => api.get('/analytics/at-risk', { params: { academicYear } }),
};
