// src/api/attendance.api.js
import api from './axios';

// Intern
export const getTodayStatus = () =>
  api.get('/attendance/today').then(r => r.data);

export const markAttendance = (latitude, longitude, deviceHash, deviceLabel) =>
  api.post('/attendance/mark', { latitude, longitude, deviceHash, deviceLabel}).then(res => res.data);

export const getMyHistory = (month) =>
  api.get('/attendance/my-history', { params: month ? { month } : {} }).then(r => r.data);

// Mentor
export const getMentorOverview = () =>
  api.get('/attendance/mentor-overview').then(r => r.data);

export const getInternHistory = (internId, month) =>
  api.get(`/attendance/intern/${internId}/history`, { params: month ? { month } : {} }).then(r => r.data);
