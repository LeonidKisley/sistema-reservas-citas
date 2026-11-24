export const THEME_KEY = 'auraia-theme';
export const THEME_PREFERENCES = ['light', 'dark', 'system'];

export function getStoredTheme() {
  try {
    const value = window.localStorage?.getItem(THEME_KEY);
    return THEME_PREFERENCES.includes(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

export function systemPrefersDark() {
  try {
    return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  } catch {
    return false;
  }
}

export function resolveTheme(preference) {
  if (preference === 'dark' || preference === 'light') return preference;
  return systemPrefersDark() ? 'dark' : 'light';
}

export function applyTheme(preference) {
  const resolved = resolveTheme(preference);
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = resolved;
  return resolved;
}

export function persistTheme(preference) {
  const next = THEME_PREFERENCES.includes(preference) ? preference : 'system';
  try {
    window.localStorage?.setItem(THEME_KEY, next);
  } catch {
    // Storage puede estar bloqueado; el tema sigue aplicando durante la sesión.
  }
  return next;
}
