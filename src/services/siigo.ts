import { api } from '../lib/api';

export type SiigoSyncMode = 'incremental' | 'bootstrap' | 'reconcile';

export interface SiigoSyncRequest {
  mode: SiigoSyncMode;
  dateStart?: string; // required for bootstrap
  dateEnd?: string;
}

export interface SiigoSyncResult {
  mode: SiigoSyncMode;
  dateStart: string;
  dateEnd: string;
  invoicesImported: number;
  purchasesImported: number;
  vouchersImported: number;
  paymentReceiptsImported: number;
  updated: number;
}

export const siigoService = {
  sync: (req: SiigoSyncRequest) => api.post<SiigoSyncResult>('/siigo/sync', req),
};
