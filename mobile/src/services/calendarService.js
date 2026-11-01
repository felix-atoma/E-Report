import api from './api';

export const calendarService = {
  // Professeur : évaluations programmées par l'administration et état réel de ses fiches de notes
  myEvaluations: () => api.get('/calendar/my-evaluations'),
};
