import { api } from '../lib/api';

export interface SearchDocument {
  id: string;
  docType: 'RC' | 'RP' | 'FV' | 'FC' | 'Manual';
  reference: string;
  date: string;
  dueDate?: string;
  description: string;
  amount: number;
  status: string;
  counterparty: string;
  category: string;
}

export const searchService = {
  search: (reference: string) => api.get<SearchDocument[]>(`/search?reference=${encodeURIComponent(reference)}`),
};
