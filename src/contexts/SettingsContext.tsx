import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { settingsService, type Settings } from '../services';
import { getToken } from '../lib/api';

// ── Locale map ────────────────────────────────────────────────────────────────

const CURRENCY_LOCALE: Record<string, string> = {
  USD: 'en-US',
  EUR: 'es-ES',
  CLP: 'es-CL',
  MXN: 'es-MX',
  COP: 'es-CO',
};

// ── Context shape ─────────────────────────────────────────────────────────────

interface SettingsCtx {
  settings: Settings | null;
  /** Full currency format: "$1,234.56" / "$ 1.234,56" / etc. */
  formatCurrency: (amount: number) => string;
  /** Compact format without symbol: "1.2K" / "1,2K" */
  formatCompact: (amount: number) => string;
  /** Currency code label for input labels: "USD" / "CLP" / etc. */
  currencyCode: string;
  /** Locale string derived from baseCurrency */
  locale: string;
  /** Re-fetch settings (call after SettingsView saves) */
  refreshSettings: () => void;
}

const defaultCtx: SettingsCtx = {
  settings: null,
  formatCurrency: (n) => `$${n.toLocaleString()}`,
  formatCompact: (n) => `${(n / 1000).toFixed(1)}K`,
  currencyCode: 'COP',
  locale: 'es-CO',
  refreshSettings: () => {},
};

const SettingsContext = createContext<SettingsCtx>(defaultCtx);

// ── Provider ──────────────────────────────────────────────────────────────────

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);

  const load = useCallback(() => {
    if (!getToken()) return;
    settingsService.get().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const currency = settings?.baseCurrency ?? 'COP';
  const locale   = CURRENCY_LOCALE[currency] ?? 'es-CO';

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const formatCompact = (amount: number) =>
    new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);

  return (
    <SettingsContext.Provider value={{
      settings,
      formatCurrency,
      formatCompact,
      currencyCode: currency,
      locale,
      refreshSettings: load,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
