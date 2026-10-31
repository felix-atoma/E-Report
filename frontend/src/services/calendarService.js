import api from './api';

export const calendarService = {
  list:   (params)     => api.get('/calendar', { params }),
  myEvaluations: ()   => api.get('/calendar/my-evaluations'),
  create: (data)       => api.post('/calendar', data),
  update: (id, data)   => api.patch(`/calendar/${id}`, data),
  remove: (id)         => api.delete(`/calendar/${id}`),
};
