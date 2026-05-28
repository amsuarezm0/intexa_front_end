import { api } from '../lib/api';

export interface NotificationItem {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  daysOverdue: number; // negative = days until due
  urgency: 'overdue' | 'due-soon' | 'upcoming';
}

export interface NotificationSummary {
  count: number;
  gastos: NotificationItem[];
  ingresos: NotificationItem[];
}

export const notificationsService = {
  get: () => api.get<NotificationSummary>('/notifications'),
};
