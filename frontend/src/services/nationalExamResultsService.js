import api from './api';

export const nationalExamResultsService = {
  list: (params) => api.get('/national-exam-results', { params }),
  summary: (params) => api.get('/national-exam-results/summary', { params }),
  listByStudent: (studentId) => api.get(`/national-exam-results/student/${studentId}`),
  upsert: (data) => api.post('/national-exam-results', data),
  remove: (id) => api.delete(`/national-exam-results/${id}`),
};
