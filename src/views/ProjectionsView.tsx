import { Building2,Plus,Trash2,TrendingDown,TrendingUp,X } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback,useEffect,useState } from 'react';
import { Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis } from 'recharts';
import type { LoggedInUser } from '../App';
import { ProjectionTable } from '../components/ProjectionTable';
import { Skeleton,SkeletonCard,SkeletonChart } from '../components/Skeleton';
import { TransactionDetailDrawer } from '../components/TransactionDetailDrawer';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { canWrite,canWriteProjections } from '../lib/roles';
import { cn } from '../lib/utils';
import { projectionsService,searchService,transactionsService,type ProjectionAlert,type ProjectionPeriod,type ProjectionSummary,type SearchDocument,type Transaction } from '../services';

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

// Built-in horizons, always shown and not deletable. Managers may add custom
// ones alongside these.
const FIXED_PERIODS = [30, 60, 90];

interface PeriodCard {
  days: number;
  label: string;
  fixed: boolean;
  id?: string;
}

export function ProjectionsView({ onCreateProjection, user }: { onCreateProjection?: () => void; user?: LoggedInUser | null }) {
  const [customPeriods, setCustomPeriods] = useState<ProjectionPeriod[]>([]);
  const [dataMap, setDataMap] = useState<Record<number, ProjectionSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartPeriod, setChartPeriod] = useState<number>(30);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [txLoading, setTxLoading] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newDays, setNewDays] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const toast = useToast();
  const canManage = canWriteProjections(user?.role);

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

  // `silent` refreshes in place after a mutation: no skeleton flash, and a
  // failure keeps the current data on screen instead of blanking the view.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true);
      setError('');
    }
    try {
      const custom = await projectionsService.listPeriods();
      setCustomPeriods(custom);
      const days = Array.from(new Set([...FIXED_PERIODS, ...custom.map(p => p.days)]));
      const results = await Promise.all(
        days.map(d => projectionsService.getSummary(d).then(r => [d, r] as [number, ProjectionSummary])),
      );
      const map: Record<number, ProjectionSummary> = {};
      results.forEach(([d, r]) => { map[d] = r; });
      setDataMap(map);
    } catch (err: any) {
      if (silent) throw err;
      setError(err.message ?? 'No se pudo cargar las proyecciones.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function refresh() {
    load({ silent: true }).catch((err: any) =>
      toast.error(err.message ?? 'No se pudo actualizar las proyecciones.'));
  }

  const { formatCurrency, formatCompact } = useSettings();

  async function handleAddPeriod() {
    const days = parseInt(newDays, 10);
    if (!days || days < 1 || days > 3650) {
      toast.error('Ingrese un número de días entre 1 y 3650.');
      return;
    }
    setSaving(true);
    try {
      await projectionsService.createPeriod({ days, label: newLabel.trim() });
      setNewDays(''); setNewLabel(''); setShowAddForm(false);
      toast.success('Período agregado.');
      await load();
      setChartPeriod(days);
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo agregar el período.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePeriod(card: PeriodCard, e: React.MouseEvent) {
    e.stopPropagation();
    if (!card.id) return;
    try {
      await projectionsService.deletePeriod(card.id);
      if (chartPeriod === card.days) setChartPeriod(30);
      toast.success('Período eliminado.');
      await load();
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo eliminar el período.');
    }
  }

  if (error) return <div className="p-8 text-brand-danger font-semibold">{error}</div>;
  if (isLoading || !dataMap[30]) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-full max-w-sm mb-8" />
        <SkeletonChart />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }

  const periodCards: PeriodCard[] = [
    ...FIXED_PERIODS.map(d => ({ days: d, label: '', fixed: true })),
    ...customPeriods.map(p => ({ days: p.days, label: p.label, fixed: false, id: p.id })),
  ].sort((a, b) => a.days - b.days);

  const periodAlerts = dataMap[chartPeriod]?.alerts ?? [];
  const chartData = dataMap[chartPeriod]?.chartData ?? [];

  return (
    <>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Proyecciones Financieras</h1>
          <p className="text-slate-500 font-medium tracking-tight">Análisis predictivo de flujo de caja para la toma de decisiones estratégicas.</p>
        </div>
        {canManage && (
          <button
            onClick={onCreateProjection}
            className="flex items-center gap-2 bg-brand-warning text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-accent transition-colors shadow-lg shadow-brand-warning/20 text-sm"
          >
            <Plus size={18} /><span>Agregar proyección manual</span>
          </button>
        )}
      </div>

      {/* Comparison cards — fixed periods + custom, plus an add tile for managers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {periodCards.map(card => {
          const p = dataMap[card.days];
          const isActive = card.days === chartPeriod;
          return (
            <div
              key={card.days}
              role="button"
              tabIndex={0}
              onClick={() => setChartPeriod(card.days)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setChartPeriod(card.days); } }}
              className={cn(
                "text-left p-5 sm:p-8 rounded-3xl sm:rounded-[40px] border transition-all group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40",
                isActive
                  ? "bg-brand-dark border-brand-dark shadow-2xl shadow-brand-dark/20"
                  : "bg-white border-slate-100 card-shadow hover:border-slate-200"
              )}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border self-start",
                    isActive
                      ? "text-white/70 border-white/20 bg-white/10"
                      : "text-slate-400 border-slate-200 bg-slate-50"
                  )}>{card.days} DÍAS</span>
                  {card.label && (
                    <span className={cn("text-xs font-bold tracking-tight truncate", isActive ? "text-white" : "text-slate-600")} title={card.label}>
                      {card.label}
                    </span>
                  )}
                </div>
                {!card.fixed && canManage ? (
                  <button
                    onClick={e => handleDeletePeriod(card, e)}
                    title="Eliminar período"
                    className={cn(
                      "p-1.5 rounded-lg transition-colors shrink-0",
                      isActive ? "text-white/50 hover:text-white hover:bg-white/10" : "text-slate-300 hover:text-brand-danger hover:bg-brand-danger/10"
                    )}
                  >
                    <Trash2 size={15} />
                  </button>
                ) : (
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all shrink-0",
                    isActive ? "bg-white scale-125" : "bg-slate-200 group-hover:bg-brand-primary/40"
                  )} />
                )}
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
            </div>
          );
        })}

        {/* Add-period tile (managers only) */}
        {canManage && (
          <div className="p-5 sm:p-8 rounded-3xl sm:rounded-[40px] border-2 border-dashed border-slate-200 flex flex-col justify-center min-h-[220px]">
            {showAddForm ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nuevo período</p>
                  <button onClick={() => { setShowAddForm(false); setNewDays(''); setNewLabel(''); }} className="text-slate-300 hover:text-slate-500"><X size={16} /></button>
                </div>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={newDays}
                  onChange={e => setNewDays(e.target.value)}
                  placeholder="Días (ej. 120)"
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-brand-primary transition-all"
                />
                <input
                  type="text"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddPeriod(); }}
                  placeholder="Etiqueta (opcional)"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-brand-primary transition-all"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddPeriod}
                    disabled={saving}
                    className="flex-1 bg-brand-primary text-white py-2.5 rounded-xl font-bold text-sm hover:bg-brand-accent transition-colors disabled:opacity-60"
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddForm(true)} className="flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-brand-primary transition-colors h-full w-full py-6">
                <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-current flex items-center justify-center">
                  <Plus size={22} />
                </div>
                <span className="text-sm font-bold">Agregar período</span>
              </button>
            )}
          </div>
        )}
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
      onDeleted={() => { setSelectedTx(null); refresh(); }}
      onUpdated={tx => { setSelectedTx(tx); refresh(); }}
      canWrite={canWrite(user?.role)}
    />
    </>
  );
}
