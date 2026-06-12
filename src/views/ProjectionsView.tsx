import { Building2,Plus,TrendingDown,TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect,useState } from 'react';
import { Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis } from 'recharts';
import type { LoggedInUser } from '../App';
import { ProjectionTable } from '../components/ProjectionTable';
import { Skeleton,SkeletonCard,SkeletonChart } from '../components/Skeleton';
import { TransactionDetailDrawer } from '../components/TransactionDetailDrawer';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';
import { projectionsService,searchService,transactionsService,type ProjectionAlert,type ProjectionSummary,type SearchDocument,type Transaction } from '../services';

const FV_FC_RE = /^(FV|FC)-/i;

function searchDocToTransaction(doc: SearchDocument, alert: ProjectionAlert): Transaction {
  return {
    id:           doc.id,
    date:         doc.date,
    description:  doc.reference || doc.description,
    category:     doc.category,
    type:         alert.color === 'brand-success' ? 'Ingreso' : 'Egreso',
    amount:       doc.amount,
    status:       doc.status as Transaction['status'],
    reference:    doc.reference,
    detail:       doc.description,
    source:       'Siigo',
    isProjection: false,
    createdAt:    doc.date,
    updatedAt:    doc.date,
  };
}

const PERIODS = [30, 60, 90] as const;
type Period = 30 | 60 | 90;

export function ProjectionsView({ onCreateProjection, user }: { onCreateProjection?: () => void; user?: LoggedInUser | null }) {
  const [dataMap, setDataMap] = useState<Partial<Record<Period, ProjectionSummary>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartPeriod, setChartPeriod] = useState<Period>(30);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  function handleAlertClick(alert: ProjectionAlert) {
    setSelectedTx(null);
    setTxLoading(true);
    // FV/FC alerts live in the invoices/purchases tables — search by document reference.
    // Manual projection alerts live in transactions — look up directly by id.
    const reference = alert.title.split(' · ')[0].trim();
    if (FV_FC_RE.test(reference)) {
      searchService.search(reference)
        .then(docs => { if (docs[0]) setSelectedTx(searchDocToTransaction(docs[0], alert)); })
        .finally(() => setTxLoading(false));
    } else {
      transactionsService.get(alert.id)
        .then(setSelectedTx)
        .finally(() => setTxLoading(false));
    }
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

  const periodAlerts = dataMap[chartPeriod]?.alerts ?? [];

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
          className="flex items-center gap-2 bg-brand-warning text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-accent transition-colors shadow-lg shadow-brand-warning/20 text-sm"
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
                    <TrendingUp size={14} className={isActive ? "text-white/80" : "text-brand-success"} />
                    <span className={cn("text-xs font-bold uppercase tracking-widest", isActive ? "text-white/60" : "text-slate-400")}>Ingresos</span>
                  </div>
                  <span className={cn("text-sm font-extrabold", isActive ? "text-white/90" : "text-brand-success")} title={p ? formatCurrency(p.projectedIncome) : undefined}>
                    {p ? formatCompact(p.projectedIncome) : '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={14} className={isActive ? "text-white/80" : "text-brand-danger"} />
                    <span className={cn("text-xs font-bold uppercase tracking-widest", isActive ? "text-white/60" : "text-slate-400")}>Egresos</span>
                  </div>
                  <span className={cn("text-sm font-extrabold", isActive ? "text-brand-warning" : "text-brand-danger")} title={p ? formatCurrency(p.projectedExpenses) : undefined}>
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
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-brand-danger/20" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Zona de Déficit</span></div>
          </div>
        </div>
        <div className="h-[210px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7A9A01" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7A9A01" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDeficit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D86018" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#D86018" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDEDEE" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#88898D' }} dy={10} />
              <YAxis hide />
              <Tooltip cursor={false} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="val" stroke="#7A9A01" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              <Area type="monotone" dataKey="deficit" stroke="transparent" fillOpacity={1} fill="url(#colorDeficit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ingresos / Egresos tables — driven by the selected period card */}
      <div className="space-y-3">
        <div className="px-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Proyección a {chartPeriod} días
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProjectionTable type="income"  rows={periodAlerts} onRowClick={handleAlertClick} />
          <ProjectionTable type="expense" rows={periodAlerts} onRowClick={handleAlertClick} />
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
