import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { AUTH_EXPIRED_EVENT, unwrap } from '../services/api.js';
import { getSession, saveSession, clearSession } from '../utils/session.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getSession);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const response = await api.get('/auth/me');
        if (!active) return;
        const profile = response?.data?.user || response?.data;
        setSession(profile ? saveSession({ user: profile }) : clearSession());
      } catch {
        if (active) {
          clearSession();
          setSession(null);
        }
      } finally {
        if (active) setReady(true);
      }
    };

    bootstrap();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onExpired = () => {
      clearSession();
      setSession(null);
      setReady(true);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (credentials) => {
    const payload = unwrap(await api.post('/auth/login', credentials));
    const user = payload?.user || (payload?.email ? payload : null);
    const next = saveSession(user ? { user } : null);
    setSession(next);
    setReady(true);
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
      await api.post('/auth/logout');
    } finally {
      clearSession();
      setSession(null);
      setReady(true);
    }
  }, []);

  const updateSession = useCallback((updates) => {
    setSession((current) => {
      if (!current) return current;
      return saveSession({ ...current, ...updates });
    });
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      ready,
      login,
      logout,
      registerClient,
      registerSalon,
      updateSession
    }),
    [session, ready, login, logout, registerClient, registerSalon, updateSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
