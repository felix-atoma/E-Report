import api from './api';

export const analyticsService = {
  classStats: (classId, academicYear, termNumber) =>
    api.get('/analytics/class-stats', { params: { classId, academicYear, termNumber } }),
};
