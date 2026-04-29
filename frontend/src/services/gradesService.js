import api from './api';

export const gradesService = {
  getForReport: (reportId) => api.get(`/grades/report/${reportId}`),
  bulkUpsert: (reportId, grades) => api.put(`/grades/report/${reportId}/bulk`, { grades }),

  getForClassSubject: (classId, subjectId, academicYear, termNumber) =>
    api.get(`/grades/class/${classId}/subject/${subjectId}`, {
      params: { academicYear, termNumber },
    }),

  saveForClassSubject: (classId, subjectId, payload) =>
    api.put(`/grades/class/${classId}/subject/${subjectId}`, payload),

  listFiches: (classId, academicYear, termNumber) =>
    api.get(`/grades/class/${classId}/fiches`, { params: { academicYear, termNumber } }),

  signFiche: (classId, subjectId, academicYear, termNumber, signatureData) =>
    api.post(
      `/grades/class/${classId}/subject/${subjectId}/sign`,
      { signatureData },
      { params: { academicYear, termNumber } },
    ),

  unsignFiche: (classId, subjectId, academicYear, termNumber) =>
    api.delete(`/grades/class/${classId}/subject/${subjectId}/sign`, {
      params: { academicYear, termNumber },
    }),
};
