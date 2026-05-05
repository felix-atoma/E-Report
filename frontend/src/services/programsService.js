import api from './api';

export const programsService = {
  get: (classId, subjectId, academicYear) =>
    api.get(`/programs/class/${classId}/subject/${subjectId}`, { params: { academicYear } }),
  upsert: (classId, subjectId, data) =>
    api.put(`/programs/class/${classId}/subject/${subjectId}`, data),
  listForClass: (classId, academicYear) =>
    api.get(`/programs/class/${classId}`, { params: { academicYear } }),
};
