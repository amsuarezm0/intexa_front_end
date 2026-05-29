import { AlertCircle,Building2,Clock,FileCheck,Plus,TrendingDown,TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect,useState } from 'react';
import { Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis } from 'recharts';
import type { LoggedInUser } from '../App';
import { Skeleton,SkeletonCard,SkeletonChart } from '../components/Skeleton';
import { TransactionDetailDrawer } from '../components/TransactionDetailDrawer';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';
import { projectionsService,transactionsService,type ProjectionSummary,type Transaction } from '../services';

const iconMap: Record<string, any> = { AlertCircle, FileCheck, Clock };

const PERIODS = [30, 60, 90] as const;
type Period = 30 | 60 | 90;

export function ProjectionsView({ onCreateProjection, user }: { onCreateProjection?: () => void; user?: LoggedInUser | null }) {
  const [dataMap, setDataMap] = useState<Partial<Record<Period, ProjectionSummary>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartPeriod, setChartPeriod] = useState<Period>(30);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [txLoading, setTxLoading] = useState(false);

  function handleAlertClick(id: string) {
    setSelectedTx(null);
    setTxLoading(true);
    transactionsService.get(id)
      .then(setSelectedTx)
      .finally(() => setTxLoading(false));
  }

  useEffect(() => {
    setIsLoading(true);
    setError('');
    Promise.all(PERIODS.map(d => projectionsService.getSummary(d).then(r => [d, r] as [Period, ProjectionSummary])))
      .then(results => {
        const map: Partial<Record<Period, ProjectionSummary>> = {};
        results.forEach(([d, r]) => { map[d] = r; });
        setDataMap(map);
      })
      .catch(() => setError('No se pudo cargar las proyecciones.'))
      .finally(() => setIsLoading(false));
  }, []);

  const { formatCurrency, formatCompact } = useSettings();

  if (error) return <div className="p-8 text-brand-danger font-semibold">{error}</div>;
  if (isLoading || !dataMap[30]) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-96 mb-8" />
        <SkeletonChart />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }

  const chartData = dataMap[chartPeriod]?.chartData ?? [];

  return (
    <>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Proyecciones Financieras</h1>
          <p className="text-slate-500 font-medium tracking-tight">Análisis predictivo de flujo de caja para la toma de decisiones estratégicas.</p>
        </div>
        <button
          onClick={onCreateProjection}
          className="flex items-center gap-2 bg-brand-dark text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-accent transition-colors shadow-lg shadow-brand-dark/20 text-sm"
        >
          <Plus size={18} /><span>Agregar proyección manual</span>
        </button>
      </div>

      {/* Comparison cards — all 3 periods always visible */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {PERIODS.map(d => {
          const p = dataMap[d];
          const isActive = d === chartPeriod;
          return (
            <button
              key={d}
              onClick={() => setChartPeriod(d)}
              className={cn(
                "text-left p-5 sm:p-8 rounded-3xl sm:rounded-[40px] border transition-all group",
                isActive
                  ? "bg-brand-dark border-brand-dark shadow-2xl shadow-brand-dark/20"
                  : "bg-white border-slate-100 card-shadow hover:border-slate-200"
              )}
            >
              <div className="flex justify-between items-start mb-6">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                  isActive
                    ? "text-white/70 border-white/20 bg-white/10"
                    : "text-slate-400 border-slate-200 bg-slate-50"
                )}>{d} DÍAS</span>
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all",
                  isActive ? "bg-white scale-125" : "bg-slate-200 group-hover:bg-brand-primary/40"
                )} />
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className={isActive ? "text-emerald-400" : "text-brand-success"} />
                    <span className={cn("text-xs font-bold uppercase tracking-widest", isActive ? "text-white/60" : "text-slate-400")}>Ingresos</span>
                  </div>
                  <span className={cn("text-sm font-extrabold", isActive ? "text-emerald-400" : "text-brand-success")} title={p ? formatCurrency(p.projectedIncome) : undefined}>
                    {p ? formatCompact(p.projectedIncome) : '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={14} className={isActive ? "text-red-400" : "text-brand-danger"} />
                    <span className={cn("text-xs font-bold uppercase tracking-widest", isActive ? "text-white/60" : "text-slate-400")}>Egresos</span>
                  </div>
                  <span className={cn("text-sm font-extrabold", isActive ? "text-red-400" : "text-brand-danger")} title={p ? formatCurrency(p.projectedExpenses) : undefined}>
                    {p ? formatCompact(p.projectedExpenses) : '—'}
                  </span>
                </div>

                <div className={cn("pt-4 border-t", isActive ? "border-white/10" : "border-slate-100")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className={isActive ? "text-white/60" : "text-slate-400"} />
                      <span className={cn("text-xs font-bold uppercase tracking-widest", isActive ? "text-white/60" : "text-slate-400")}>Saldo Est.</span>
                    </div>
                    <span className={cn("text-base font-black", isActive ? "text-white" : "text-slate-900")} title={p ? formatCurrency(p.estimatedBalance) : undefined}>
                      {p ? formatCompact(p.estimatedBalance) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Chart — driven by the selected period card */}
      <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[40px] border border-slate-100 card-shadow h-[360px] sm:h-[450px] relative overflow-hidden group">
        <div className="flex justify-between items-start mb-6 sm:mb-12">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">TENDENCIA DE SALDO — {chartPeriod} DÍAS</p>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Saldo Proyectado vs. Umbral de Seguridad</h3>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-brand-success" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Saldo Disponible</span></div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#EF444433]" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Zona de Déficit</span></div>
          </div>
        </div>
        <div className="h-[210px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDeficit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
              <YAxis hide />
              <Tooltip cursor={false} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="val" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              <Area type="monotone" dataKey="deficit" stroke="transparent" fillOpacity={1} fill="url(#colorDeficit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts from the active period */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Vencimientos y Alertas</h3>
        <div className="space-y-4">
          {(dataMap[chartPeriod]?.alerts ?? []).map(alert => {
            const Icon = iconMap[alert.icon] ?? AlertCircle;
            return (
              <div key={alert.id} onClick={() => handleAlertClick(alert.id)} className={cn(
                "p-4 sm:p-6 rounded-2xl sm:rounded-[32px] border transition-all cursor-pointer group flex items-start gap-4 sm:gap-6",
                alert.color === 'brand-danger' ? "bg-brand-danger/[0.03] border-brand-danger/10 hover:bg-brand-danger/[0.08]" :
                alert.color === 'brand-success' ? "bg-brand-success/[0.03] border-brand-success/10 hover:bg-brand-success/[0.08]" :
                "bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-200/50"
              )}>
                <div className={cn("p-3 rounded-2xl shrink-0",
                  alert.color === 'brand-danger' ? "bg-brand-danger text-white shadow-lg shadow-brand-danger/20" :
                  alert.color === 'brand-success' ? "bg-brand-success text-white shadow-lg shadow-brand-success/20" :
                  "bg-brand-dark text-white"
                )}>
                  <Icon size={22} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-900">{alert.title}</h4>
                    <span className={cn("text-[10px] font-black uppercase tracking-widest",
                      alert.color === 'brand-danger' ? "text-brand-danger" : alert.color === 'brand-success' ? "text-brand-success" : "text-brand-danger"
                    )}>{alert.dueDate}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500">{alert.description}</p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm font-black text-slate-900" title={formatCurrency(alert.amount)}>
                    {formatCompact(alert.amount)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>

    <TransactionDetailDrawer
      transaction={selectedTx}
      isLoading={txLoading}
      onClose={() => { setSelectedTx(null); setTxLoading(false); }}
    />
    </>
  );
}
