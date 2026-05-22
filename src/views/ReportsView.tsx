import { useState, useEffect } from 'react';
import { Download, CheckCircle2, AlertCircle, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton, SkeletonCard, SkeletonChart } from '../components/Skeleton';
import { reportsService, type ReportSummary, type ReportPeriod } from '../services';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';

const PERIODS: { key: ReportPeriod; label: string }[] = [
  { key: 'mensual', label: 'Mensual' },
  { key: 'trimestral', label: 'Trimestral' },
  { key: 'anual', label: 'Anual' },
];

const CHART_TITLES: Record<ReportPeriod, string> = {
  mensual: 'Flujo de Caja Mensual',
  trimestral: 'Flujo de Caja Trimestral',
  anual: 'Flujo de Caja Anual',
};

const CHART_SUBTITLES: Record<ReportPeriod, string> = {
  mensual: 'Ejecutado vs. Presupuesto — Últimos 6 Meses (COP)',
  trimestral: 'Ejecutado vs. Presupuesto — Q1 a Q4 del Año en Curso (COP)',
  anual: 'Ejecutado vs. Presupuesto — ENE a DIC del Año en Curso (COP)',
};

const DEVIATION_WINDOW: Record<ReportPeriod, string> = {
  mensual: 'Mes en curso',
  trimestral: 'Trimestre en curso',
  anual: 'Año en curso (YTD)',
};

const PROJECTION_META: Record<ReportPeriod, { title: string; desc: string }> = {
  mensual: {
    title: 'Proyección al Cierre del Año',
    desc: 'Basado en el promedio mensual de los últimos 3 meses, Intexa ArCa proyecta el cierre del año.',
  },
  trimestral: {
    title: 'Proyección al Cierre del Año',
    desc: 'Basado en el promedio de los trimestres anteriores, Intexa ArCa proyecta los trimestres restantes.',
  },
  anual: {
    title: 'Proyección al Cierre del Año',
    desc: 'Basado en el ritmo acumulado del año en curso, Intexa ArCa proyecta el cierre de diciembre.',
  },
};

