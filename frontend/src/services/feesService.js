import api from './api';

export const feesService = {
  list: () => api.get('/fees'),
  create: (data) => api.post('/fees', data),
  update: (id, data) => api.patch(`/fees/${id}`, data),
  deactivate: (id) => api.delete(`/fees/${id}`),
  assignToClass: (feeId, data) => api.post(`/fees/${feeId}/assign-to-class`, data),
  getStudentSummary: (studentId, params) =>
    api.get(`/fees/student/${studentId}/summary`, { params }),
};
