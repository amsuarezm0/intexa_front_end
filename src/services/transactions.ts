import { api } from '../lib/api';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'Ingreso' | 'Egreso';
  amount: number;
  status: 'Completado' | 'Pendiente' | 'Cancelado';
  reference?: string;
  source: 'Siigo' | 'Manual';
  isProjection: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionListResponse {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

export interface CreateTransactionInput {
  date: string;
  description: string;
  category: string;
  type: 'Ingreso' | 'Egreso';
  amount: number;
  status: 'Completado' | 'Pendiente' | 'Cancelado';
  reference?: string;
  source: 'Siigo' | 'Manual';
  isProjection: boolean;
}

export const transactionsService = {
  list: (params?: { page?: number; limit?: number; search?: string; type?: string; status?: string; isProjection?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.search) qs.set('search', params.search);
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    if (params?.isProjection !== undefined) qs.set('isProjection', String(params.isProjection));
    const query = qs.toString();
    return api.get<TransactionListResponse>(`/transactions${query ? `?${query}` : ''}`);
  },
  get: (id: string) => api.get<Transaction>(`/transactions/${id}`),
  create: (body: CreateTransactionInput) => api.post<Transaction>('/transactions', body),
  update: (id: string, body: Partial<CreateTransactionInput>) =>
    api.put<Transaction>(`/transactions/${id}`, body),
  delete: (id: string) => api.del<{ message: string }>(`/transactions/${id}`),
  summary: () => api.get<TransactionSummary>('/transactions/summary'),
};
