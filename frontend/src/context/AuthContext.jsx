import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import api from '../services/api.js';
import { getSession, saveSession, clearSession } from '../utils/session.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getSession());

  const login = useCallback(async (credentials) => {
    const data = await api.post('/auth/login', credentials);
    saveSession(data);
    setSession(data);
    return data;
  }, []);

  const registerClient = useCallback(async (payload) => {
    return api.post('/auth/register-client', payload);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getSession()?.token) await api.post('/auth/logout');
    } finally {
      clearSession();
      setSession(null);
    }
  }, []);

  const updateSession = useCallback((updates) => {
    setSession((current) => {
      if (!current) return current;
      const next = { ...current, ...updates };
      saveSession(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ session, user: session?.user || null, token: session?.token || null, login, logout, registerClient, updateSession }),
    [session, login, logout, registerClient, updateSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
