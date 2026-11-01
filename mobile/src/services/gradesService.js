import api from './api';

export const gradesService = {
  getForReport: (reportId) =>
    api.get(`/grades/report/${reportId}`),
  bulkUpsert: (reportId, grades) =>
    api.put(`/grades/report/${reportId}/bulk`, { grades }),
  // Fiche de notes du trimestre (classe × matière) : élèves, notes Interro 1–4 / Devoir / Composition, signature
  getForClassSubject: (classId, subjectId, params) =>
    api.get(`/grades/class/${classId}/subject/${subjectId}`, { params }),
  // État des fiches (signées ou non) de toutes les matières d'une classe pour un trimestre
  listFiches: (classId, academicYear, termNumber) =>
    api.get(`/grades/class/${classId}/fiches`, { params: { academicYear, termNumber } }),
  saveClassGrades: (classId, subjectId, data) =>
    api.put(`/grades/class/${classId}/subject/${subjectId}`, data),
  // Signature manuscrite (image PNG en data URL) : verrouille la fiche du trimestre
  signFiche: (classId, subjectId, academicYear, termNumber, signatureData) =>
    api.post(`/grades/class/${classId}/subject/${subjectId}/sign`, { signatureData }, { params: { academicYear, termNumber } }),
  unsignFiche: (classId, subjectId, academicYear, termNumber) =>
    api.delete(`/grades/class/${classId}/subject/${subjectId}/sign`, { params: { academicYear, termNumber } }),
  // Dernière signature du professeur, pour la réutiliser sans la redessiner
  mySignature: () => api.get('/grades/my-signature'),
};
