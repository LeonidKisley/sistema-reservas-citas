import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { applyTheme, getStoredTheme, persistTheme, systemPrefersDark } from '../utils/theme.js';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(getStoredTheme);
  const [resolved, setResolved] = useState(() => applyTheme(getStoredTheme()));

  useEffect(() => {
    setResolved(applyTheme(preference));
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;
    const onChange = () => setResolved(applyTheme(preference));
    if (media.addEventListener) media.addEventListener('change', onChange);
    else media.addListener?.(onChange);
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', onChange);
      else media.removeListener?.(onChange);
    };
  }, [preference]);

  const value = useMemo(() => ({
    preference,
    resolved,
    systemDark: systemPrefersDark(),
    setPreference: (next) => {
      const saved = persistTheme(next);
      setPreferenceState(saved);
      return saved;
    }
  }), [preference, resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return context;
}

export default ThemeProvider;
