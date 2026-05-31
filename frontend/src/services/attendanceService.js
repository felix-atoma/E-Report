import api from './api';

export const attendanceService = {
  bulkUpsert: (data)                        => api.post('/attendance/bulk', data),
  listByClass: (classId, params)            => api.get(`/attendance/class/${classId}`, { params }),
  summaryByClass: (classId, params)         => api.get(`/attendance/class/${classId}/summary`, { params }),
  listByStudent: (studentId)                => api.get(`/attendance/student/${studentId}`),
  remove: (id)                              => api.delete(`/attendance/${id}`),
};
