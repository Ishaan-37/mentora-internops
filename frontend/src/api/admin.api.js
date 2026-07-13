// src/api/admin.api.js
import api from './axios';

export const getDashboard = () =>
  api.get('/admin/dashboard').then((res) => res.data);

export const getAllUsers = (role) =>
  api.get('/admin/all-users', { params: role ? { role } : {} }).then((res) => res.data);

export const getAllBatches = () =>
  api.get('/admin/all-batches').then((res) => res.data);

export const addAdmin = (payload) =>
  api.post('/admin/add-admin', payload).then((res) => res.data);

export const addMentor = (payload) =>
  api.post('/admin/add-mentor', payload).then((res) => res.data);

export const addIntern = (payload) =>
  api.post('/admin/add-intern', payload).then((res) => res.data);

export const assignMentor = (internId, mentorId) =>
  api.post('/admin/assign-mentor', { internId, mentorId }).then((res) => res.data);

export const createBatch = (payload) =>
  api.post('/admin/create-batch', payload).then((res) => res.data);

export const deleteUser = (id) =>
  api.delete(`/admin/delete-user/${id}`).then((res) => res.data);

export const getAssignments = () =>
  api.get('/admin/assignments').then((res) => res.data);
