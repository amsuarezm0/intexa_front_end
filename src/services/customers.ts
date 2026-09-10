import { api } from '../lib/api';
import type { Installment } from './cashflow';

/** An FV as the customer detail endpoint returns it (the full stored invoice). */
export interface CustomerInvoice {
  id: string;
  externalId: string;
  reference?: string;
  prefix?: string;
  number?: number;
  date: string;
  dueDate?: string;
  customerIdentification?: string;
  customerName?: string;
  total: number;
  balance: number;
  status: string;
  category: string;
  detail?: string;
  installments?: Installment[];
  /** Agreed payment date — the only manual edit on a Siigo document. */
  secondaryDueDate?: string;
  /** The date that actually governs: agreed when set, original otherwise. */
  effectiveDueDate?: string;
  /** Days between original and agreed; positive means pushed out. */
  dueDateShiftDays?: number;
}

/** A document's counterparty, resolved against the synced third parties.
 *  `customerId` is empty when the third party has not been synced — the
 *  identification is still present so the document stays legible. */
export interface ThirdParty {
  customerId?: string;
  identification?: string;
  branchOffice?: number;
  siigoId?: string;
  name?: string;
  commercialName?: string;
  type?: CustomerType;
}

/** Siigo's third-party classification, stored in Spanish. */
export type CustomerType = 'Cliente' | 'Proveedor' | 'Otro';

export interface CustomerPhone {
  indicative?: string;
  number: string;
  extension?: string;
}

export interface CustomerContact {
  name: string;
  email?: string;
  phone: CustomerPhone;
}

export interface Customer {
  id: string;
  externalId: string;
  siigoId: string;
  type: CustomerType;
  personType: string;
  idType?: string;
  identification: string;
  checkDigit?: string;
  branchOffice: number;
  name: string;
  commercialName?: string;
  active: boolean;
  vatResponsible: boolean;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  email?: string;
  phone?: string;
  phones?: CustomerPhone[];
  contacts?: CustomerContact[];
  siigoCreatedAt?: string;
  siigoUpdatedAt?: string;
  /** Portfolio roll-up from the invoice table — computed per request. */
  invoiceCount: number;
  totalInvoiced: number;
  pendingBalance: number;
  lastInvoiceDate?: string;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  /** 'all' shows customers, suppliers and other third parties together. */
  type?: CustomerType | 'all';
  active?: 'true' | 'false' | 'all';
  withBalance?: boolean;
  sort?: 'name' | 'pending' | 'invoiced' | 'recent';
}

export interface CustomerListResponse {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerSummary {
  customers: number;
  suppliers: number;
  others: number;
  customersWithDebt: number;
  totalPendingBalance: number;
  totalInvoiced: number;
}

export interface CustomerDetail {
  customer: Customer;
  invoices: CustomerInvoice[];
}

export interface CustomerSyncResult {
  imported: number;
  updated: number;
  total: number;
  errors?: string[];
}

function toQuery(params: CustomerListParams): string {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.search) q.set('search', params.search);
  if (params.type) q.set('type', params.type);
  if (params.active) q.set('active', params.active);
  if (params.withBalance) q.set('withBalance', 'true');
  if (params.sort) q.set('sort', params.sort);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const customersService = {
  list: (params: CustomerListParams = {}) =>
    api.get<CustomerListResponse>(`/customers${toQuery(params)}`),
  summary: () => api.get<CustomerSummary>('/customers/summary'),
  get: (id: string) => api.get<CustomerDetail>(`/customers/${id}`),
  /** Pulls the third-party list from Siigo; the full sync does this too. */
  sync: () => api.post<CustomerSyncResult>('/siigo/sync/customers', {}),
};
