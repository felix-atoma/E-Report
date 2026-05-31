import api from './api';

export const schoolDocumentsService = {
  list:   (params) => api.get('/school-documents', { params }),
  create: (data)   => api.post('/school-documents', data),
  update: (id, data) => api.patch(`/school-documents/${id}`, data),
  remove: (id)     => api.delete(`/school-documents/${id}`),
};
