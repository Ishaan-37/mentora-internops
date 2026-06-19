// src/api/auth.api.js
import api from './axios';

export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then((res) => res.data);

export const logout = () =>
  api.post('/auth/logout').then((res) => res.data);

export const getMe = () =>
  api.get('/auth/me').then((res) => res.data);

export const changePassword = (currentPassword, newPassword) =>
  api.post('/auth/change-password', { currentPassword, newPassword }).then((res) => res.data);
