import type { ThirdParty } from './customers';
import { api } from '../lib/api';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'Ingreso' | 'Egreso';
  amount: number;
  status: 'Completado' | 'Pendiente' | 'Anulado';
  reference?: string;
  detail?: string;
  source: 'Siigo' | 'Manual';
  isProjection: boolean;
  /** Counterparty of a synced RC/RP — absent on manual movements. */
  counterpartyIdentification?: string;
  counterpartyBranchOffice?: number;
  thirdParty?: ThirdParty;
  createdAt: string;
  updatedAt: string;
  /** Manual movements carry their own due date; Siigo receipts leave it empty. */
  dueDate?: string;
  /** Agreed payment date — the only manual edit on a Siigo document. */
  secondaryDueDate?: string;
  /** The date that actually governs: agreed when set, original otherwise. */
  effectiveDueDate?: string;
  /** Days between original and agreed; positive means pushed out. */
  dueDateShiftDays?: number;
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
  totalIncome: number;
  totalExpense: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

export interface CreateTransactionInput {
  date: string;
  description: string;
  category: string;
  type: 'Ingreso' | 'Egreso';
  amount: number;
  status: 'Completado' | 'Pendiente' | 'Anulado';
  reference?: string;
  source: 'Siigo' | 'Manual';
  isProjection: boolean;
  /** Third party this movement is with. The server fills in the Siigo id and
   *  settles the branch office, so only the key is sent. */
  counterpartyIdentification?: string;
  counterpartyBranchOffice?: number;
  dueDate?: string;
  secondaryDueDate?: string;
}

export const transactionsService = {
  list: (params?: { page?: number; limit?: number; search?: string; type?: string; status?: string; dateFrom?: string; dateTo?: string; source?: string; isProjection?: boolean; thirdParty?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.search) qs.set('search', params.search);
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params?.dateTo) qs.set('dateTo', params.dateTo);
    if (params?.source) qs.set('source', params.source);
    if (params?.isProjection !== undefined) qs.set('isProjection', String(params.isProjection));
    // The identification of the third party; the server matches every branch office.
    if (params?.thirdParty) qs.set('thirdParty', params.thirdParty);
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
