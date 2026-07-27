import { api } from '../lib/api';
import type { Transaction } from './transactions';

export interface ProjectionPoint {
  day: string;
  val: number;
  deficit: number;
}

export interface ProjectionAlert {
  id: string;
  icon: string;
  title: string;
  description: string;
  dueDate: string;
  amount: number;
  color: string;
}

export interface ProjectionSummary {
  chartData: ProjectionPoint[];
  projectedIncome: number;
  projectedExpenses: number;
  estimatedBalance: number;
  alerts: ProjectionAlert[];
}

export interface SimulateRequest {
  salesGrowth: number;
  paymentDelay: number;
}

export interface SimulateResponse {
  projectedBalance: number;
  impact: number;
  riskLevel: string;
}

export interface CreateProjectionInput {
  date: string;
  description: string;
  category: string;
  type: 'Ingreso' | 'Egreso';
  amount: number;
}

export interface ProjectionPeriod {
  id: string;
  days: number;
  label: string;
  createdAt: string;
}

export const projectionsService = {
  getSummary: (days?: number) =>
    api.get<ProjectionSummary>(`/projections${days ? `?days=${days}` : ''}`),
  create: (body: CreateProjectionInput) =>
    api.post<Transaction>('/projections', { ...body, status: 'Pendiente', source: 'Manual', isProjection: true }),
  simulate: (body: SimulateRequest) => api.post<SimulateResponse>('/projections/simulate', body),

  // Custom projection horizons (shared; managed by ADMINISTRADOR/GESTIÓN).
  listPeriods: () => api.get<ProjectionPeriod[]>('/projections/periods'),
  createPeriod: (body: { days: number; label?: string }) =>
    api.post<ProjectionPeriod>('/projections/periods', body),
  deletePeriod: (id: string) => api.del<{ message: string }>(`/projections/periods/${id}`),
};
