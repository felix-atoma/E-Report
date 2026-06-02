import api from './api';

export const feesService = {
  getStudentSummary: (studentId, params) =>
    api.get(`/fees/student/${studentId}/summary`, { params }),
};
