import api from './api';

export const studentsService = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  getReports: (studentId) => api.get(`/students/${studentId}/reports`),
  getPaymentStatus: (studentId, termId) =>
    api.get(`/students/${studentId}/payment-status`, { params: termId ? { termId } : {} }),
};
