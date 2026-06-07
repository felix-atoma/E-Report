import api from './api';

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const exportService = {
  downloadStudents: async () => {
    const res = await api.get('/export/students', { responseType: 'blob' });
    const date = new Date().toISOString().slice(0, 10);
    triggerDownload(res.data, `eleves_${date}.csv`);
  },

  downloadClassResults: async (academicYear, termName) => {
    const res = await api.get('/export/class-results', {
      params: { academicYear, termName },
      responseType: 'blob',
    });
    const slug = (termName ?? '').replace(/\s+/g, '_');
    triggerDownload(res.data, `resultats_${academicYear}_${slug}.csv`);
  },

  downloadFees: async (academicYear) => {
    const res = await api.get('/export/fees', {
      params: { academicYear },
      responseType: 'blob',
    });
    triggerDownload(res.data, `frais_${academicYear}.csv`);
  },
};
