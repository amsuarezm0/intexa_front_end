import { AlertTriangle,ArrowDownCircle,ArrowDownLeft,ArrowUpRight,ChevronLeft,ChevronRight,Filter,Plus,TrendingUp } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import { motion } from 'motion/react';
import { TransactionFilters, type TxFilters } from '../components/TransactionFilters';
import { useEffect,useMemo,useState } from 'react';
import { Skeleton,SkeletonCard } from '../components/Skeleton';
import { StatusBadge } from '../components/StatusBadge';
import { TransactionDetailDrawer } from '../components/TransactionDetailDrawer';
import { useSettings } from '../contexts/SettingsContext';
import { canWrite } from '../lib/roles';
import { cn } from '../lib/utils';
import { cashFlowService,projectionsService,type CashFlowSummary,type PeriodData,type PeriodInvoice,type PeriodPurchase } from '../services';
import { DocumentDetailDrawer } from '../components/DocumentDetailDrawer';
import type { Transaction } from '../services/transactions';

type Period = 'day' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = { day: 'Día', week: 'Semana', month: 'Mes' };
const PERIOD_ORDER: Period[] = ['day', 'week', 'month'];

const DAYS_ES = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function parseTxDate(str: string): Date {
  const [y, m, d] = str.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function effDate(doc: { date: string; dueDate: string }): Date {
  return parseTxDate(doc.dueDate || doc.date);
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface ChartPoint { label: string; date: number; ingresos: number; egresos: number; pendingIngresos: number; pendingEgresos: number; proyIngresos: number; proyEgresos: number; }

type RawDoc = (PeriodInvoice & { docType: 'FV' }) | (PeriodPurchase & { docType: 'FC' });

interface Movement {
  id: string;
  date: string;
  description: string;
  detail?: string;
  category: string;
  type: 'Ingreso' | 'Egreso';
  amount: number;
  status: string;
  source: string;
  isProjection: boolean;
  reference?: string;
  rawTx?: Transaction;
  rawDoc?: RawDoc;
}

function toMovements(txs: Transaction[], invs: PeriodInvoice[], purs: PeriodPurchase[]): Movement[] {
  const out: Movement[] = [
    ...txs.map(tx => ({
      id: tx.id, date: tx.date, description: tx.description, detail: tx.detail || undefined,
      category: tx.category, type: tx.type, amount: tx.amount, status: tx.status, source: tx.source,
      isProjection: tx.isProjection, reference: tx.reference, rawTx: tx,
    })),
    ...invs.map(inv => ({
      id: inv.id, date: inv.dueDate || inv.date,
      description: inv.reference, detail: inv.detail || undefined,
      category: inv.category, type: 'Ingreso' as const, amount: inv.balance, status: inv.status,
      source: inv.source, isProjection: false,
      rawDoc: { ...inv, docType: 'FV' as const },
    })),
    ...purs.map(pur => ({
      id: pur.id, date: pur.dueDate || pur.date,
      description: pur.reference, detail: pur.detail || undefined,
      category: pur.category, type: 'Egreso' as const, amount: pur.balance, status: pur.status,
      source: pur.source, isProjection: false,
      rawDoc: { ...pur, docType: 'FC' as const },
    })),
  ];
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

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

function mergePoint(base: ReturnType<typeof sumTxs>, invs: PeriodInvoice[], purs: PeriodPurchase[]): ReturnType<typeof sumTxs> {
  return {
    ...base,
    pendingIngresos: base.pendingIngresos + invs.reduce((s, inv) => s + inv.balance, 0),
    pendingEgresos:  base.pendingEgresos  + purs.reduce((s, pur) => s + pur.balance, 0),
  };
}

function buildChart(txs: Transaction[], invs: PeriodInvoice[], purs: PeriodPurchase[], period: Period, ref: Date): ChartPoint[] {
  if (period === 'week') {
    const dow    = ref.getDay();
    const offset = dow === 0 ? 6 : dow - 1;
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - offset + i);
      const key = dateKey(d);
      const dayTxs  = txs.filter(tx => dateKey(parseTxDate(tx.date)) === key);
      const dayInvs = invs.filter(inv => dateKey(effDate(inv)) === key);
      const dayPurs = purs.filter(pur => dateKey(effDate(pur)) === key);
      const sums = mergePoint(sumTxs(dayTxs), dayInvs, dayPurs);
      return { label: DAYS_ES[d.getDay()], date: d.getDate(), ...sums };
    });
  }

  if (period === 'day') {
    const key = dateKey(ref);
    const dayTxs  = txs.filter(tx => dateKey(parseTxDate(tx.date)) === key);
    const dayInvs = invs.filter(inv => dateKey(effDate(inv)) === key);
    const dayPurs = purs.filter(pur => dateKey(effDate(pur)) === key);
    const invPendInc = dayInvs.reduce((s, inv) => s + inv.balance, 0);
    const purPendEg  = dayPurs.reduce((s, pur) => s + pur.balance, 0);
    const { ingresos, egresos, pendingIngresos, pendingEgresos, proyIngresos, proyEgresos } = sumTxs(dayTxs);
    const realIn  = dayTxs.filter(t => !t.isProjection && t.type === 'Ingreso');
    const realEg  = dayTxs.filter(t => !t.isProjection && t.type === 'Egreso');
    const projAll = dayTxs.filter(t => t.isProjection);
    return [
      { label: 'TOTAL',        date: dayTxs.length, ingresos, egresos, pendingIngresos: pendingIngresos + invPendInc, pendingEgresos: pendingEgresos + purPendEg, proyIngresos, proyEgresos },
      { label: 'INGRESOS',     date: realIn.length,  ingresos, egresos: 0, pendingIngresos: pendingIngresos + invPendInc, pendingEgresos: 0, proyIngresos, proyEgresos: 0 },
      { label: 'EGRESOS',      date: realEg.length,  ingresos: 0, egresos, pendingIngresos: 0, pendingEgresos: pendingEgresos + purPendEg, proyIngresos: 0, proyEgresos },
      { label: 'PROYECCIONES', date: projAll.length, ingresos: 0, egresos: 0, pendingIngresos: 0, pendingEgresos: 0, proyIngresos, proyEgresos },
    ];
  }

  // month — one column per day
  const firstDay = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const lastDay  = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  const points: ChartPoint[] = [];
  let cur = new Date(firstDay);
  while (cur <= lastDay) {
    const key = dateKey(cur);
    const dayTxs  = txs.filter(tx => dateKey(parseTxDate(tx.date)) === key);
    const dayInvs = invs.filter(inv => dateKey(effDate(inv)) === key);
    const dayPurs = purs.filter(pur => dateKey(effDate(pur)) === key);
    const sums = mergePoint(sumTxs(dayTxs), dayInvs, dayPurs);
    points.push({ label: DAYS_ES[cur.getDay()], date: cur.getDate(), ...sums });
    cur.setDate(cur.getDate() + 1);
  }
  return points;
}

