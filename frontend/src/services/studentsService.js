import api from './api';

export const studentsService = {
  list: (params) => api.get('/students', { params }),
  get: (id) => api.get(`/students/${id}`),
  me: () => api.get('/students/me'),
  myChildren: () => api.get('/students/my-children'),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.patch(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  bulkDelete: (ids) => api.post('/students/bulk-delete', { ids }),
  bulkImport: (rows) => api.post('/students/bulk-import', { rows }),
  yearRollover: (fromYear, toYear) => api.post('/students/year-rollover', { fromYear, toYear }),
  certificate: (id, type) => api.get(`/students/${id}/certificate/${type}`, { responseType: 'arraybuffer' }),
};
