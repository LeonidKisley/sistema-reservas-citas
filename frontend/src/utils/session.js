const LEGACY_STORAGE_KEY = 'reservas_session';

let currentSession = null;

function purgeLegacyStorage() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.removeItem(LEGACY_STORAGE_KEY);
    window.sessionStorage?.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    return;
  }
}

export function getSession() {
  return currentSession;
}

export function saveSession(session) {
  purgeLegacyStorage();
  const user = session?.user || (session?.email ? session : null);
  currentSession = user ? { user } : null;
  return currentSession;
}

export function clearSession() {
  currentSession = null;
  purgeLegacyStorage();
}
