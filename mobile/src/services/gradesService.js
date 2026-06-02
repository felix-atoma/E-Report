import api from './api';

export const gradesService = {
  getForReport: (reportId) =>
    api.get(`/grades/report/${reportId}`),
  bulkUpsert: (reportId, grades) =>
    api.put(`/grades/report/${reportId}/bulk`, { grades }),
  getForClassSubject: (classId, subjectId, params) =>
    api.get(`/grades/class/${classId}/subject/${subjectId}`, { params }),
  saveClassGrades: (classId, subjectId, data) =>
    api.put(`/grades/class/${classId}/subject/${subjectId}`, data),
};
