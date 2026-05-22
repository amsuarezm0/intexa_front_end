import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, TrendingUp, AlertTriangle, ArrowDownCircle, Filter, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import { cashFlowService, transactionsService, type CashFlowSummary, type Transaction } from '../services';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';

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

interface ChartPoint { label: string; date: number; ingresos: number; egresos: number; }

function sumTxs(txs: Transaction[]) {
  return {
    ingresos: txs.filter(t => t.type === 'Ingreso').reduce((s, t) => s + t.amount, 0),
    egresos:  txs.filter(t => t.type === 'Egreso').reduce((s, t) => s + t.amount, 0),
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
    if (dayTxs.length === 0) return [{ label: '—', date: ref.getDate(), ingresos: 0, egresos: 0 }];
    return dayTxs.map((tx, i) => ({
      label: `TX ${i + 1}`,
      date: ref.getDate(),
      ingresos: tx.type === 'Ingreso' ? tx.amount : 0,
      egresos:  tx.type === 'Egreso'  ? tx.amount : 0,
    }));
  }

  // month → group by week
  const firstDay = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const lastDay  = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  const points: ChartPoint[] = [];
  let cur = new Date(firstDay);
  let n = 1;
  while (cur <= lastDay) {
    const end = new Date(cur);
    end.setDate(cur.getDate() + 6);
    if (end > lastDay) end.setTime(lastDay.getTime());
    const week = txs.filter(tx => {
      const d = parseTxDate(tx.date);
      return d >= cur && d <= end;
    });
    points.push({ label: `SEM ${n}`, date: cur.getDate(), ...sumTxs(week) });
    cur.setDate(cur.getDate() + 7);
    n++;
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
type FilterStatus = 'Todos' | 'Completado' | 'Pendiente' | 'Cancelado';
type FilterSource = 'Todos' | 'SIIGO' | 'Manual';

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

export function CashFlowView({ onCreateMovement }: { onCreateMovement?: () => void }) {
  const [summary, setSummary] = useState<CashFlowSummary | null>(null);
  const [allTxs, setAllTxs] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<Period>('week');
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const [showFilters, setShowFilters]   = useState(false);
  const [filterType, setFilterType]     = useState<FilterType>('Todos');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('Todos');
  const [filterSource, setFilterSource] = useState<FilterSource>('Todos');

  useEffect(() => {
    Promise.all([
      cashFlowService.getSummary(),
      transactionsService.list({ limit: 100 }),
    ]).then(([s, res]) => {
      setSummary(s);
      setAllTxs(res.data);
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
      return true;
    });
  }, [periodTxs, filterType, filterStatus, filterSource]);

  const activeFilters = (filterType !== 'Todos' ? 1 : 0) + (filterStatus !== 'Todos' ? 1 : 0) + (filterSource !== 'Todos' ? 1 : 0);

  function clearFilters() {
    setFilterType('Todos');
    setFilterStatus('Todos');
    setFilterSource('Todos');
  }

  if (error) return <div className="p-8 text-brand-danger font-semibold">{error}</div>;
  if (isLoading || !summary) {
    return <div className="p-8 space-y-8"><Skeleton className="h-10 w-48" /><SkeletonCard /></div>;
  }

  const chartData = buildChart(allTxs, period, currentDate);
  const title = periodTitle(period, currentDate);

  return (
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 bg-white p-4 sm:p-8 rounded-3xl sm:rounded-[40px] border border-slate-100 card-shadow flex flex-col">
          <div className="flex items-center justify-between mb-6 sm:mb-10">
            <div className="flex items-center gap-6">
              <button onClick={() => setCurrentDate(d => navDate(d, period, -1))} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h3>
              <button onClick={() => setCurrentDate(d => navDate(d, period, 1))} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronRight size={20} /></button>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-brand-success" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">INGRESOS</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-brand-danger" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">EGRESOS</span></div>
            </div>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="grid gap-2 sm:gap-4 min-w-[320px]" style={{ gridTemplateColumns: `repeat(${chartData.length}, 1fr)` }}>
            {chartData.map((d, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="text-center pb-4">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{d.label}</p>
                  <p className="text-2xl font-black text-slate-900">{d.date}</p>
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <div className={cn(
                    "flex-1 rounded-2xl border flex flex-col items-center justify-center p-2",
                    d.ingresos > 0 ? "bg-brand-success/10 border-brand-success/10" : "bg-slate-50 border-slate-100"
                  )}>
                    <span className={cn("text-[10px] font-bold", d.ingresos > 0 ? "text-brand-success" : "text-slate-300")}>
                      {d.ingresos > 0 ? `+${formatCompact(d.ingresos)}` : '—'}
                    </span>
                  </div>
                  <div className={cn(
                    "h-24 rounded-2xl border flex flex-col items-center justify-center p-2",
                    d.egresos > 0 ? "bg-brand-danger/10 border-brand-danger/10" : "bg-slate-50 border-slate-100"
                  )}>
                    <span className={cn("text-[10px] font-bold", d.egresos > 0 ? "text-brand-danger" : "text-slate-300")}>
                      {d.egresos > 0 ? `-${formatCompact(d.egresos)}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-brand-dark p-5 sm:p-8 rounded-3xl sm:rounded-[40px] text-white relative overflow-hidden group">
            <div className="relative z-10 space-y-6">
              <div>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Saldo Proyectado (30d)</p>
                <p className="text-4xl font-black tracking-tight mt-1">{formatCurrency(summary.projectedBalance)}</p>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="text-brand-success" size={20} />
                <span className="text-sm font-bold text-brand-success">+{summary.projectedChange}% vs Mes anterior</span>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-1000" />
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900 px-1">Alertas de Liquidez</h3>
            <div className="space-y-4">
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
        </div>
      </div>

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
            <button onClick={onCreateMovement} className="flex items-center gap-2 bg-brand-dark text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-accent transition-all shadow-lg shadow-brand-dark/20">
              <Plus size={20} /><span>Nuevo Movimiento</span>
            </button>
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
                {(['Todos', 'Completado', 'Pendiente', 'Cancelado'] as FilterStatus[]).map(v => (
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
                {(['Todos', 'SIIGO', 'Manual'] as FilterSource[]).map(v => (
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
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
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
                    <span className={cn(
                      "text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-widest border",
                      tx.status === 'Completado' ? "bg-brand-success/10 text-brand-success border-brand-success/20" :
                      tx.status === 'Pendiente'  ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" :
                      "bg-brand-danger/10 text-brand-danger border-brand-danger/20"
                    )}>{tx.status}</span>
                  </td>
                  <td className="hidden sm:table-cell px-3 sm:px-8 py-3 sm:py-6">
                    <span className={cn(
                      "text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-widest border",
                      tx.source === 'SIIGO' ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" : "bg-slate-100 text-slate-500 border-slate-200"
                    )}>{tx.source}</span>
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
  );
}
