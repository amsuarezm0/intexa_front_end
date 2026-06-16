import ExcelJS from 'exceljs';
import { AlertTriangle,ChevronRight,Download,FileText,Sparkles,TrendingDown,TrendingUp,X } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect,useRef,useState } from 'react';
import { Bar,CartesianGrid,ComposedChart,Line,ReferenceLine,ResponsiveContainer,Tooltip,XAxis,YAxis } from 'recharts';
import { Skeleton,SkeletonCard,SkeletonChart } from '../components/Skeleton';
import { useSettings } from '../contexts/SettingsContext';
import { downloadReportPDF, PDF_BAR_HEX } from '../lib/reportPdf';
import { cn } from '../lib/utils';
import { reportsService,type ReportPeriod,type ReportSummary } from '../services';

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
  mensual: 'Ingresos vs. Egresos — Últimos 6 Meses',
  trimestral: 'Ingresos vs. Egresos — Q1 a Q4 del Año en Curso',
  anual: 'Ingresos vs. Egresos — ENE a DIC del Año en Curso',
};

const CATEGORY_WINDOW: Record<ReportPeriod, string> = {
  mensual: 'Últimos 6 meses vs. 6 meses anteriores',
  trimestral: 'Trimestre en curso vs. trimestre anterior',
  anual: 'Año en curso (YTD) vs. mismo período año anterior',
};

