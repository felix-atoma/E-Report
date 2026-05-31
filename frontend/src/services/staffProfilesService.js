import api from './api';

export const staffProfilesService = {
  list:   ()               => api.get('/staff-profiles'),
  get:    (userId)         => api.get(`/staff-profiles/${userId}`),
  upsert: (userId, data)   => api.put(`/staff-profiles/${userId}`, data),
  remove: (userId)         => api.delete(`/staff-profiles/${userId}`),
};
