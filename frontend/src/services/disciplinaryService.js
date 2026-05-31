import api from './api';

export const disciplinaryService = {
  list:          (params)    => api.get('/disciplinary', { params }),
  listByStudent: (studentId) => api.get(`/disciplinary/student/${studentId}`),
  create:        (data)      => api.post('/disciplinary', data),
  update:        (id, data)  => api.patch(`/disciplinary/${id}`, data),
  remove:        (id)        => api.delete(`/disciplinary/${id}`),
};
