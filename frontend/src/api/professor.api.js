// src/api/professor.api.js
import api from './axios';

// --- Admin-facing ---
export const addProfessor = (payload) =>
  api.post('/professors/add', payload).then((res) => res.data);

export const getAllProfessors = () =>
  api.get('/professors').then((res) => res.data);

export const deleteProfessor = (id) =>
  api.delete(`/professors/${id}`).then((res) => res.data);

// --- Professor-facing ---
export const getMyProfile = () =>
  api.get('/professors/me').then((res) => res.data);

export const getMyScholars = () =>
  api.get('/professors/my-scholars').then((res) => res.data);
