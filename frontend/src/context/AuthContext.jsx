import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import api, { unwrap } from '../services/api.js';
import { getSession, saveSession, clearSession } from '../utils/session.js';

const AuthContext = createContext(null);

const readInitialSession = () => {
  const stored = getSession();
  if (!stored?.token || !stored?.user) {
    clearSession();
    return null;
  }
  return stored;
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readInitialSession);

  const login = useCallback(async (credentials) => {
    const payload = unwrap(await api.post('/auth/login', credentials));
    saveSession(payload);
    setSession(payload);
    return payload;
  }, []);

  const registerClient = useCallback(async (payload) => {
    return unwrap(await api.post('/auth/register-client', payload));
  }, []);

  const registerSalon = useCallback(async (payload) => {
    return unwrap(await api.post('/tenants', payload));
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
    () => ({ session, user: session?.user || null, token: session?.token || null, login, logout, registerClient, registerSalon, updateSession }),
    [session, login, logout, registerClient, registerSalon, updateSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
