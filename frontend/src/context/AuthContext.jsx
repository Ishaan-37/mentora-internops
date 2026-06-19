// src/context/AuthContext.jsx
// Provides the logged-in user, role, and login/logout actions to the
// entire app. On mount, tries GET /auth/me using the existing cookie
// so a page refresh doesn't kick the user back to login.

import { createContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth.api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Try to restore session on first load
  useEffect(() => {
    authApi
      .getMe()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = { user, loading, login, logout, setUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
