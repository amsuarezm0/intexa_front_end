import { api } from '../lib/api';
import type { Transaction } from './transactions';

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
  balance: number;
  projectedBalance: number;
  projectedChange: number;
  alerts: CashFlowAlert[];
}

export interface Installment {
  dueDate: string;
  value: number;
}

export interface PeriodInvoice {
  id: string;
  date: string;
  dueDate: string;
  reference: string;
  customerName: string;
  total: number;
  balance: number;
  status: string;
  category: string;
  source: string;
  detail: string;
  installments?: Installment[];
  pendingInstallments?: Installment[];
}

export interface PeriodPurchase {
  id: string;
  date: string;
  dueDate: string;
  reference: string;
  providerName: string;
  total: number;
  balance: number;
  status: string;
  category: string;
  source: string;
  detail: string;
  installments?: Installment[];
  pendingInstallments?: Installment[];
}

export interface PeriodData {
  transactions: Transaction[];
  invoices: PeriodInvoice[];
  purchases: PeriodPurchase[];
}

export const cashFlowService = {
  getSummary: () => api.get<CashFlowSummary>('/cashflow'),
  getPeriodData: (period: 'day' | 'week' | 'month', date: string) =>
    api.get<PeriodData>(`/cashflow/period?period=${period}&date=${date}`),
};