const BREAKDOWN_SUBTITLE: Record<ReportPeriod, string> = {
  mensual: 'Egresos — Últimos 6 meses',
  trimestral: 'Egresos — Trimestre en curso',
  anual: 'Egresos — Año en curso (YTD)',
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

async function downloadXLSX(data: ReportSummary, period: ReportPeriod, formatCurrency: (n: number) => string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Intexa ArCa';

  // Sheet 1: Flujo de Caja
  const wsCash = wb.addWorksheet('Flujo de Caja');
  wsCash.columns = [
    { header: 'Período',    key: 'name',      width: 16 },
    { header: 'Ingresos',   key: 'ingresos',  width: 24 },
    { header: 'Egresos',    key: 'egresos',   width: 24 },
  ];
  wsCash.getRow(1).font = { bold: true };
  wsCash.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  data.cashFlowChart.forEach(p =>
    wsCash.addRow({ name: p.name, ingresos: formatCurrency(p.ingresos), egresos: formatCurrency(p.egresos) })
  );

  // Sheet 2: Gastos por Categoría
  const wsCat = wb.addWorksheet('Gastos por Categoría');
  wsCat.columns = [
    { header: 'Categoría',   key: 'name',   width: 28 },
    { header: 'Porcentaje',  key: 'value',  width: 14 },
  ];
  wsCat.getRow(1).font = { bold: true };
  wsCat.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  data.categoryBreakdown.forEach(c => wsCat.addRow({ name: c.name, value: `${c.value}%` }));

  // Sheet 3: Gasto por Categoría (comparación)
  const wsDev = wb.addWorksheet('Gasto por Categoría');
  wsDev.columns = [
    { header: 'Categoría',         key: 'category',  width: 28 },
    { header: 'Período actual',    key: 'amount',    width: 24 },
    { header: 'Período anterior',  key: 'prev',      width: 24 },
    { header: 'Variación %',       key: 'change',    width: 16 },
    { header: 'Estado',            key: 'status',    width: 12 },
  ];
  wsDev.getRow(1).font = { bold: true };
  wsDev.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  data.categoryTable.forEach(r =>
    wsDev.addRow({
      category: r.category,
      amount:   formatCurrency(r.amount),
      prev:     formatCurrency(r.prev),
      change:   `${r.change > 0 ? '+' : ''}${r.change.toFixed(1)}%`,
      status:   r.isPositive ? 'OK' : 'Alerta',
    })
  );

  // Sheet 4: Resumen
  const wsSum = wb.addWorksheet('Resumen');
  wsSum.columns = [
    { header: 'Indicador', key: 'label',  width: 28 },
    { header: 'Valor',     key: 'value',  width: 24 },
  ];
  wsSum.getRow(1).font = { bold: true };
  wsSum.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  wsSum.addRow({ label: 'Período',           value: period.charAt(0).toUpperCase() + period.slice(1) });
  wsSum.addRow({ label: 'Flujo positivo',    value: `${data.complianceRate}%` });
  wsSum.addRow({ label: 'Cierre Proyectado', value: formatCurrency(data.annual.projectedClose) });
  wsSum.addRow({ label: 'Probabilidad',      value: `${data.annual.probability}%` });
  wsSum.addRow({ label: 'Insight',           value: data.annual.insightText });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-${period}-arca.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsView() {
  const [data, setData] = useState<ReportSummary>({ cashFlowChart: [], categoryBreakdown: [], categoryTable: [], annual: { projectedClose: 0, probability: 0, insightText: '—' }, complianceRate: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [showInsight, setShowInsight] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<ReportPeriod>('mensual');
  const chartCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    setError('');
    reportsService.getSummary(period)
      .then(setData)
      .catch((err: any) => setError(err.message ?? 'No se pudo cargar los reportes.'))
      .finally(() => setIsLoading(false));
  }, [period]);

  const { formatCurrency, formatCompact } = useSettings();

  async function handleDownloadPDF() {
    if (!chartCardRef.current || isPdfExporting) return;
    setIsPdfExporting(true);
    try {
      await downloadReportPDF(data, period, formatCurrency, chartCardRef.current);
    } finally {
      setIsPdfExporting(false);
    }
  }

  if (error) return <div className="p-8 text-brand-danger font-semibold">{error}</div>;
  if (isLoading) {
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
            onClick={async () => {
              if (!data || isExporting) return;
              setIsExporting(true);
              try { await downloadXLSX(data, period, formatCurrency); }
              finally { setIsExporting(false); }
            }}
            disabled={!data || isLoading || isExporting || isPdfExporting}
            className="flex items-center gap-2 bg-brand-dark text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-accent transition-all shadow-lg shadow-brand-dark/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={20} /><span>{isExporting ? 'Generando...' : 'Excel'}</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={!data || isLoading || isPdfExporting || isExporting}
            className="flex items-center gap-2 bg-brand-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-accent transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={20} /><span>{isPdfExporting ? 'Generando PDF...' : 'PDF'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div ref={chartCardRef} className="lg:col-span-2 bg-white p-5 sm:p-10 rounded-3xl sm:rounded-[48px] border border-slate-100 card-shadow flex flex-col">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{CHART_TITLES[period]}</h3>
              <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-tight">{CHART_SUBTITLES[period]}</p>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-brand-success" /><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">INGRESOS</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-brand-danger" /><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">EGRESOS</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-brand-primary" /><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">NETO</span></div>
            </div>
          </div>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.cashFlowChart.map(p => ({ ...p, net: p.ingresos - p.egresos }))} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barGap={0}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DBDCDE" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#88898D', fontSize: 10, fontWeight: 800 }} dy={8} />
                <YAxis hide />
                <ReferenceLine y={0} stroke="#B8B8BB" strokeDasharray="4 4" />
                <Tooltip
                  cursor={{ fill: '#EDEDEE' }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                  formatter={(value: number, name: string) => [formatCompact(value), name]}
                />
                <Bar dataKey="ingresos" name="Ingresos" fill="#7A9A01" radius={[8, 8, 0, 0]} barSize={24} />
                <Bar dataKey="egresos" name="Egresos" fill="#D86018" radius={[8, 8, 0, 0]} barSize={24} />
                <Line dataKey="net" name="Neto" type="monotone" stroke="#F2A900" strokeWidth={2.5} dot={{ r: 4, fill: '#F2A900', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-10 rounded-3xl sm:rounded-[48px] border border-slate-100 card-shadow">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Gastos por Categoría</h3>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight mb-8">{BREAKDOWN_SUBTITLE[period]}</p>
          <div className="space-y-8">
            {data.categoryBreakdown.map((cat, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>{cat.name}</span><span className="text-slate-900">{cat.value}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${cat.value}%`, backgroundColor: PDF_BAR_HEX[i % PDF_BAR_HEX.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl sm:rounded-[48px] border border-slate-100 card-shadow overflow-hidden">
        <div className="p-5 sm:p-10 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Gasto por Categoría</h3>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{CATEGORY_WINDOW[period]}</p>
          </div>
          <span className="bg-brand-success/10 text-brand-success text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-brand-success/20">FLUJO POSITIVO: {data.complianceRate}%</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                {['CATEGORÍA', 'PERÍODO ACTUAL', 'PERÍODO ANTERIOR', 'VARIACIÓN', 'TENDENCIA'].map(h => (
                  <th key={h} className={cn("px-4 sm:px-10 py-3 sm:py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest", h !== 'CATEGORÍA' && 'text-right')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data.categoryTable ?? []).map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors cursor-default">
                  <td className="px-4 sm:px-10 py-4 sm:py-8 text-sm font-black text-slate-900">{row.category}</td>
                  <td className="px-4 sm:px-10 py-4 sm:py-8 text-sm font-black text-slate-900 text-right">{formatCurrency(row.amount)}</td>
                  <td className="px-4 sm:px-10 py-4 sm:py-8 text-sm font-bold text-slate-400 text-right">{row.prev > 0 ? formatCurrency(row.prev) : '—'}</td>
                  <td className={cn("px-4 sm:px-10 py-4 sm:py-8 text-sm font-black text-right", row.prev === 0 ? 'text-slate-400' : row.isPositive ? 'text-brand-success' : 'text-brand-danger')}>
                    {row.prev === 0 ? 'Nuevo' : `${row.change > 0 ? '+' : ''}${row.change.toFixed(1)}%`}
                  </td>
                  <td className="px-4 sm:px-10 py-4 sm:py-8 text-right">
                    {row.prev > 0 && (
                      <div className={cn("flex justify-end", row.isPositive ? "text-brand-success" : "text-brand-danger")}>
                        {row.isPositive ? <TrendingDown size={24} /> : <TrendingUp size={24} />}
                      </div>
                    )}
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
            <button onClick={() => setShowInsight(true)} className="mt-12 bg-white text-brand-dark py-4 px-8 rounded-2xl font-black uppercase text-xs tracking-widest self-start hover:scale-[1.02] transition-all">Ver Recomendación</button>
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
                <p className="text-2xl font-black text-slate-900" title={formatCurrency(data.annual.projectedClose)}>{formatCompact(data.annual.projectedClose)}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-[32px]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TASA DE ÉXITO HISTÓRICO</p>
                <p className="text-2xl font-black text-brand-success">{data.annual.probability}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showInsight && (() => {
        const alerts = (data.categoryTable ?? []).filter(r => !r.isPositive && r.prev > 0).slice(0, 4);
        const isHealthy = data.annual.probability >= 60;
        return (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowInsight(false)}>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-brand-dark p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.04] rounded-full -mr-16 -mt-16" />
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Sparkles size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Eficiencia Financiera</p>
                      <h2 className="text-xl font-black text-white tracking-tight">Recomendación</h2>
                    </div>
                  </div>
                  <button onClick={() => setShowInsight(false)} className="text-white/40 hover:text-white transition-colors mt-0.5">
                    <X size={20} />
                  </button>
                </div>
                <p className="relative z-10 mt-5 text-sm font-semibold text-white/70 leading-relaxed">{data.annual.insightText}</p>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                {alerts.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categorías con Sobregasto</p>
                    {alerts.map((row, i) => (
                      <div key={i} className="flex items-center justify-between bg-brand-danger/5 border border-brand-danger/10 rounded-2xl px-5 py-4">
                        <div className="flex items-center gap-3">
                          <AlertTriangle size={16} className="text-brand-danger flex-shrink-0" />
                          <span className="text-sm font-bold text-slate-800">{row.category}</span>
                        </div>
                        <span className="text-sm font-black text-brand-danger">+{row.change.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-brand-success/5 border border-brand-success/10 rounded-2xl px-5 py-4">
                    <TrendingDown size={16} className="text-brand-success" />
                    <span className="text-sm font-bold text-slate-700">Todos los egresos dentro de rangos previos.</span>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones Sugeridas</p>
                  <ul className="space-y-2">
                    {!isHealthy && <li className="flex items-start gap-2 text-sm text-slate-600 font-medium"><span className="text-brand-danger mt-0.5">•</span>Revisa los egresos con mayor variación positiva y establece límites por categoría.</li>}
                    {alerts.length > 0 && <li className="flex items-start gap-2 text-sm text-slate-600 font-medium"><span className="text-brand-primary mt-0.5">•</span>Negocia con proveedores en las categorías de sobregasto para reducir costos recurrentes.</li>}
                    <li className="flex items-start gap-2 text-sm text-slate-600 font-medium"><span className="text-brand-primary mt-0.5">•</span>Mantén un fondo de contingencia equivalente a 2 meses de egresos promedio.</li>
                    {isHealthy && <li className="flex items-start gap-2 text-sm text-slate-600 font-medium"><span className="text-brand-success mt-0.5">•</span>Flujo positivo sostenido — considera reinvertir el excedente en proyecciones de crecimiento.</li>}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-50 rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tasa de Éxito Histórico</p>
                    <p className={cn("text-2xl font-black", data.annual.probability >= 60 ? 'text-brand-success' : 'text-brand-danger')}>{data.annual.probability}%</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Categorías en Alerta</p>
                    <p className={cn("text-2xl font-black", alerts.length === 0 ? 'text-brand-success' : 'text-brand-danger')}>{alerts.length}</p>
                  </div>
                </div>

                <button onClick={() => setShowInsight(false)} className="w-full bg-brand-dark text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-brand-accent transition-all">
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}
    </motion.div>
  );
}
