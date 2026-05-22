import { api } from '../lib/api';
import type { PieSlice } from './dashboard';

export interface ReportDataPoint {
  name: string;
  ejecutado: number;
  presupuesto: number;
}

export interface DeviationRow {
  category: string;
  budget: number;
  actual: number;
  deviation: number;
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
  deviationTable: DeviationRow[];
  annual: AnnualProjection;
  complianceRate: number;
}

export type ReportPeriod = 'mensual' | 'trimestral' | 'anual';

export const reportsService = {
  getSummary: (period?: ReportPeriod) =>
    api.get<ReportSummary>(`/reports${period ? `?period=${period}` : ''}`),
};
