import { createContext, useContext, useState, type ReactNode } from 'react';

export type ThemeId = 'predeterminado' | 'naranja' | 'bosque' | 'noche' | 'carbon';

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  primary: string;
  accent: string;
  bg: string;
  dark: boolean;
  /** Brand logo (under /public/logos) chosen to match the theme's palette. */
  logo: string;
}

export const THEMES: ThemeMeta[] = [
  { id: 'predeterminado', label: 'Predeterminado', primary: '#53565A', accent: '#D86018', bg: '#F7F7F7', dark: false, logo: '/logos/intexa-color-gris.png'   },
  { id: 'naranja',        label: 'Naranja',        primary: '#D86018', accent: '#B34F0F', bg: '#FFF8F4', dark: false, logo: '/logos/intexa-naranja.png'      },
  { id: 'bosque',         label: 'Bosque',         primary: '#5C7A01', accent: '#7A9A01', bg: '#F5F9EE', dark: false, logo: '/logos/intexa-verde.png'        },
  { id: 'noche',          label: 'Noche',          primary: '#D86018', accent: '#F2A900', bg: '#0D1117', dark: true,  logo: '/logos/intexa-color-blanco.png' },
  { id: 'carbon',         label: 'Carbón',         primary: '#F2A900', accent: '#D86018', bg: '#141414', dark: true,  logo: '/logos/intexa-amarillo.png'     },
];

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'arca_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    const id = (stored && THEMES.some(t => t.id === stored) ? stored : 'predeterminado') as ThemeId;
    document.documentElement.setAttribute('data-theme', id);
    return id;
  });

  const setTheme = (id: ThemeId) => {
    setThemeState(id);
    localStorage.setItem(STORAGE_KEY, id);
    document.documentElement.setAttribute('data-theme', id);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
