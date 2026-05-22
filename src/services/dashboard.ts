import { api } from '../lib/api';

export interface StatCard {
  title: string;
  value: string;
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
  chartData: ChartDataPoint[];
  expensePie: PieSlice[];
  alerts: DashboardAlert[];
  weeklyData: WeeklyComparison[];
}

export const dashboardService = {
  getSummary: () => api.get<DashboardSummary>('/dashboard'),
};
