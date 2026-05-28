import { api } from '../lib/api';
import type { PieSlice } from './dashboard';

export interface ReportDataPoint {
  name: string;
  ingresos: number;
  egresos: number;
}

export interface CategoryRow {
  category: string;
  amount: number;
  prev: number;
  change: number;
  isPositive: boolean;
}

export interface AnnualProjection {
  projectedClose: number;
  probability: number;
  insightText: string;
}

export interface ReportSummary {
  cashFlowChart: ReportDataPoint[];
  categoryBreakdown: PieSlice[];
  categoryTable: CategoryRow[];
  annual: AnnualProjection;
  complianceRate: number;
}

export type ReportPeriod = 'mensual' | 'trimestral' | 'anual';

export const reportsService = {
  getSummary: (period?: ReportPeriod) =>
    api.get<ReportSummary>(`/reports${period ? `?period=${period}` : ''}`),
};
