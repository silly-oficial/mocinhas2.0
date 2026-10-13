import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';

export type AppTheme = 'original' | 'skyglass';
export const THEME_KEY = 'mocinhas_visual_theme';
const normalize = (value: unknown): AppTheme => value === 'skyglass' ? 'skyglass' : 'original';
function readTheme(): AppTheme {
  try { return normalize(localStorage.getItem(THEME_KEY)); } catch { return 'original'; }
}
const ThemeContext = createContext<{ theme: AppTheme; setTheme: (theme: AppTheme) => void; persisted: boolean } | null>(null);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, changeTheme] = useState<AppTheme>(readTheme);
  const [persisted, setPersisted] = useState(true);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'original');
    document.body.classList.toggle('dark', theme === 'original');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'skyglass' ? '#EAF3FD' : '#09090E');
  }, [theme]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === THEME_KEY || event.key === null)) {
        changeTheme(normalize(event.key === null ? null : event.newValue));
        setPersisted(true);
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function setTheme(value: AppTheme) {
    const next = normalize(value);
    changeTheme(next);
    try { localStorage.setItem(THEME_KEY, next); setPersisted(true); } catch { setPersisted(false); }
  }
  return <ThemeContext.Provider value={{ theme, setTheme, persisted }}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw Error('ThemeProvider required');
  return value;
}