function periodTitle(period: Period, d: Date): string {
  if (period === 'day') {
    return `${DAYS_ES[d.getDay()]}, ${d.getDate()} de ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
  }
  if (period === 'week') {
    const dow    = d.getDay();
    const offset = dow === 0 ? 6 : dow - 1;
    const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
    const sun = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset + 6);
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

const EMPTY_PERIOD: PeriodData = { transactions: [], invoices: [], purchases: [] };

export function CashFlowView({ onCreateMovement, onCreateProjection, user }: { onCreateMovement?: () => void; onCreateProjection?: () => void; user?: import('../App').LoggedInUser | null }) {
  const [summary, setSummary] = useState<CashFlowSummary>({ days: [], balance: 0, projectedBalance: 0, projectedChange: 0, alerts: [] });
  const [proj30, setProj30] = useState(0);
  const [periodData, setPeriodData] = useState<PeriodData>(EMPTY_PERIOD);
  const [isLoading, setIsLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<Period>('week');
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TxFilters>({ type: '', status: '', source: '', record: '' });
  const [txPage, setTxPage] = useState(1);
  const TX_PAGE_SIZE = 10;
  const { type: filterType, status: filterStatus, source: filterSource, record: filterRecord } = filters;
  const [selectedTx, setSelectedTx]   = useState<Transaction | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<RawDoc | null>(null);

  // Initial load: summary + projections
  useEffect(() => {
    Promise.all([
      cashFlowService.getSummary(),
      projectionsService.getSummary(30),
    ]).then(([s, p30]) => {
      setSummary(prev => ({ ...prev, ...(s ?? {}) }));
      setProj30(p30?.estimatedBalance ?? 0);
    })
    .catch(() => setError('No se pudo cargar el flujo de caja.'))
    .finally(() => setIsLoading(false));
  }, []);

  // Fetch period data whenever period or date changes
  useEffect(() => {
    setChartLoading(true);
    cashFlowService.getPeriodData(period, toDateStr(currentDate))
      .then(data => setPeriodData(data ?? EMPTY_PERIOD))
      .catch(() => {})
      .finally(() => setChartLoading(false));
  }, [period, currentDate]);

  const { formatCurrency, formatCompact } = useSettings();

  const txs = periodData.transactions;
  const invs = periodData.invoices;
  const purs = periodData.purchases;

  const allMovements = useMemo(
    () => toMovements(txs, invs, purs),
    [txs, invs, purs],
  );

  const filteredTxs = useMemo(() => {
    return allMovements.filter(m => {
      if (filterType   && m.type   !== filterType)   return false;
      if (filterStatus && m.status !== filterStatus) return false;
      if (filterSource && m.source !== filterSource) return false;
      if (filterRecord === 'Movimiento'  && m.isProjection)  return false;
      if (filterRecord === 'Proyección'  && !m.isProjection) return false;
      return true;
    });
  }, [allMovements, filterType, filterStatus, filterSource, filterRecord]);

  const activeFilters = (filterType ? 1 : 0) + (filterStatus ? 1 : 0) + (filterSource ? 1 : 0) + (filterRecord ? 1 : 0);

  const periodAlerts = summary.alerts;

  const txTotalPages = Math.max(1, Math.ceil(filteredTxs.length / TX_PAGE_SIZE));
  const pagedTxs = filteredTxs.slice((txPage - 1) * TX_PAGE_SIZE, txPage * TX_PAGE_SIZE);

  const currentBalance = summary.balance;
  const projectedBalance = proj30;

  const calendarCells = useMemo(() => {
    if (period !== 'month') return [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells: Array<{ day: number; date: Date; txs: Transaction[]; invs: PeriodInvoice[]; purs: PeriodPurchase[] } | null> = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key = dateKey(date);
      cells.push({
        day: d,
        date,
        txs:  txs.filter(tx => dateKey(parseTxDate(tx.date)) === key),
        invs: invs.filter(inv => dateKey(effDate(inv)) === key),
        purs: purs.filter(pur => dateKey(effDate(pur)) === key),
      });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [period, currentDate, filteredTxs, invs, purs]);

  const todayKey = dateKey(new Date());

  function clearFilters() { setFilters({ type: '', status: '', source: '', record: '' }); setTxPage(1); }
  function handleFilterChange(next: Partial<TxFilters>) { setFilters(f => ({ ...f, ...next })); setTxPage(1); }

  if (error) return <div className="p-8 text-brand-danger font-semibold">{error}</div>;
  if (isLoading) {
    return <div className="p-8 space-y-8"><Skeleton className="h-10 w-48" /><SkeletonCard /></div>;
  }

  const chartData = buildChart(txs, invs, purs, period, currentDate);
  const title = periodTitle(period, currentDate);

  return (
    <>
    <TransactionDetailDrawer
      transaction={selectedTx}
      onClose={() => setSelectedTx(null)}
      onDeleted={id => { setSelectedTx(null); setPeriodData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) })); }}
      onUpdated={tx => { setSelectedTx(tx); setPeriodData(prev => ({ ...prev, transactions: prev.transactions.map(t => t.id === tx.id ? tx : t) })); }}
      canWrite={canWrite(user?.role)}
    />
    <DocumentDetailDrawer doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
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
              onClick={() => { setPeriod(p); setTxPage(1); }}
              className={cn("px-6 py-2 text-xs font-bold rounded-xl transition-all", period === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-brand-dark p-5 sm:p-6 rounded-3xl sm:rounded-[40px] text-white relative overflow-hidden group">
        <div className="relative z-10 flex items-center justify-between gap-6">
          <div className="flex items-start gap-8">
            <div>
              <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Balance Total</p>
              <p className="text-2xl font-black tracking-tight mt-1" title={formatCurrency(currentBalance)}>{formatCurrency(currentBalance)}</p>
            </div>
            <div className="w-px self-stretch bg-white/10" />
            <div>
              <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Saldo Proyectado (30d)</p>
              <p className="text-2xl font-black tracking-tight mt-1" title={formatCurrency(projectedBalance)}>{formatCurrency(projectedBalance)}</p>
            </div>
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
              <button onClick={() => { setCurrentDate(d => navDate(d, period, -1)); setTxPage(1); }} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{chartLoading ? '…' : title}</h3>
              <button onClick={() => { setCurrentDate(d => navDate(d, period, 1)); setTxPage(1); }} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronRight size={20} /></button>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-brand-success" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">INGRESOS</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-brand-danger" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">EGRESOS</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-brand-warning" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PENDIENTE</span></div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-brand-dark" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PROYECTADO</span></div>
            </div>
          </div>

          {chartLoading ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm font-semibold">Cargando…</div>
          ) : period === 'month' ? (
            /* Calendar grid */
            <div>
              <div className="grid grid-cols-7 mb-2">
                {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(d => (
                  <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell, i) => {
                  if (!cell) return <div key={i} className="rounded-xl min-h-[72px]" />;
                  const { ingresos: realIn, egresos: realEg, proyIngresos: projIn, proyEgresos: projEg } = sumTxs(cell.txs);
                  const pendInc = cell.txs.filter(t => !t.isProjection && t.status === 'Pendiente' && t.type === 'Ingreso').reduce((s, t) => s + t.amount, 0)
                    + cell.invs.reduce((s, inv) => s + inv.balance, 0);
                  const pendEg = cell.txs.filter(t => !t.isProjection && t.status === 'Pendiente' && t.type === 'Egreso').reduce((s, t) => s + t.amount, 0)
                    + cell.purs.reduce((s, pur) => s + pur.balance, 0);
                  const isToday = dateKey(cell.date) === todayKey;
                  const hasContent = cell.txs.length > 0 || cell.invs.length > 0 || cell.purs.length > 0;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl p-2 min-h-[72px] flex flex-col gap-0.5 transition-colors",
                        hasContent ? "cursor-pointer hover:ring-1 hover:ring-brand-primary/20" : "",
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
                      {pendInc > 0 && <span className="text-[10px] font-bold text-brand-warning leading-tight" title={`~+${formatCurrency(pendInc)}`}>~+{formatCompact(pendInc)}</span>}
                      {pendEg  > 0 && <span className="text-[10px] font-bold text-brand-warning leading-tight" title={`~-${formatCurrency(pendEg)}`}>~-{formatCompact(pendEg)}</span>}
                      {projIn > 0 && (
                        <span className="text-[10px] font-bold text-brand-dark leading-tight" title={`~+${formatCurrency(projIn)}`}>~+{formatCompact(projIn)}</span>
                      )}
                      {projEg > 0 && (
                        <span className="text-[10px] font-bold text-brand-dark leading-tight" title={`~-${formatCurrency(projEg)}`}>~-{formatCompact(projEg)}</span>
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
                const colors = ['text-slate-600', 'text-brand-success', 'text-brand-danger', 'text-brand-primary'];
                const hasIn  = d.ingresos > 0 || d.pendingIngresos > 0 || d.proyIngresos > 0;
                const hasEg  = d.egresos > 0  || d.pendingEgresos > 0 || d.proyEgresos > 0;
                return (
                  <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className={cn("text-[10px] font-black uppercase tracking-widest", colors[i])}>{d.label}</p>
                      <span className="text-[10px] font-bold text-slate-400">{d.date} mov.</span>
                    </div>
                    {hasIn && (
                      <div className="rounded-xl px-3 py-2 bg-brand-success/5 space-y-0.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ingresos</p>
                        {d.ingresos > 0 && <p className="text-sm font-extrabold text-brand-success" title={`+${formatCurrency(d.ingresos)}`}>+{formatCompact(d.ingresos)}</p>}
                        {d.pendingIngresos > 0 && <p className="text-xs font-bold text-brand-warning" title={`~+${formatCurrency(d.pendingIngresos)}`}>~+{formatCompact(d.pendingIngresos)}</p>}
                        {d.proyIngresos > 0 && <p className="text-xs font-bold text-brand-dark" title={`~+${formatCurrency(d.proyIngresos)}`}>~+{formatCompact(d.proyIngresos)}</p>}
                      </div>
                    )}
                    {hasEg && (
                      <div className="rounded-xl px-3 py-2 bg-brand-danger/5 space-y-0.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Egresos</p>
                        {d.egresos > 0 && <p className="text-sm font-extrabold text-brand-danger" title={`-${formatCurrency(d.egresos)}`}>-{formatCompact(d.egresos)}</p>}
                        {d.pendingEgresos > 0 && <p className="text-xs font-bold text-brand-warning" title={`~-${formatCurrency(d.pendingEgresos)}`}>~-{formatCompact(d.pendingEgresos)}</p>}
                        {d.proyEgresos > 0 && <p className="text-xs font-bold text-brand-dark" title={`~-${formatCurrency(d.proyEgresos)}`}>~-{formatCompact(d.proyEgresos)}</p>}
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
                      <div className="flex-1 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col items-center justify-center gap-0.5 p-2 min-h-[60px]">
                        {d.ingresos > 0 && <span className="text-[10px] font-bold text-brand-success" title={`+${formatCurrency(d.ingresos)}`}>+{formatCompact(d.ingresos)}</span>}
                        {d.pendingIngresos > 0 && <span className="text-[10px] font-bold text-brand-warning" title={`~+${formatCurrency(d.pendingIngresos)}`}>~+{formatCompact(d.pendingIngresos)}</span>}
                        {d.proyIngresos > 0 && <span className="text-[10px] font-bold text-brand-dark" title={`~+${formatCurrency(d.proyIngresos)}`}>~+{formatCompact(d.proyIngresos)}</span>}
                        {d.ingresos === 0 && d.pendingIngresos === 0 && d.proyIngresos === 0 && <span className="text-[10px] font-bold text-slate-300">—</span>}
                      </div>
                      <div className="h-24 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col items-center justify-center gap-0.5 p-2">
                        {d.egresos > 0 && <span className="text-[10px] font-bold text-brand-danger" title={`-${formatCurrency(d.egresos)}`}>-{formatCompact(d.egresos)}</span>}
                        {d.pendingEgresos > 0 && <span className="text-[10px] font-bold text-brand-warning" title={`~-${formatCurrency(d.pendingEgresos)}`}>~-{formatCompact(d.pendingEgresos)}</span>}
                        {d.proyEgresos > 0 && <span className="text-[10px] font-bold text-brand-dark" title={`~-${formatCurrency(d.proyEgresos)}`}>~-{formatCompact(d.proyEgresos)}</span>}
                        {d.egresos === 0 && d.pendingEgresos === 0 && d.proyEgresos === 0 && <span className="text-[10px] font-bold text-slate-300">—</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {periodAlerts.length > 0 && (
        <div className="bg-white rounded-3xl sm:rounded-[40px] border border-slate-100 card-shadow overflow-hidden">
          <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Alertas de Liquidez</h3>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
              {periodAlerts.length} {periodAlerts.length === 1 ? 'alerta' : 'alertas'}
            </span>
          </div>
          <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
            {periodAlerts.map(alert => (
              <div key={alert.id} className="flex items-center gap-4 px-6 sm:px-8 py-4 hover:bg-slate-50 transition-colors">
                <div className={cn("shrink-0 w-8 h-8 rounded-xl flex items-center justify-center",
                  alert.type === 'danger' ? "bg-brand-danger/10 text-brand-danger" : "bg-brand-success/10 text-brand-success"
                )}>
                  {alert.type === 'danger'
                    ? <AlertTriangle size={16} />
                    : <ArrowDownCircle size={16} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{alert.description}</p>
                  <p className="text-xs font-semibold text-slate-400">{alert.title} · {alert.dueDate}</p>
                </div>
                <p className={cn("text-sm font-black shrink-0",
                  alert.type === 'danger' ? "text-brand-danger" : "text-brand-success"
                )}>
                  {alert.type === 'danger' ? '-' : '+'}{formatCurrency(alert.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl sm:rounded-[40px] border border-slate-100 card-shadow overflow-hidden">
        <div className="p-4 sm:p-8 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Movimientos Detallados</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(v => !v)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-colors relative",
                showFilters || activeFilters > 0
                  ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <Filter size={18} /><span>Filtros</span>
              {activeFilters > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-danger text-white text-[10px] font-black rounded-full flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </button>
            {canWrite(user?.role) && (
              <>
                <button onClick={onCreateProjection} className="flex items-center gap-2 bg-brand-warning text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-accent transition-all shadow-lg shadow-brand-warning/20">
                  <Plus size={20} /><span>Nueva Proyección</span>
                </button>
                <button onClick={onCreateMovement} className="flex items-center gap-2 bg-brand-dark text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-accent transition-all shadow-lg shadow-brand-dark/20">
                  <Plus size={20} /><span>Nuevo Movimiento</span>
                </button>
              </>
            )}
          </div>
        </div>

        <TransactionFilters
          show={showFilters}
          filters={filters}
          onChange={handleFilterChange}
          onClear={clearFilters}
        />

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
                    {allMovements.length === 0 ? `Sin movimientos en ${title.toLowerCase()}` : 'Ningún movimiento coincide con los filtros aplicados'}
                  </td>
                </tr>
              ) : pagedTxs.map(m => (
                <tr
                  key={m.id}
                  onClick={() => { if (m.rawTx) setSelectedTx(m.rawTx); else if (m.rawDoc) setSelectedDoc(m.rawDoc); }}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-3 sm:px-8 py-3 sm:py-6 text-sm font-semibold text-slate-500 whitespace-nowrap">{m.date}</td>
                  <td className="px-3 sm:px-8 py-3 sm:py-6">
                    <p className="text-sm font-bold text-slate-900 line-clamp-1">{m.description}</p>
                    {m.detail && <p className="text-[10px] font-semibold text-slate-500 mt-0.5 line-clamp-1">{m.detail}</p>}
                    {m.reference && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{m.reference}</p>}
                  </td>
                  <td className="hidden sm:table-cell px-3 sm:px-8 py-3 sm:py-6">
                    <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-lg">{m.category}</span>
                  </td>
                  <td className="px-3 sm:px-8 py-3 sm:py-6">
                    <div className={cn("flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider", m.type === 'Ingreso' ? "text-brand-success" : "text-brand-danger")}>
                      {m.type === 'Ingreso' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                      <span className="hidden sm:inline">{m.type}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-8 py-3 sm:py-6 text-right">
                    <span className="text-sm font-extrabold text-slate-900">{formatCurrency(m.amount)}</span>
                  </td>
                  <td className="px-3 sm:px-8 py-3 sm:py-6 text-right">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="hidden sm:table-cell px-3 sm:px-8 py-3 sm:py-6">
                    {m.isProjection ? (
                      <span className="text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-widest border bg-brand-primary/10 text-brand-primary border-brand-primary/20">
                        Proyección
                      </span>
                    ) : (
                      <span className={cn(
                        "text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-widest border",
                        m.source === 'Siigo' ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" : "bg-slate-100 text-slate-500 border-slate-200"
                      )}>{m.source}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={txPage}
          totalPages={txTotalPages}
          total={filteredTxs.length}
          pageSize={TX_PAGE_SIZE}
          onPage={setTxPage}
        />
      </div>
    </motion.div>
    </>
  );
}
