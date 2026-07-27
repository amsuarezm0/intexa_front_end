import { useEffect,useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Chart colors resolved from the active theme's CSS variables.
 *
 * Recharts writes colors as SVG presentation attributes, where `var(--x)` does
 * not resolve — so the values are read from the computed style instead of being
 * passed through as variables. Hardcoding hexes here (as the views used to)
 * leaves grid lines and ticks at their light-theme values on 'noche'/'carbon'.
 */
export interface ChartTheme {
  grid: string;
  axis: string;
  income: string;
  expense: string;
  warning: string;
  neutral: string;
  surface: string;
  text: string;
  cursor: string;
  pie: string[];
}

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function readChartTheme(): ChartTheme {
  const income = readVar('--color-brand-success', '#7A9A01');
  const expense = readVar('--color-brand-danger', '#D86018');
  const warning = readVar('--color-brand-warning', '#F2A900');
  const primary = readVar('--color-brand-primary', '#53565A');
  const secondary = readVar('--color-brand-secondary', '#88898D');
  return {
    grid: readVar('--color-slate-100', '#EDEDEE'),
    axis: readVar('--color-slate-400', '#88898D'),
    income,
    expense,
    warning,
    neutral: readVar('--color-slate-200', '#DBDCDE'),
    surface: readVar('--color-white', '#FFFFFF'),
    text: readVar('--color-slate-900', '#232528'),
    cursor: readVar('--color-slate-50', '#F7F7F7'),
    // Brand hues first, then fixed accents for long category lists.
    pie: [income, expense, warning, primary, secondary,
      '#38BDF8', '#A78BFA', '#F472B6', '#2DD4BF', '#FCD34D'],
  };
}

export function useChartTheme(): ChartTheme {
  const { theme } = useTheme();
  const [values, setValues] = useState<ChartTheme>(readChartTheme);
  // The theme swap sets data-theme on <html>; re-read once the new vars apply.
  useEffect(() => { setValues(readChartTheme()); }, [theme]);
  return values;
}