function downloadCSV(data: ReportSummary, period: ReportPeriod, formatCurrency: (n: number) => string) {
  const rows: string[][] = [];

  rows.push([`Reporte ${period.charAt(0).toUpperCase() + period.slice(1)} — INTEXA ARCA`]);
  rows.push([]);

  rows.push(['Flujo de Caja']);
  rows.push(['Período', 'Ejecutado', 'Presupuesto']);
  data.cashFlowChart.forEach(p => rows.push([p.name, String(p.ejecutado), String(p.presupuesto)]));
  rows.push([]);

  rows.push(['Gastos por Categoría']);
  rows.push(['Categoría', 'Porcentaje']);
  data.categoryBreakdown.forEach(c => rows.push([c.name, `${c.value}%`]));
  rows.push([]);

  rows.push(['Análisis de Desviación']);
  rows.push(['Categoría', 'Presupuesto', 'Ejecutado Real', 'Desviación', 'Estado']);
  data.deviationTable.forEach(r =>
    rows.push([
      r.category,
      formatCurrency(r.budget),
      formatCurrency(r.actual),
      `${r.isPositive ? '+' : ''}${formatCurrency(r.deviation)}`,
      r.isPositive ? 'OK' : 'Alerta',
    ])
  );
  rows.push([]);
  rows.push(['Cumplimiento', `${data.complianceRate}%`]);
  rows.push(['Cierre Proyectado', formatCurrency(data.annual.projectedClose)]);
  rows.push(['Probabilidad', `${data.annual.probability}%`]);

  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-${period}-arca.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsView() {
  const [data, setData] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<ReportPeriod>('mensual');

  useEffect(() => {
    setIsLoading(true);
    setError('');
    reportsService.getSummary(period)
      .then(setData)
      .catch(() => setError('No se pudo cargar los reportes.'))
      .finally(() => setIsLoading(false));
  }, [period]);

  const { formatCurrency } = useSettings();

  if (error) return <div className="p-8 text-brand-danger font-semibold">{error}</div>;
  if (isLoading || !data) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2"><SkeletonChart /></div>
          <SkeletonCard />
        </div>
        <div className="bg-white h-96 w-full rounded-[40px]"><Skeleton className="h-full w-full" /></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            <span>INTEXA ARCA</span><ChevronRight size={10} /><span>ANÁLISIS PREDICTIVO</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Módulo de Reportes</h1>
          <p className="text-slate-500 font-medium tracking-tight">Analiza la salud financiera con precisión editorial y visualizaciones dinámicas.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-slate-100 p-1.5 rounded-2xl flex border border-slate-200">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={cn("px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all uppercase tracking-widest", period === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => data && downloadCSV(data, period, formatCurrency)}
            disabled={!data || isLoading}
            className="flex items-center gap-2 bg-brand-dark text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-accent transition-all shadow-lg shadow-brand-dark/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={20} /><span>Descargar CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-5 sm:p-10 rounded-3xl sm:rounded-[48px] border border-slate-100 card-shadow">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{CHART_TITLES[period]}</h3>
              <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-tight">{CHART_SUBTITLES[period]}</p>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-brand-success" /><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">EJECUTADO</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-brand-primary" /><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PRESUPUESTO</span></div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.cashFlowChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800 }} dy={15} />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="ejecutado" fill="#10B981" radius={[8, 8, 0, 0]} barSize={24} />
                <Bar dataKey="presupuesto" fill="#003366" radius={[8, 8, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-10 rounded-3xl sm:rounded-[48px] border border-slate-100 card-shadow">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-8">Gastos por Categoría</h3>
          <div className="space-y-8">
            {data.categoryBreakdown.map((cat, i) => {
              const colors = ['bg-brand-primary', 'bg-brand-success', 'bg-blue-400', 'bg-brand-danger'];
              return (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>{cat.name}</span><span className="text-slate-900">{cat.value}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-1000", colors[i % colors.length])} style={{ width: `${cat.value}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl sm:rounded-[48px] border border-slate-100 card-shadow overflow-hidden">
        <div className="p-5 sm:p-10 border-b border-slate-100 flex justify-between items-center">
          <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Análisis de Desviación</h3>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{DEVIATION_WINDOW[period]}</p>
            </div>
          <span className="bg-brand-success/10 text-brand-success text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-brand-success/20">CUMPLIMIENTO: {data.complianceRate}%</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                {['CATEGORÍA', 'PRESUPUESTO', 'EJECUTADO REAL', 'DESVIACIÓN', 'ESTADO'].map(h => (
                  <th key={h} className={cn("px-4 sm:px-10 py-3 sm:py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest", h !== 'CATEGORÍA' && 'text-right')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.deviationTable.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors cursor-default">
                  <td className="px-4 sm:px-10 py-4 sm:py-8 text-sm font-black text-slate-900">{row.category}</td>
                  <td className="px-4 sm:px-10 py-4 sm:py-8 text-sm font-bold text-slate-400 text-right">{formatCurrency(row.budget)}</td>
                  <td className="px-4 sm:px-10 py-4 sm:py-8 text-sm font-black text-brand-success text-right">{formatCurrency(row.actual)}</td>
                  <td className={cn("px-4 sm:px-10 py-4 sm:py-8 text-sm font-black text-right", row.isPositive ? "text-brand-success" : "text-brand-danger")}>
                    {row.isPositive ? '+' : ''}{formatCurrency(row.deviation)}
                  </td>
                  <td className="px-4 sm:px-10 py-4 sm:py-8 text-right">
                    <div className={cn("flex justify-end", row.isPositive ? "text-brand-success" : "text-brand-danger")}>
                      {row.isPositive ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 bg-brand-dark rounded-3xl sm:rounded-[48px] p-6 sm:p-12 text-white relative overflow-hidden group">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mb-8"><Sparkles size={32} /></div>
            <div className="space-y-4">
              <h3 className="text-3xl font-black tracking-tight leading-tight">Insight de Eficiencia</h3>
              <p className="text-base font-semibold opacity-60 leading-relaxed">{data.annual.insightText}</p>
            </div>
            <button className="mt-12 bg-white text-brand-dark py-4 px-8 rounded-2xl font-black uppercase text-xs tracking-widest self-start hover:scale-[1.02] transition-all">Ver Recomendación</button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.03] rounded-full -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-1000" />
        </div>

        <div className="lg:col-span-3 bg-white p-6 sm:p-12 rounded-3xl sm:rounded-[48px] border border-slate-100 card-shadow flex gap-6 sm:gap-12 items-center">
          <div className="flex-1 space-y-8">
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{PROJECTION_META[period].title}</h3>
              <p className="text-base font-semibold text-slate-400 leading-relaxed">{PROJECTION_META[period].desc}</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-slate-50 rounded-[32px]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CIERRE PROYECTADO</p>
                <p className="text-2xl font-black text-slate-900">{formatCurrency(data.annual.projectedClose)}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-[32px]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PROBABILIDAD</p>
                <p className="text-2xl font-black text-brand-success">{data.annual.probability}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
