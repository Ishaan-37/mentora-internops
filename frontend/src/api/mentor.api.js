// src/api/mentor.api.js
import api from './axios';

export const getMyInterns = () =>
  api.get('/mentor/my-interns').then((res) => res.data);

export const getMentorDirectory = () =>
  api.get('/mentor/directory').then((res) => res.data);

export const getInternDetail = (id) =>
  api.get(`/mentor/intern/${id}`).then((res) => res.data);

export const createWorkItem = (payload) =>
  api.post('/mentor/create-work-item', payload).then((res) => res.data);

export const updateWorkItem = (id, payload) =>
  api.put(`/mentor/update-work-item/${id}`, payload).then((res) => res.data);

export const getSubmissions = (review) =>
  api.get('/mentor/submissions', { params: review ? { review } : {} }).then((res) => res.data);

export const reviewSubmission = (id, decision, feedbackText) =>
  api.put(`/mentor/review-submission/${id}`, { decision, feedbackText }).then((res) => res.data);

export const getInternAnalytics = (internId) =>
  api.get(`/mentor/analytics/${internId}`).then((res) => res.data);

export const schedulePresentation = (payload) =>
  api.post('/mentor/schedule-presentation', payload).then((res) => res.data);
