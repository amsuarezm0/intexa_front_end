import { api } from '../lib/api';

export interface SiigoSyncResponse {
  message: string;
  synced: number;
}

export const siigoService = {
  sync: () => api.post<SiigoSyncResponse>('/siigo/sync', {}),
};
