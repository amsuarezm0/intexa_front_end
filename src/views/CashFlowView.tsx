import { AlertTriangle,ArrowDownCircle,ArrowDownLeft,ArrowUpRight,ChevronLeft,ChevronRight,Filter,Plus,TrendingUp,X } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect,useMemo,useState } from 'react';
import { Skeleton,SkeletonCard } from '../components/Skeleton';
import { StatusBadge } from '../components/StatusBadge';
import { TransactionDetailDrawer } from '../components/TransactionDetailDrawer';
import { useSettings } from '../contexts/SettingsContext';
import { canWrite } from '../lib/roles';
import { cn } from '../lib/utils';
import { cashFlowService,transactionsService,type CashFlowSummary,type Transaction } from '../services';

type Period = 'day' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = { day: 'Día', week: 'Semana', month: 'Mes' };
const PERIOD_ORDER: Period[] = ['day', 'week', 'month'];

const DAYS_ES = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Parse ISO date "2025-05-22" → Date (local time, no UTC shift)
function parseTxDate(str: string): Date {
  const [y, m, d] = str.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

interface ChartPoint { label: string; date: number; ingresos: number; egresos: number; pendingIngresos: number; pendingEgresos: number; proyIngresos: number; proyEgresos: number; }

function sumTxs(txs: Transaction[]) {
  const completed = txs.filter(t => !t.isProjection && t.status === 'Completado');
  const pending   = txs.filter(t => !t.isProjection && t.status === 'Pendiente');
  const proj      = txs.filter(t => t.isProjection);
  return {
    ingresos:        completed.filter(t => t.type === 'Ingreso').reduce((s, t) => s + t.amount, 0),
    egresos:         completed.filter(t => t.type === 'Egreso').reduce((s, t) => s + t.amount, 0),
    pendingIngresos: pending.filter(t => t.type === 'Ingreso').reduce((s, t) => s + t.amount, 0),
    pendingEgresos:  pending.filter(t => t.type === 'Egreso').reduce((s, t) => s + t.amount, 0),
    proyIngresos:    proj.filter(t => t.type === 'Ingreso').reduce((s, t) => s + t.amount, 0),
    proyEgresos:     proj.filter(t => t.type === 'Egreso').reduce((s, t) => s + t.amount, 0),
  };
}

function buildChart(txs: Transaction[], period: Period, ref: Date): ChartPoint[] {
  if (period === 'week') {
    const dow = ref.getDay();
    const mon = new Date(ref);
    mon.setDate(ref.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const day = txs.filter(tx => dateKey(parseTxDate(tx.date)) === dateKey(d));
      return { label: DAYS_ES[d.getDay()], date: d.getDate(), ...sumTxs(day) };
    });
  }

  if (period === 'day') {
    const dayTxs = txs.filter(tx => dateKey(parseTxDate(tx.date)) === dateKey(ref));
    const { ingresos, egresos, proyIngresos, proyEgresos } = sumTxs(dayTxs);
    const realIn  = dayTxs.filter(t => !t.isProjection && t.type === 'Ingreso');
    const realEg  = dayTxs.filter(t => !t.isProjection && t.type === 'Egreso');
    const projAll = dayTxs.filter(t => t.isProjection);
    return [
      {
        label: 'TOTAL', date: dayTxs.length, ingresos, egresos, proyIngresos, proyEgresos,
        pendingIngresos: 0,
        pendingEgresos: 0
      },
      {
        label: 'INGRESOS', date: realIn.length, ingresos, egresos: 0, proyIngresos: 0, proyEgresos: 0,
        pendingIngresos: 0,
        pendingEgresos: 0
      },
      {
        label: 'EGRESOS', date: realEg.length, ingresos: 0, egresos, proyIngresos: 0, proyEgresos: 0,
        pendingIngresos: 0,
        pendingEgresos: 0
      },
      {
        label: 'PROYECCIONES', date: projAll.length, ingresos: 0, egresos: 0, proyIngresos, proyEgresos,
        pendingIngresos: 0,
        pendingEgresos: 0
      },
    ];
  }

  // month → one column per day
  const firstDay = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const lastDay  = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  const points: ChartPoint[] = [];
  let cur = new Date(firstDay);
  while (cur <= lastDay) {
    const day = txs.filter(tx => dateKey(parseTxDate(tx.date)) === dateKey(cur));
    points.push({ label: DAYS_ES[cur.getDay()], date: cur.getDate(), ...sumTxs(day) });
    cur.setDate(cur.getDate() + 1);
  }
  return points;
}

