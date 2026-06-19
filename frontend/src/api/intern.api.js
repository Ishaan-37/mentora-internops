// src/api/intern.api.js
import api from './axios';

export const getDashboard = () =>
  api.get('/intern/dashboard').then((res) => res.data);

export const getCohort = () =>
  api.get('/intern/cohort').then((res) => res.data);

export const getWorkItems = (type) =>
  api.get('/intern/work-items', { params: type ? { type } : {} }).then((res) => res.data);

export const getWorkItemDetail = (id) =>
  api.get(`/intern/work-item/${id}`).then((res) => res.data);

// Submission can include a File object — sent as multipart/form-data
export const submitWork = ({ workItemId, submissionType, externalLink, notes, file }) => {
  const formData = new FormData();
  formData.append('workItemId', workItemId);
  formData.append('submissionType', submissionType);
  if (externalLink) formData.append('externalLink', externalLink);
  if (notes) formData.append('notes', notes);
  if (file) formData.append('file', file);

  return api
    .post('/intern/submit-work', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
};

export const getMySubmissions = () =>
  api.get('/intern/submissions').then((res) => res.data);

export const getNotifications = (unreadOnly) =>
  api.get('/intern/notifications', { params: unreadOnly ? { unreadOnly: 'true' } : {} }).then((res) => res.data);

export const markNotificationRead = (id) =>
  api.put(`/intern/mark-notification-read/${id}`).then((res) => res.data);

export const getTimeline = () =>
  api.get('/intern/timeline').then((res) => res.data);

export const getPresentations = () =>
  api.get('/intern/presentations').then((res) => res.data);
