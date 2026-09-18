import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import api from '../api/client';

const USER_KEY = 'hustlehub_user';

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
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