function periodTitle(period: Period, d: Date): string {
  if (period === 'day') {
    return `${DAYS_ES[d.getDay()]}, ${d.getDate()} de ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
  }
  if (period === 'week') {
    const dow = d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return mon.getMonth() === sun.getMonth()
      ? `${mon.getDate()} – ${sun.getDate()} ${MONTHS_ES[sun.getMonth()]} ${sun.getFullYear()}`
      : `${mon.getDate()} ${MONTHS_ES[mon.getMonth()]} – ${sun.getDate()} ${MONTHS_ES[sun.getMonth()]} ${sun.getFullYear()}`;
  }
  return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

function navDate(d: Date, period: Period, dir: 1 | -1): Date {
  const next = new Date(d);
  if (period === 'day') next.setDate(d.getDate() + dir);
  else if (period === 'week') next.setDate(d.getDate() + dir * 7);
  else next.setMonth(d.getMonth() + dir);
  return next;
}

type FilterType   = 'Todos' | 'Ingreso' | 'Egreso';
type FilterStatus = 'Todos' | 'Completado' | 'Pendiente' | 'Anulado';
type FilterSource = 'Todos' | 'Siigo' | 'Manual';
type FilterRecord = 'Todos' | 'Movimiento' | 'Proyección';

function getPeriodTxs(txs: Transaction[], period: Period, ref: Date): Transaction[] {
  if (period === 'day') {
    return txs.filter(tx => dateKey(parseTxDate(tx.date)) === dateKey(ref));
  }
  if (period === 'week') {
    const dow = ref.getDay();
    const mon = new Date(ref);
    mon.setDate(ref.getDate() - (dow === 0 ? 6 : dow - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return txs.filter(tx => {
      const d = parseTxDate(tx.date);
      return d >= mon && d <= sun;
    });
  }
  // month
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end   = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return txs.filter(tx => {
    const d = parseTxDate(tx.date);
    return d >= start && d <= end;
  });
}

export function CashFlowView({ onCreateMovement, onCreateProjection, user }: { onCreateMovement?: () => void; onCreateProjection?: () => void; user?: import('../App').LoggedInUser | null }) {
  const [summary, setSummary] = useState<CashFlowSummary>({ days: [], projectedBalance: 0, projectedChange: 0, alerts: [] });
  const [allTxs, setAllTxs] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<Period>('week');
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const [showFilters, setShowFilters]     = useState(false);
  const [filterType, setFilterType]       = useState<FilterType>('Todos');
  const [filterStatus, setFilterStatus]   = useState<FilterStatus>('Todos');
  const [filterSource, setFilterSource]   = useState<FilterSource>('Todos');
  const [filterRecord, setFilterRecord]   = useState<FilterRecord>('Todos');
  const [selectedTx, setSelectedTx]      = useState<Transaction | null>(null);

  useEffect(() => {
    Promise.all([
      cashFlowService.getSummary(),
      transactionsService.list({ limit: 1000 }),
    ]).then(([s, all]) => {
      setSummary(prev => ({ ...prev, ...(s ?? {}) }));
      setAllTxs(all.data ?? []);
    })
    .catch(() => setError('No se pudo cargar el flujo de caja.'))
    .finally(() => setIsLoading(false));
  }, []);

  const { formatCurrency, formatCompact } = useSettings();

  const periodTxs = useMemo(
    () => getPeriodTxs(allTxs, period, currentDate),
    [allTxs, period, currentDate],
  );

  const filteredTxs = useMemo(() => {
    return periodTxs.filter(tx => {
      if (filterType   !== 'Todos' && tx.type   !== filterType)   return false;
      if (filterStatus !== 'Todos' && tx.status  !== filterStatus) return false;
      if (filterSource !== 'Todos' && tx.source  !== filterSource) return false;
      if (filterRecord === 'Movimiento'  && tx.isProjection)  return false;
      if (filterRecord === 'Proyección'  && !tx.isProjection) return false;
      return true;
    });
  }, [periodTxs, filterType, filterStatus, filterSource, filterRecord]);

  const activeFilters = (filterType !== 'Todos' ? 1 : 0) + (filterStatus !== 'Todos' ? 1 : 0) + (filterSource !== 'Todos' ? 1 : 0) + (filterRecord !== 'Todos' ? 1 : 0);

  const projectedBalance = useMemo(() => {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 30);

    // Cash received to date (Completado: full amount; Parcial: amount − balance)
    const balance = allTxs
      .filter(t => !t.isProjection && t.status !== 'Anulado')
      .reduce((sum, t) => {
        const r = t.status === 'Completado' ? t.amount
                : t.status === 'Parcial'    ? t.amount - (t.balance ?? 0)
                : 0;
        return sum + (t.type === 'Ingreso' ? r : -r);
      }, 0);

    // Expected flows within 30 days: Pendiente = full amount; Parcial = remaining balance
    const pendingInc = allTxs
      .filter(t => !t.isProjection && (t.status === 'Pendiente' || t.status === 'Parcial') && t.type === 'Ingreso' && parseTxDate(t.date) <= horizon)
      .reduce((sum, t) => sum + (t.status === 'Parcial' ? (t.balance ?? 0) : t.amount), 0);
    const pendingExp = allTxs
      .filter(t => !t.isProjection && (t.status === 'Pendiente' || t.status === 'Parcial') && t.type === 'Egreso' && parseTxDate(t.date) <= horizon)
      .reduce((sum, t) => sum + (t.status === 'Parcial' ? (t.balance ?? 0) : t.amount), 0);

    return balance + pendingInc - pendingExp;
  }, [allTxs]);

  const calendarCells = useMemo(() => {
    if (period !== 'month') return [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0 … Sun=6
    const cells: Array<{ day: number; date: Date; txs: Transaction[] } | null> = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      cells.push({ day: d, date, txs: filteredTxs.filter(tx => dateKey(parseTxDate(tx.date)) === dateKey(date)) });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [period, currentDate, filteredTxs]);

  const todayKey = dateKey(new Date());

  function clearFilters() {
    setFilterType('Todos');
    setFilterStatus('Todos');
    setFilterSource('Todos');
    setFilterRecord('Todos');
  }

  if (error) return <div className="p-8 text-brand-danger font-semibold">{error}</div>;
  if (isLoading) {
    return <div className="p-8 space-y-8"><Skeleton className="h-10 w-48" /><SkeletonCard /></div>;
  }

  const chartData = buildChart(allTxs, period, currentDate);
  const title = periodTitle(period, currentDate);

  return (
    <>
    <TransactionDetailDrawer
      transaction={selectedTx}
      onClose={() => setSelectedTx(null)}
      onDeleted={id => { setSelectedTx(null); setAllTxs(prev => prev.filter(t => t.id !== id)); }}
      onUpdated={tx => { setSelectedTx(tx); setAllTxs(prev => prev.map(t => t.id === tx.id ? tx : t)); }}
      canWrite={canWrite(user?.role)}
    />
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Flujo de Caja</h1>
          <p className="text-slate-500 font-medium tracking-tight">Control detallado de liquidez y proyecciones.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
          {PERIOD_ORDER.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn("px-6 py-2 text-xs font-bold rounded-xl transition-all", period === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-brand-dark p-5 sm:p-6 rounded-3xl sm:rounded-[40px] text-white relative overflow-hidden group">
        <div className="relative z-10 flex items-center justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Saldo Proyectado (30d)</p>
            <p className="text-2xl font-black tracking-tight mt-1">{formatCurrency(projectedBalance)}</p>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="text-brand-success" size={20} />
            <span className={cn("text-sm font-bold", summary.projectedChange >= 0 ? "text-brand-success" : "text-brand-danger")}>
              {summary.projectedChange >= 0 ? '+' : ''}{summary.projectedChange}% vs Mes anterior
            </span>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-1000" />
      </div>

      <div>
        <div className="bg-white p-4 sm:p-8 rounded-3xl sm:rounded-[40px] border border-slate-100 card-shadow self-start">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentDate(d => navDate(d, period, -1))} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h3>
              <button onClick={() => setCurrentDate(d => navDate(d, period, 1))} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronRight size={20} /></button>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-brand-success" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">INGRESOS</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-brand-danger" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">EGRESOS</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PENDIENTE</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PROYECTADO</span></div>
            </div>
          </div>

          {period === 'month' ? (
            /* Calendar grid */
            <div>
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 mb-2">
                {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(d => (
                  <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">{d}</div>
                ))}
              </div>
              {/* Calendar cells */}
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell, i) => {
                  if (!cell) return <div key={i} className="rounded-xl min-h-[72px]" />;
                  const { ingresos: realIn, egresos: realEg, proyIngresos: projIn, proyEgresos: projEg } = sumTxs(cell.txs);
                  const isToday = dateKey(cell.date) === todayKey;
                  const hasTxs = cell.txs.length > 0;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl p-2 min-h-[72px] flex flex-col gap-0.5 transition-colors",
                        hasTxs ? "cursor-pointer hover:ring-1 hover:ring-brand-primary/20" : "",
                        isToday ? "bg-brand-primary/5 ring-1 ring-brand-primary/20" : "bg-slate-50 hover:bg-slate-100"
                      )}
                      onClick={() => { if (cell.txs.length === 1) setSelectedTx(cell.txs[0]); }}
                    >
                      <span className={cn(
                        "text-xs font-black w-6 h-6 flex items-center justify-center rounded-full mb-0.5",
                        isToday ? "bg-brand-primary text-white" : "text-slate-700"
                      )}>
                        {cell.day}
                      </span>
                      {realIn > 0 && (
                        <span className="text-[10px] font-bold text-brand-success leading-tight" title={`+${formatCurrency(realIn)}`}>+{formatCompact(realIn)}</span>
                      )}
                      {realEg > 0 && (
                        <span className="text-[10px] font-bold text-brand-danger leading-tight" title={`-${formatCurrency(realEg)}`}>-{formatCompact(realEg)}</span>
                      )}
                      {(() => { const { pendingIngresos: pIn, pendingEgresos: pEg } = sumTxs(cell.txs); return (<>
                        {pIn > 0 && <span className="text-[10px] font-bold text-amber-500 leading-tight" title={`~+${formatCurrency(pIn)}`}>~+{formatCompact(pIn)}</span>}
                        {pEg > 0 && <span className="text-[10px] font-bold text-amber-500 leading-tight" title={`~-${formatCurrency(pEg)}`}>~-{formatCompact(pEg)}</span>}
                      </>); })()}
                      {projIn > 0 && (
                        <span className="text-[10px] font-bold text-orange-500 leading-tight" title={`~+${formatCurrency(projIn)}`}>~+{formatCompact(projIn)}</span>
                      )}
                      {projEg > 0 && (
                        <span className="text-[10px] font-bold text-orange-500 leading-tight" title={`~-${formatCurrency(projEg)}`}>~-{formatCompact(projEg)}</span>
                      )}
                      {cell.txs.length > 1 && (
                        <span className="text-[9px] font-bold text-slate-400 mt-auto">{cell.txs.length} mov.</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : period === 'day' ? (
            /* Day view — compact summary cards */
            <div className="grid grid-cols-4 gap-3">
              {chartData.map((d, i) => {
                const colors = ['text-slate-600', 'text-brand-success', 'text-brand-danger', 'text-orange-500'];
                const hasIn  = d.ingresos > 0 || d.pendingIngresos > 0 || d.proyIngresos > 0;
                const hasEg  = d.egresos > 0  || d.pendingEgresos > 0 || d.proyEgresos > 0;
                return (
                  <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className={cn("text-[10px] font-black uppercase tracking-widest", colors[i])}>{d.label}</p>
                      <span className="text-[10px] font-bold text-slate-400">{d.date} mov.</span>
                    </div>
                    {hasIn && (
                      <div className={cn("rounded-xl px-3 py-2",
                        d.ingresos > 0 ? "bg-brand-success/10" : d.pendingIngresos > 0 ? "bg-amber-50" : "bg-orange-50"
                      )}>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Ingresos</p>
                        <p className={cn("text-sm font-extrabold",
                          d.ingresos > 0 ? "text-brand-success" : d.pendingIngresos > 0 ? "text-amber-500" : "text-orange-500"
                        )} title={d.ingresos > 0 ? `+${formatCurrency(d.ingresos)}` : d.pendingIngresos > 0 ? `~+${formatCurrency(d.pendingIngresos)}` : `~+${formatCurrency(d.proyIngresos)}`}>
                          {d.ingresos > 0 ? `+${formatCompact(d.ingresos)}` : d.pendingIngresos > 0 ? `~+${formatCompact(d.pendingIngresos)}` : `~+${formatCompact(d.proyIngresos)}`}
                        </p>
                      </div>
                    )}
                    {hasEg && (
                      <div className={cn("rounded-xl px-3 py-2",
                        d.egresos > 0 ? "bg-brand-danger/10" : d.pendingEgresos > 0 ? "bg-amber-50" : "bg-orange-50"
                      )}>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Egresos</p>
                        <p className={cn("text-sm font-extrabold",
                          d.egresos > 0 ? "text-brand-danger" : d.pendingEgresos > 0 ? "text-amber-500" : "text-orange-500"
                        )} title={d.egresos > 0 ? `-${formatCurrency(d.egresos)}` : d.pendingEgresos > 0 ? `~-${formatCurrency(d.pendingEgresos)}` : `~-${formatCurrency(d.proyEgresos)}`}>
                          {d.egresos > 0 ? `-${formatCompact(d.egresos)}` : d.pendingEgresos > 0 ? `~-${formatCompact(d.pendingEgresos)}` : `~-${formatCompact(d.proyEgresos)}`}
                        </p>
                      </div>
                    )}
                    {!hasIn && !hasEg && <p className="text-xs text-slate-300">—</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Week bar chart */
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${chartData.length}, 1fr)`, minWidth: `${Math.max(320, chartData.length * 44)}px` }}>
                {chartData.map((d, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="text-center pb-4">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{d.label}</p>
                      <p className="text-2xl font-black text-slate-900">{d.date}</p>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <div className={cn(
                        "flex-1 rounded-2xl border flex flex-col items-center justify-center p-2",
                        d.ingresos > 0 ? "bg-brand-success/10 border-brand-success/10" : d.pendingIngresos > 0 ? "bg-amber-50 border-amber-100" : d.proyIngresos > 0 ? "bg-orange-50 border-orange-100" : "bg-slate-50 border-slate-100"
                      )}>
                        <span className={cn("text-[10px] font-bold",
                          d.ingresos > 0 ? "text-brand-success" : d.pendingIngresos > 0 ? "text-amber-500" : d.proyIngresos > 0 ? "text-orange-500" : "text-slate-300"
                        )} title={d.ingresos > 0 ? `+${formatCurrency(d.ingresos)}` : d.pendingIngresos > 0 ? `~+${formatCurrency(d.pendingIngresos)}` : d.proyIngresos > 0 ? `~+${formatCurrency(d.proyIngresos)}` : undefined}>
                          {d.ingresos > 0 ? `+${formatCompact(d.ingresos)}` : d.pendingIngresos > 0 ? `~+${formatCompact(d.pendingIngresos)}` : d.proyIngresos > 0 ? `~+${formatCompact(d.proyIngresos)}` : '—'}
                        </span>
                      </div>
                      <div className={cn(
                        "h-24 rounded-2xl border flex flex-col items-center justify-center p-2",
                        d.egresos > 0 ? "bg-brand-danger/10 border-brand-danger/10" : d.pendingEgresos > 0 ? "bg-amber-50 border-amber-100" : d.proyEgresos > 0 ? "bg-orange-50 border-orange-100" : "bg-slate-50 border-slate-100"
                      )}>
                        <span className={cn("text-[10px] font-bold",
                          d.egresos > 0 ? "text-brand-danger" : d.pendingEgresos > 0 ? "text-amber-500" : d.proyEgresos > 0 ? "text-orange-500" : "text-slate-300"
                        )} title={d.egresos > 0 ? `-${formatCurrency(d.egresos)}` : d.pendingEgresos > 0 ? `~-${formatCurrency(d.pendingEgresos)}` : d.proyEgresos > 0 ? `~-${formatCurrency(d.proyEgresos)}` : undefined}>
                          {d.egresos > 0 ? `-${formatCompact(d.egresos)}` : d.pendingEgresos > 0 ? `~-${formatCompact(d.pendingEgresos)}` : d.proyEgresos > 0 ? `~-${formatCompact(d.proyEgresos)}` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {summary.alerts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 px-1">Alertas de Liquidez</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.alerts.map(alert => (
              <div key={alert.id} className={cn("p-5 bg-white rounded-3xl border card-shadow flex gap-4", alert.type === 'danger' ? "ring-1 ring-brand-danger/5" : "ring-1 ring-brand-success/5")}>
                {alert.type === 'danger'
                  ? <AlertTriangle className="text-brand-danger shrink-0" size={20} />
                  : <ArrowDownCircle className="text-brand-success shrink-0" size={20} />
                }
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900">{alert.title}</p>
                  <p className="text-xs font-medium text-slate-500">{alert.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl sm:rounded-[40px] border border-slate-100 card-shadow overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-8 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Movimientos Detallados</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(v => !v)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-colors relative",
                showFilters ? "bg-brand-primary text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              <Filter size={18} /><span>Filtrar</span>
              {activeFilters > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-danger text-white text-[10px] font-black rounded-full flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </button>
            {canWrite(user?.role) && (
              <>
                <button onClick={onCreateProjection} className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20">
                  <Plus size={20} /><span>Nueva Proyección</span>
                </button>
                <button onClick={onCreateMovement} className="flex items-center gap-2 bg-brand-dark text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-accent transition-all shadow-lg shadow-brand-dark/20">
                  <Plus size={20} /><span>Nuevo Movimiento</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-end gap-6">
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</p>
              <div className="flex gap-1.5">
                {(['Todos', 'Ingreso', 'Egreso'] as FilterType[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setFilterType(v)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      filterType === v ? "bg-brand-primary text-white" : "bg-white text-slate-500 border border-slate-200 hover:border-brand-primary/40"
                    )}
                  >{v}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</p>
              <div className="flex gap-1.5">
                {(['Todos', 'Completado', 'Pendiente', 'Anulado'] as FilterStatus[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setFilterStatus(v)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      filterStatus === v ? "bg-brand-primary text-white" : "bg-white text-slate-500 border border-slate-200 hover:border-brand-primary/40"
                    )}
                  >{v}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Origen</p>
              <div className="flex gap-1.5">
                {(['Todos', 'Siigo', 'Manual'] as FilterSource[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setFilterSource(v)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      filterSource === v ? "bg-brand-primary text-white" : "bg-white text-slate-500 border border-slate-200 hover:border-brand-primary/40"
                    )}
                  >{v}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registro</p>
              <div className="flex gap-1.5">
                {(['Todos', 'Movimiento', 'Proyección'] as FilterRecord[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setFilterRecord(v)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      filterRecord === v
                        ? v === 'Proyección' ? "bg-orange-500 text-white" : "bg-brand-primary text-white"
                        : "bg-white text-slate-500 border border-slate-200 hover:border-brand-primary/40"
                    )}
                  >{v}</button>
                ))}
              </div>
            </div>
            {activeFilters > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-danger bg-brand-danger/10 hover:bg-brand-danger/20 transition-colors">
                <X size={12} /><span>Limpiar filtros</span>
              </button>
            )}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {['FECHA', 'DESCRIPCIÓN', 'CATEGORÍA', 'TIPO', 'MONTO', 'ESTADO', 'ORIGEN'].map(h => (
                  <th key={h} className={cn(
                    "px-3 sm:px-8 py-3 sm:py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest",
                    (h === 'CATEGORÍA' || h === 'ORIGEN') && 'hidden sm:table-cell',
                    h === 'TIPO' && 'text-center',
                    (h === 'MONTO' || h === 'ESTADO') && 'text-right',
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-12 text-sm text-slate-400 font-medium text-center">
                    {periodTxs.length === 0 ? `Sin movimientos en ${title.toLowerCase()}` : 'Ningún movimiento coincide con los filtros aplicados'}
                  </td>
                </tr>
              ) : filteredTxs.map(tx => (
                <tr key={tx.id} onClick={() => setSelectedTx(tx)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-3 sm:px-8 py-3 sm:py-6 text-sm font-semibold text-slate-500 whitespace-nowrap">{tx.date}</td>
                  <td className="px-3 sm:px-8 py-3 sm:py-6">
                    <p className="text-sm font-bold text-slate-900 line-clamp-1">{tx.description}</p>
                    {tx.reference && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{tx.reference}</p>}
                  </td>
                  <td className="hidden sm:table-cell px-3 sm:px-8 py-3 sm:py-6">
                    <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-lg">{tx.category}</span>
                  </td>
                  <td className="px-3 sm:px-8 py-3 sm:py-6">
                    <div className={cn("flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider", tx.type === 'Ingreso' ? "text-brand-success" : "text-brand-danger")}>
                      {tx.type === 'Ingreso' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                      <span className="hidden sm:inline">{tx.type}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-8 py-3 sm:py-6 text-right">
                    <span className="text-sm font-extrabold text-slate-900">{formatCurrency(tx.amount)}</span>
                  </td>
                  <td className="px-3 sm:px-8 py-3 sm:py-6 text-right">
                    <StatusBadge status={tx.status} />
                  </td>
                  <td className="hidden sm:table-cell px-3 sm:px-8 py-3 sm:py-6">
                    {tx.isProjection ? (
                      <span className="text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-widest border bg-orange-50 text-orange-500 border-orange-200">
                        Proyección
                      </span>
                    ) : (
                      <span className={cn(
                        "text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-widest border",
                        tx.source === 'Siigo' ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" : "bg-slate-100 text-slate-500 border-slate-200"
                      )}>{tx.source}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 sm:p-8 border-t border-slate-100">
          <span className="text-sm font-semibold text-slate-400">
            {filteredTxs.length} de {periodTxs.length} movimiento{periodTxs.length !== 1 ? 's' : ''} en {title.toLowerCase()}
          </span>
        </div>
      </div>
    </motion.div>
    </>
  );
}
