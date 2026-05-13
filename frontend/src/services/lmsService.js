import api from './api';

export const lmsService = {
  // Announcements
  announcements: {
    list:   (params) => api.get('/lms/announcements', { params }),
    create: (data)   => api.post('/lms/announcements', data),
    update: (id, data) => api.patch(`/lms/announcements/${id}`, data),
    delete: (id)     => api.delete(`/lms/announcements/${id}`),
  },

  // Materials
  materials: {
    list:   (params) => api.get('/lms/materials', { params }),
    create: (data)   => api.post('/lms/materials', data),
    delete: (id)     => api.delete(`/lms/materials/${id}`),
  },

  // Assignments
  assignments: {
    list:          (params)         => api.get('/lms/assignments', { params }),
    get:           (id)             => api.get(`/lms/assignments/${id}`),
    create:        (data)           => api.post('/lms/assignments', data),
    update:        (id, data)       => api.patch(`/lms/assignments/${id}`, data),
    publish:       (id)             => api.patch(`/lms/assignments/${id}/publish`),
    delete:        (id)             => api.delete(`/lms/assignments/${id}`),
    submissions:   (id)             => api.get(`/lms/assignments/${id}/submissions`),
    submit:        (id, data)       => api.post(`/lms/assignments/${id}/submit`, data),
    mySubmission:  (id)             => api.get(`/lms/assignments/${id}/my-submission`),
    grade:         (id, subId, data) => api.patch(`/lms/assignments/${id}/submissions/${subId}/grade`, data),
  },

  // Quizzes
  quizzes: {
    list:          (params)              => api.get('/lms/quizzes', { params }),
    get:           (id)                  => api.get(`/lms/quizzes/${id}`),
    create:        (data)                => api.post('/lms/quizzes', data),
    update:        (id, data)            => api.patch(`/lms/quizzes/${id}`, data),
    publish:       (id)                  => api.patch(`/lms/quizzes/${id}/publish`),
    delete:        (id)                  => api.delete(`/lms/quizzes/${id}`),
    addQuestion:   (id, data)            => api.post(`/lms/quizzes/${id}/questions`, data),
    updateQuestion:(id, qId, data)       => api.patch(`/lms/quizzes/${id}/questions/${qId}`, data),
    deleteQuestion:(id, qId)             => api.delete(`/lms/quizzes/${id}/questions/${qId}`),
    startAttempt:  (id)                  => api.post(`/lms/quizzes/${id}/attempts/start`),
    submitAttempt: (id, attemptId, data) => api.post(`/lms/quizzes/${id}/attempts/${attemptId}/submit`, data),
    myAttempts:    (id)                  => api.get(`/lms/quizzes/${id}/my-attempts`),
    results:       (id)                  => api.get(`/lms/quizzes/${id}/results`),
  },
};
