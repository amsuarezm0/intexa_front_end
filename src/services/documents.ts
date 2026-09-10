import { api } from '../lib/api';
import type { PeriodInvoice, PeriodPurchase } from './cashflow';

/**
 * The agreed payment date is the one field a Siigo document accepts by hand;
 * everything else there is rewritten by the next sync. Sending an empty string
 * clears the agreement and hands the document back to its original due date.
 */
export const documentsService = {
  setInvoiceSecondaryDueDate: (id: string, secondaryDueDate: string) =>
    api.put<PeriodInvoice>(`/invoices/${id}/secondary-due-date`, { secondaryDueDate }),
  setPurchaseSecondaryDueDate: (id: string, secondaryDueDate: string) =>
    api.put<PeriodPurchase>(`/purchases/${id}/secondary-due-date`, { secondaryDueDate }),
};
