import api from './api';

export const notificationsService = {
  mine: () => api.get('/notifications/mine'),
  unreadCount: () => api.get('/notifications/unread-count'),
  markAllRead: () => api.post('/notifications/mark-all-read'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  held: () => api.get('/notifications/held'),
  forceSend: (id) => api.patch(`/notifications/${id}/force-send`),
  sendPaymentLink: (id) => api.post(`/notifications/${id}/send-payment-link`),
};
