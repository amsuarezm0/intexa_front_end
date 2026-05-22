import { api } from '../lib/api';

export interface CashFlowDay {
  label: string;
  date: number;
  ingresos: number;
  egresos: number;
}

export interface CashFlowAlert {
  id: string;
  type: string;
  title: string;
  description: string;
  amount: number;
  dueDate: string;
}

export interface CashFlowSummary {
  days: CashFlowDay[];
  projectedBalance: number;
  projectedChange: number;
  alerts: CashFlowAlert[];
}

export const cashFlowService = {
  getSummary: (period?: 'day' | 'week' | 'month') =>
    api.get<CashFlowSummary>(`/cashflow${period ? `?period=${period}` : ''}`),
};
