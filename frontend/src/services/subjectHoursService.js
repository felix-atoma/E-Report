import api from './api';

export const subjectHoursService = {
  list: (subjectId) => api.get(`/subjects/${subjectId}/hours`),
  upsert: (subjectId, data) => api.put(`/subjects/${subjectId}/hours`, data),
};
