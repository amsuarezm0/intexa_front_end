import { api } from '../lib/api';

export interface Settings {
  baseCurrency: string;
  autoExchangeRate: boolean;
  /** Active UI theme id (see ThemeContext THEMES). Persisted per user. */
  theme: string;
}

export interface ActivityLog {
  id: string;
  userName: string;
  initial: string;
  action: string;
  module: string;
  timestamp: string;
  color: string;
}

export const settingsService = {
  get: () => api.get<Settings>('/settings'),
  update: (body: Settings) => api.put<Settings>('/settings', body),
  getActivityLogs: () => api.get<ActivityLog[]>('/activity-logs'),
  getExchangeRates: () => api.get<Record<string, number>>('/exchange-rates'),
};
