import { api } from '../lib/api';

export interface SearchDocument {
  id: string;
  docType: 'RC' | 'RP' | 'FV' | 'FC' | 'Manual';
  reference: string;
  date: string;
  dueDate?: string;
  description: string;
  detail?: string;
  category: string;
  type?: 'Ingreso' | 'Egreso';
  amount: number;
  balance?: number;
  status: string;
  counterparty: string;
  counterpartyId?: string;
  source?: string;
  prefix?: string;
  number?: number;
  isProjection?: boolean;
  externalId?: string;
  syncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const searchService = {
  search: (reference: string) => api.get<SearchDocument[]>(`/search?reference=${encodeURIComponent(reference)}`),
};
