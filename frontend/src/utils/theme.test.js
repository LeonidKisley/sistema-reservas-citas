import { afterEach, describe, expect, it, vi } from 'vitest';
import { THEME_KEY, applyTheme, getStoredTheme, persistTheme, resolveTheme } from './theme.js';

const storage = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('theme', () => {
  it('resuelve claro, oscuro y la preferencia del sistema', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme('system')).toBe('dark');

    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    expect(resolveTheme('system')).toBe('light');
  });

  it('aplica el tema resuelto al documento', () => {
    const dataset = {};
    vi.stubGlobal('document', { documentElement: { dataset } });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    expect(applyTheme('dark')).toBe('dark');
    expect(dataset.theme).toBe('dark');
    applyTheme('system');
    expect(dataset.theme).toBe('light');
  });

  it('lee y normaliza la preferencia guardada', () => {
    const local = storage();
    vi.stubGlobal('window', { localStorage: local, matchMedia: () => ({ matches: false }) });
    expect(getStoredTheme()).toBe('system');

    local.setItem(THEME_KEY, 'dark');
    expect(getStoredTheme()).toBe('dark');

    local.setItem(THEME_KEY, 'neon');
    expect(getStoredTheme()).toBe('system');
    expect(persistTheme('neon')).toBe('system');
    expect(local.getItem(THEME_KEY)).toBe('system');
  });

  it('sobrevive a un storage que lanza excepciones', () => {
    vi.stubGlobal('window', {
      get localStorage() { throw new Error('bloqueado'); },
      matchMedia: () => ({ matches: true })
    });
    expect(getStoredTheme()).toBe('system');
    expect(resolveTheme('system')).toBe('dark');
    expect(() => persistTheme('light')).not.toThrow();
  });
});
