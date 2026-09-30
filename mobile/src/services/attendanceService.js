import api from './api';

export const attendanceService = {
  listByClass: (classId, params) =>
    api.get(`/attendance/class/${classId}`, { params }),
  // payload: { classId, date, subjectId?, startTime?, entries: [{ studentId, status, minutesLate? }] }
  bulkUpsert: (payload) =>
    api.post('/attendance/bulk', payload),
  timetable: (classId, academicYear) =>
    api.get(`/timetables/class/${classId}`, { params: { academicYear } }),
};
