import api from './api';

export const libraryService = {
  list: (params) => api.get('/library', { params }),
  listByStudent: (studentId) => api.get(`/library/student/${studentId}`),
  create: (data) => api.post('/library', data),
  returnLoan: (id, conditionIn) => api.patch(`/library/${id}/return`, { conditionIn }),
  remove: (id) => api.delete(`/library/${id}`),
};
