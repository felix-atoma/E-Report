import api from './api';

export const classesService = {
  list: () => api.get('/classes'),
  get: (id) => api.get(`/classes/${id}`),
  create: (data) => api.post('/classes', data),
  update: (id, data) => api.patch(`/classes/${id}`, data),
  deactivate: (id) => api.patch(`/classes/${id}/deactivate`),
  enrollStudent: (classId, studentId) => api.post(`/classes/${classId}/enroll`, { studentId }),
  unenrollStudent: (classId, studentId) => api.delete(`/classes/${classId}/students/${studentId}`),
  addSubject: (classId, subjectId, teacherId) =>
    api.post(`/classes/${classId}/subjects`, { subjectId, ...(teacherId ? { teacherId } : {}) }),
  updateSubjectTeacher: (classId, subjectId, teacherId) =>
    api.patch(`/classes/${classId}/subjects/${subjectId}`, { teacherId: teacherId || null }),
  removeSubject: (classId, subjectId) => api.delete(`/classes/${classId}/subjects/${subjectId}`),
};
