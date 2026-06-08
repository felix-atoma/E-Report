import api from './api';

export const timetablesService = {
  list: (classId, academicYear) =>
    api.get(`/timetables/class/${classId}`, { params: { academicYear } }),
  save: (classId, data) =>
    api.put(`/timetables/class/${classId}`, data),
  getMySchedule: (academicYear) =>
    api.get('/timetables/my-schedule', { params: { academicYear } }),
};
