import api from './api';

export const institutionsService = {
  me: () => api.get('/institutions/me'),
  update: (data) => api.patch('/institutions/me', data),
  updateBranding: (data) => api.patch('/institutions/me/branding', data),
  updateAcademicSettings: (data) => api.patch('/institutions/me/academic-settings', data),
  exportData: () => api.get('/institutions/me/export', { responseType: 'blob' }),

  // Super-admin endpoints
  registerSchool: (data) => api.post('/superadmin/register', data),
  listAllInstitutions: () => api.get('/superadmin/institutions'),
  approveInstitution: (id) => api.patch(`/superadmin/institutions/${id}/approve`),
  suspendInstitution: (id) => api.patch(`/superadmin/institutions/${id}/suspend`),
  rejectInstitution: (id) => api.patch(`/superadmin/institutions/${id}/reject`),
  updateInstitutionNotes: (id, notes) =>
    api.patch(`/superadmin/institutions/${id}/notes`, { notes }),
  updateSubscriptionPlan: (id, plan) =>
    api.patch(`/superadmin/institutions/${id}/plan`, { plan }),
};
