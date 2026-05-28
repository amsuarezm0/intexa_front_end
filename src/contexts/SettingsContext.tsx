import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { settingsService, type Settings } from '../services';

// ── Locale map ────────────────────────────────────────────────────────────────

const CURRENCY_LOCALE: Record<string, string> = {
  USD: 'en-US',
  EUR: 'es-ES',
  CLP: 'es-CL',
  MXN: 'es-MX',
  COP: 'es-CO',
};

// All amounts in DB are stored in COP. This converts to the display currency.
function convertFromCOP(amount: number, targetCurrency: string, rates: Record<string, number>): number {
  if (targetCurrency === 'COP') return amount;
  const copRate = rates['COP'];
  const targetRate = rates[targetCurrency];
  if (!copRate || !targetRate) return amount;
  return amount * targetRate / copRate;
}

// ── Context shape ─────────────────────────────────────────────────────────────

interface SettingsCtx {
  settings: Settings | null;
  /** Full currency format — converts from COP if autoExchangeRate is on */
  formatCurrency: (amount: number) => string;
  /** Compact format */
  formatCompact: (amount: number) => string;
  /** Currency code label for input labels */
  currencyCode: string;
  /** Locale string derived from baseCurrency */
  locale: string;
  /** Re-fetch settings */
  refreshSettings: () => void;
}

const defaultCtx: SettingsCtx = {
  settings: null,
  formatCurrency: (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(n),
  formatCompact: (n) => new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(n),
  currencyCode: 'COP',
  locale: 'es-CO',
  refreshSettings: () => {},
};

const SettingsContext = createContext<SettingsCtx>(defaultCtx);

// ── Provider ──────────────────────────────────────────────────────────────────

interface SettingsProviderProps {
  children: ReactNode;
  userId: string | null;
}

export function SettingsProvider({ children, userId }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [rates, setRates] = useState<Record<string, number> | null>(null);

  const load = useCallback(() => {
    settingsService.get().then(setSettings).catch(() => {});
    settingsService.getExchangeRates().then(setRates).catch(() => {});
  }, []);

  useEffect(() => {
    if (userId) {
      load();
    } else {
      setSettings(null);
      setRates(null);
    }
  }, [userId, load]);

  const currency = settings?.baseCurrency ?? 'COP';
  const locale   = CURRENCY_LOCALE[currency] ?? 'es-CO';
  const autoConvert = !!(settings?.autoExchangeRate && rates && currency !== 'COP');

  const formatCurrency = (amount: number) => {
    const converted = autoConvert ? convertFromCOP(amount, currency, rates!) : amount;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  };

  const formatCompact = (amount: number) => {
    const converted = autoConvert ? convertFromCOP(amount, currency, rates!) : amount;
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(converted);
  };

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
