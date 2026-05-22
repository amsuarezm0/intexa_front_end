import { Transaction, StatCardData, ChartDataPoint } from './types';

export const mockStats: StatCardData[] = [
  {
    title: "SALDO ACTUAL",
    value: "$45.890,00",
    change: "+12.5%",
    isPositive: true,
    trendText: "vs mes ant.",
    icon: "Building2"
  },
  {
    title: "INGRESOS MES",
    value: "$12.450,00",
    change: "94% de la meta",
    isPositive: true,
    trendText: "",
    icon: "ArrowDownCircle"
  },
  {
    title: "EGRESOS MES",
    value: "$8.210,50",
    change: "+2.4% vs proyectado",
    isPositive: false,
    trendText: "",
    icon: "ArrowUpCircle"
  }
];

export const mockTransactions: Transaction[] = [
  {
    id: "1",
    date: "12 Oct, 2023",
    description: "Servicios Cloud Amazon Web Services",
    category: "Tecnología",
    type: "Egreso",
    amount: 12450.00,
    status: "Completado",
    reference: "AWS-MONTHLY-OCT"
  },
  {
    id: "2",
    date: "11 Oct, 2023",
    description: "Pago Factura #4562 - Intexa Corp",
    category: "Ventas",
    type: "Ingreso",
    amount: 85200.00,
    status: "Completado",
    reference: "#INV-98234-A"
  },
  {
    id: "3",
    date: "10 Oct, 2023",
    description: "Nómina Operativa - Q1 Octubre",
    category: "Personal",
    type: "Egreso",
    amount: 45000.00,
    status: "Pendiente"
  },
  {
    id: "4",
    date: "09 Oct, 2023",
    description: "Intereses Bancarios Cuenta Maestra",
    category: "Finanzas",
    type: "Ingreso",
    amount: 1230.45,
    status: "Completado"
  }
];

export const mockChartData: ChartDataPoint[] = [
  { name: "ENE", ingresos: 4500, egresos: 3000, saldo: 4000 },
  { name: "FEB", ingresos: 5200, egresos: 3200, saldo: 5000 },
  { name: "MAR", ingresos: 3800, egresos: 4000, saldo: 4200 },
  { name: "ABR", ingresos: 4800, egresos: 3500, saldo: 4800 },
  { name: "MAY", ingresos: 7200, egresos: 4200, saldo: 6500 },
  { name: "JUN", ingresos: 5800, egresos: 3800, saldo: 4500 },
  { name: "JUL", ingresos: 4900, egresos: 3600, saldo: 4200 },
];
