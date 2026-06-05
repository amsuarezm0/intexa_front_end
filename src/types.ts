export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'Ingreso' | 'Egreso';
  amount: number;
  status: 'Completado' | 'Pendiente' | 'Anulado';
  reference?: string;
}

export interface StatCardData {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  trendText: string;
  icon: string;
}

export interface ChartDataPoint {
  name: string;
  ingresos: number;
  egresos: number;
  saldo: number;
}
