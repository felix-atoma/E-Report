import api from './api';

export const attendanceService = {
  listByClass: (classId, params) =>
    api.get(`/attendance/class/${classId}`, { params }),
  bulkUpsert: (records) =>
    api.post('/attendance/bulk', { records }),
};
