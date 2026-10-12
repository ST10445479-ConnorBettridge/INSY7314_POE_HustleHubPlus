import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const USER_KEY = 'hustlehub_user';

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    const token = api.getToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const login = useCallback(async (credentials) => {
    const data = await api.login(credentials);
    api.setToken(data.data.token);
    setUser(data.data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
    return data.data.user;
  }, []);

  const register = useCallback(async (userData) => {
    const data = await api.register(userData);
    api.setToken(data.data.token);
    setUser(data.data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
    return data.data.user;
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    setUser(null);
    localStorage.removeItem(USER_KEY);
  }, []);

  useEffect(() => {
    window.addEventListener('hustlehub:session-expired', logout);
    return () => window.removeEventListener('hustlehub:session-expired', logout);
  }, [logout]);

  useEffect(() => {
    if (!user) return;
    try {
      const payload = JSON.parse(atob(api.getToken().split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const remaining = payload.exp * 1000 - Date.now();
      const timer = setTimeout(logout, Math.max(0, remaining));
      return () => clearTimeout(timer);
    } catch {
      // Login/register can finish before navigation; an invalid server token
      // is rejected by the next protected API request.
    }
  }, [user, logout]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      role: user ? user.role : null,
      login,
      register,
      logout,
    }),
    [user, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
