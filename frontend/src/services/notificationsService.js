import api from './api';

export const notificationsService = {
  mine: () => api.get('/notifications/mine'),
  held: () => api.get('/notifications/held'),
  forceSend: (id) => api.patch(`/notifications/${id}/force-send`),
};
