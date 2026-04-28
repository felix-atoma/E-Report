import api from './api';

export const uploadService = {
  upload: (file, type) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/upload/file?type=${type}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  remove: (url) => api.delete(`/upload/file?url=${encodeURIComponent(url)}`),
};
