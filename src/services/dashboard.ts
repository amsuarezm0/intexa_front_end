import { api } from '../lib/api';

export interface StatCard {
  title: string;
  value: number;
  change: string;
  isPositive: boolean;
  trendText: string;
  icon: string;
}

export interface ChartDataPoint {
  name: string;
  ingresos: number;
  egresos: number;
  saldo: number;
}

export interface PieSlice {
  name: string;
  value: number;
}

export interface DashboardAlert {
  id: string;
  type: string;
  title: string;
  description: string;
  amount: number;
  dueDate: string;
}

export interface WeeklyComparison {
  week: number;
  ingresos: number;
  egresos: number;
}

export interface DashboardSummary {
  stats: StatCard[];
  netFlow: number;
  monthIncome: number;
  monthExpense: number;
  chartData: ChartDataPoint[];
  expensePie: PieSlice[];
  alerts: DashboardAlert[];
  weeklyData: WeeklyComparison[];
}

export interface BankAccount {
  label: string;
  amount: number;
}

export interface BankBalance {
  /** Per-bank breakdown. */
  accounts: BankAccount[];
  /** Total — sum of all account amounts. */
  amount: number;
  updatedAt: string;
  updatedBy: string;
}

export const dashboardService = {
  getSummary: () => api.get<DashboardSummary>('/dashboard'),
  getBankBalance: () => api.get<BankBalance>('/dashboard/bank-balance'),
  updateBankBalance: (accounts: BankAccount[]) =>
    api.put<BankBalance>('/dashboard/bank-balance', { accounts }),
};
