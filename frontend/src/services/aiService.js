import api from './api';

export const aiService = {
  chat: (message, context) => api.post('/ai/chat', { message, context }),
  generateReportComment: (data) => api.post('/ai/report-comment', data),
  assistedCorrection: (data) => api.post('/ai/assisted-correction', data),
};
