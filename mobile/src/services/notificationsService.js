import api from './api';

export const notificationsService = {
  getMine: () => api.get('/notifications/mine'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
};
