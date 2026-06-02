import api from './api';

export const gradesService = {
  getForReport: (reportId) => api.get(`/grades/report/${reportId}`),
  bulkUpsert: (reportId, grades) =>
    api.put(`/grades/report/${reportId}/bulk`, { grades }),
};
