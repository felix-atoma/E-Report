import api from './api';

export const institutionsService = {
  me: () => api.get('/institutions/me'),
  update: (data) => api.patch('/institutions/me', data),
  updateBranding: (data) => api.patch('/institutions/me/branding', data),
  updateAcademicSettings: (data) => api.patch('/institutions/me/academic-settings', data),
};
