import {
AlertCircle,
ArrowDownCircle,
ArrowUpCircle,
Building2,
Calendar,
Check,
ChevronRight,
Clock,
Landmark,
MoreHorizontal,
Pencil,
Plus,
Sparkles,
TrendingUp,
X,
} from 'lucide-react';
import { AnimatePresence,motion } from 'motion/react';
import { useEffect,useState } from 'react';
import {
Bar,
CartesianGrid,
Cell,
ComposedChart,
Pie,
PieChart,
ResponsiveContainer,
Tooltip,
XAxis,
YAxis,
} from 'recharts';
import type { LoggedInUser } from '../App';
import { BankSaldoModal } from '../components/BankSaldoModal';
import { Skeleton,SkeletonCard,SkeletonChart } from '../components/Skeleton';
import { TransactionDetailDrawer } from '../components/TransactionDetailDrawer';
import { useSettings } from '../contexts/SettingsContext';
import { PIE_COLORS } from '../lib/colors';
import { canWrite,isTreasury } from '../lib/roles';
import { cn } from '../lib/utils';
import type { Transaction } from '../services';
import { dashboardService,transactionsService,type BankBalance,type DashboardSummary } from '../services';

const SALDO_UPDATED_KEY = 'arca_saldo_updated_date';

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function hasSaldoBeenUpdatedToday(): boolean {
  return localStorage.getItem(SALDO_UPDATED_KEY) === todayISODate();
}

function markSaldoUpdatedToday() {
  localStorage.setItem(SALDO_UPDATED_KEY, todayISODate());
}

function financialHealth(income: number, netFlow: number): { label: string; bars: number; color: string; barColor: string } {
  if (income === 0) return { label: 'Sin datos',  bars: 0, color: 'text-slate-400',      barColor: 'bg-white/20' };
  const ratio = netFlow / income;
  if (ratio >= 0.20)  return { label: 'Óptima',    bars: 5, color: 'text-brand-success',  barColor: 'bg-brand-success' };
  if (ratio >= 0.05)  return { label: 'Buena',     bars: 4, color: 'text-emerald-300',    barColor: 'bg-emerald-300' };
  if (ratio >= 0)     return { label: 'Estable',   bars: 3, color: 'text-yellow-300',     barColor: 'bg-yellow-300' };
  if (ratio >= -0.10) return { label: 'En riesgo', bars: 2, color: 'text-orange-400',     barColor: 'bg-orange-400' };
  return                     { label: 'Crítica',   bars: 1, color: 'text-brand-danger',   barColor: 'bg-brand-danger' };
}

export function DashboardView({
  onCreateMovement,
  user,
}: {
  onCreateMovement?: () => void;
  user?: LoggedInUser | null;
}) {
  const emptyDashboard: DashboardSummary = { stats: [], netFlow: 0, monthIncome: 0, monthExpense: 0, chartData: [], expensePie: [], alerts: [], weeklyData: [] };
  const [data, setData] = useState<DashboardSummary>(emptyDashboard);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [bankBalance, setBankBalance] = useState<BankBalance | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showSaldoModal, setShowSaldoModal] = useState(false);
  const [isEditingSaldo, setIsEditingSaldo] = useState(false);
  const [saldoInput, setSaldoInput] = useState('');
  const [saldoSaving, setSaldoSaving] = useState(false);
  const { formatCurrency, formatCompact } = useSettings();

  const isTesorero = isTreasury(user?.role);

  useEffect(() => {
    dashboardService.getSummary()
      .then(setData)
      .catch(() => setError('No se pudo cargar el dashboard.'))
      .finally(() => setIsLoading(false));

    dashboardService.getBankBalance()
      .then(setBankBalance)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isTesorero && !hasSaldoBeenUpdatedToday()) {
      setShowSaldoModal(true);
    }
  }, [isTesorero]);

  async function handleSaldoUpdate(amount: number) {
    setSaldoSaving(true);
    try {
      const updated = await dashboardService.updateBankBalance(amount);
      setBankBalance(updated);
      markSaldoUpdatedToday();
    } catch {
      setBankBalance(prev => prev
        ? { ...prev, amount, updatedAt: new Date().toISOString() }
        : { amount, updatedAt: new Date().toISOString(), updatedBy: user?.name ?? '' }
      );
      markSaldoUpdatedToday();
    } finally {
      setSaldoSaving(false);
      setShowSaldoModal(false);
      setIsEditingSaldo(false);
    }
  }

  function handleModalConfirm(amount: number) {
    handleSaldoUpdate(amount);
  }

  function handleModalSkip() {
    setShowSaldoModal(false);
  }

  function handleAlertClick(alertId: string) {
    setIsLoadingDetail(true);
    transactionsService.get(alertId)
      .then(setSelectedTx)
      .catch(() => {})
      .finally(() => setIsLoadingDetail(false));
  }

  function startInlineEdit() {
    setSaldoInput(bankBalance?.amount?.toString() ?? '');
    setIsEditingSaldo(true);
  }

  function cancelInlineEdit() {
    setIsEditingSaldo(false);
    setSaldoInput('');
  }

  async function confirmInlineEdit() {
    const parsed = parseFloat(saldoInput.replace(/,/g, '.'));
    if (isNaN(parsed) || parsed < 0) return;
    await handleSaldoUpdate(parsed);
  }

  if (error) return <div className="p-8 text-brand-danger font-semibold">{error}</div>;
  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-12 w-40 rounded-xl" />
            <Skeleton className="h-12 w-48 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
          <SkeletonCard /><SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><SkeletonChart /></div>
          <SkeletonChart />
        </div>
      </div>
    );
  }

  const saldoUpdatedLabel = bankBalance?.updatedAt
    ? `Actualizado: ${new Date(bankBalance.updatedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
    : 'Sin actualizar hoy';


  return (
    <>
      <TransactionDetailDrawer
        transaction={selectedTx}
        isLoading={isLoadingDetail}
        onClose={() => setSelectedTx(null)}
        onDeleted={() => dashboardService.getSummary().then(setData)}
        onUpdated={() => dashboardService.getSummary().then(setData)}
      />
      <AnimatePresence>
        {showSaldoModal && (
          <BankSaldoModal onConfirm={handleModalConfirm} onSkip={handleModalSkip} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 pb-12"
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard General</h1>
            <p className="text-slate-500 font-medium tracking-tight">Bienvenido de nuevo. Aquí está el estado de tu flujo de caja hoy.</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors">
              <Calendar size={18} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Últimos 30 días</span>
            </div>
            {canWrite(user?.role) && (
              <button
                onClick={onCreateMovement}
                className="flex items-center gap-2 bg-brand-dark text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-accent transition-all active:scale-[0.98] shadow-lg shadow-brand-dark/20"
              >
                <Plus size={20} />
                <span>Nuevo Registro</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid — 3 cols: col 1 = Saldo Bancario/Ingresos, col 2 = Saldo Actual/Egresos, col 3 = Flujo Neto full-height */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:items-stretch">
          {/* Col 1: Saldo Bancario + Ingresos */}
          <div className="flex flex-col gap-6">
            <div className={cn(
              "bg-white p-6 rounded-2xl border card-shadow group transition-all cursor-default",
              !hasSaldoBeenUpdatedToday() && isTesorero
                ? "border-amber-200 ring-1 ring-amber-200"
                : "border-slate-100 hover:border-brand-primary/30"
            )}>
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">SALDO BANCARIO</p>
                  {isEditingSaldo ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        value={saldoInput}
                        onChange={e => setSaldoInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') confirmInlineEdit(); if (e.key === 'Escape') cancelInlineEdit(); }}
                        autoFocus
                        className="w-full px-2 py-1 border border-brand-primary/40 rounded-lg text-slate-900 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      />
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-slate-900" title={bankBalance ? formatCurrency(bankBalance.amount) : undefined}>
                      {bankBalance ? formatCompact(bankBalance.amount) : '—'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {isEditingSaldo ? (
                    <>
                      <button onClick={confirmInlineEdit} disabled={saldoSaving} className="p-1.5 rounded-lg bg-brand-success/10 text-brand-success hover:bg-brand-success/20 transition-colors">
                        <Check size={16} />
                      </button>
                      <button onClick={cancelInlineEdit} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                        <Landmark size={22} />
                      </div>
                      {isTesorero && (
                        <button onClick={startInlineEdit} className="p-1.5 rounded-lg text-slate-300 hover:text-brand-primary hover:bg-slate-50 transition-colors" title="Editar saldo bancario">
                          <Pencil size={15} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!hasSaldoBeenUpdatedToday() && isTesorero ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">Pendiente actualizar</span>
                ) : (
                  <span className="text-xs text-slate-400 font-medium truncate">{saldoUpdatedLabel}</span>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow group hover:border-brand-primary/30 transition-all cursor-default">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{data.stats[1]?.title ?? '—'}</p>
                  <p className="text-2xl font-bold text-slate-900" title={data.stats[1] != null ? formatCurrency(data.stats[1].value) : undefined}>{data.stats[1] != null ? formatCompact(data.stats[1].value) : '—'}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-brand-success/10 text-brand-success group-hover:scale-110 transition-transform">
                  <ArrowDownCircle size={24} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", data.stats[1]?.isPositive ? "bg-brand-success/10 text-brand-success" : "bg-brand-danger/10 text-brand-danger")}>
                  {data.stats[1]?.change ?? '—'}
                </span>
                <span className="text-xs text-slate-400 font-medium">{data.stats[1]?.trendText}</span>
              </div>
            </div>
          </div>

          {/* Col 2: Saldo Actual (stats[0]) + Egresos */}
          <div className="flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow group hover:border-brand-primary/30 transition-all cursor-default">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{data.stats[0]?.title ?? '—'}</p>
                  <p className="text-2xl font-bold text-slate-900" title={data.stats[0] != null ? formatCurrency(data.stats[0].value) : undefined}>{data.stats[0] != null ? formatCompact(data.stats[0].value) : '—'}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100 text-brand-primary group-hover:scale-110 transition-transform">
                  <Building2 size={24} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", data.stats[0]?.isPositive ? "bg-brand-success/10 text-brand-success" : "bg-brand-danger/10 text-brand-danger")}>
                  {data.stats[0]?.change ?? '—'}
                </span>
                <span className="text-xs text-slate-400 font-medium">{data.stats[0]?.trendText}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow group hover:border-brand-primary/30 transition-all cursor-default">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{data.stats[2]?.title ?? '—'}</p>
                  <p className="text-2xl font-bold text-slate-900" title={data.stats[2] != null ? formatCurrency(data.stats[2].value) : undefined}>{data.stats[2] != null ? formatCompact(data.stats[2].value) : '—'}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-brand-danger/10 text-brand-danger group-hover:scale-110 transition-transform">
                  <ArrowUpCircle size={24} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", data.stats[2]?.isPositive ? "bg-brand-success/10 text-brand-success" : "bg-brand-danger/10 text-brand-danger")}>
                  {data.stats[2]?.change ?? '—'}
                </span>
                <span className="text-xs text-slate-400 font-medium">{data.stats[2]?.trendText}</span>
              </div>
            </div>
          </div>

          {/* Col 3: Flujo Neto — stretches to match the two-card columns */}
          <div className="bg-brand-primary p-6 rounded-2xl text-white relative overflow-hidden group hover:scale-[1.01] transition-all cursor-default shadow-xl shadow-brand-primary/20">
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold opacity-70 uppercase tracking-widest">FLUJO NETO</p>
                  <p className="text-2xl font-bold mt-1 break-words" title={formatCurrency(data.netFlow)}>{formatCompact(data.netFlow)}</p>
                </div>
                <div className="bg-white/20 p-2.5 rounded-xl shrink-0 ml-2">
                  <TrendingUp size={24} />
                </div>
              </div>
              {(() => {
                const h = financialHealth(data.monthIncome, data.netFlow);
                return (
                  <div className="space-y-3">
                    <div className="h-px bg-white/10" />
                    <div className="flex items-center gap-2">
                      <div className="flex items-end gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={cn("w-1.5 rounded-full transition-all", i < h.bars ? h.barColor : "bg-white/20")}
                            style={{ height: `${8 + i * 4}px` }}
                          />
                        ))}
                      </div>
                      <p className={cn("text-xs font-medium", h.color)}>Salud financiera: {h.label}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="absolute top-0 right-0 w-36 h-36 bg-white/5 rounded-full -mr-18 -mt-18 group-hover:scale-125 transition-transform" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-5 sm:p-8 rounded-2xl sm:rounded-[32px] border border-slate-100 card-shadow">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Flujo de Caja Mensual</h3>
                <p className="text-sm text-slate-400 font-medium">Comparativa histórica de liquidez operativa</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-brand-success" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">INGRESOS</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-brand-danger" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">EGRESOS</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} dy={10} />
                  <YAxis hide width={0} />
                  <Tooltip
                    cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', padding: '12px 16px' }}
                    formatter={(value: number, name: string) => [
                      formatCompact(value),
                      name === 'ingresos' ? 'Ingresos' : 'Egresos',
                    ]}
                    labelStyle={{ fontWeight: 700, color: '#0F172A', marginBottom: 4 }}
                  />
                  <Bar dataKey="ingresos" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="egresos" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-[32px] border border-slate-100 card-shadow flex flex-col">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Distribución de Gastos</h3>
              <p className="text-sm text-slate-400 font-medium">Por categorías principales este mes</p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
              <div className="w-full h-[250px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.expensePie} cx="50%" cy="50%" innerRadius={80} outerRadius={105} paddingAngle={8} dataKey="value">
                      {data.expensePie.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOTAL</span>
                  <span className="text-3xl font-bold text-slate-900 tracking-tight pointer-events-auto" title={data.stats[2] != null ? formatCurrency(data.stats[2].value) : undefined}>{data.stats[2] != null ? formatCompact(data.stats[2].value) : formatCompact(0)}</span>
                </div>
              </div>
              <div className="w-full space-y-4">
                {data.expensePie.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index] }} />
                      <span className="text-sm font-semibold text-slate-600">{entry.name}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{entry.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Alertas de Control</h3>
              <span className="bg-brand-danger/10 text-brand-danger text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                {data.alerts.filter(a => a.type === 'danger').length} Críticas
              </span>
            </div>
            <div className="space-y-4">
              {data.alerts.map((alert) => {
                const isSynthetic = alert.id === 'balance-warning';
                return (
                  <div
                    key={alert.id}
                    onClick={isSynthetic ? undefined : () => handleAlertClick(alert.id)}
                    className={cn(
                      "p-4 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all group",
                      isSynthetic
                        ? "bg-amber-50 border-amber-200 cursor-default"
                        : alert.type === 'danger'
                          ? "bg-brand-danger/5 border-brand-danger/10 hover:bg-brand-danger/[0.08] hover:opacity-90 cursor-pointer"
                          : "bg-slate-50 border-slate-100 hover:bg-white hover:shadow-lg cursor-pointer"
                    )}
                  >
                    <div className="flex gap-4">
                      <div className={cn("p-3 rounded-2xl h-fit",
                        isSynthetic ? "bg-amber-100 text-amber-600" :
                        alert.type === 'danger' ? "bg-brand-danger/20" : "bg-slate-200 text-slate-600"
                      )}>
                        {isSynthetic
                          ? <AlertCircle size={24} className="text-amber-600" />
                          : alert.type === 'danger'
                            ? <AlertCircle size={24} className="text-brand-danger" />
                            : <Clock size={24} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h4 className={cn("font-bold",
                            isSynthetic ? "text-amber-700" :
                            alert.type === 'danger' ? "text-slate-900 group-hover:text-brand-danger transition-colors" : "text-slate-900"
                          )}>{alert.title}</h4>
                          {!isSynthetic && <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />}
                        </div>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed font-medium">
                          {alert.description}
                          {alert.amount > 0 && (
                            <span className={cn("ml-1 font-bold",
                              isSynthetic ? "text-amber-600" :
                              alert.type === 'danger' ? "text-brand-danger" : "text-slate-700"
                            )} title={formatCurrency(alert.amount)}>
                              {formatCompact(alert.amount)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bg-brand-success/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-brand-success/10 flex gap-4">
              <Sparkles className="text-brand-success shrink-0" size={24} />
              <div>
                <h4 className="font-bold text-brand-success">Sugerencia de Inteligencia</h4>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed font-medium">Considera adelantar el cobro de facturas pendientes para evitar brechas de liquidez.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-[32px] border border-slate-100 card-shadow flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Comparativa Ingresos vs Egresos</h3>
              <button className="p-2 text-slate-300 hover:text-slate-500"><MoreHorizontal size={20} /></button>
            </div>
            <div className="flex-1 space-y-8">
              {data.weeklyData.map((week) => {
                const total = week.ingresos + week.egresos;
                return (
                  <div key={week.week} className="space-y-3">
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>SEMANA {week.week}</span>
                      <span className="text-slate-900" title={`${formatCurrency(week.ingresos)} / ${formatCurrency(week.egresos)}`}>{formatCompact(week.ingresos)} / {formatCompact(week.egresos)}</span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-brand-success transition-all duration-700" style={{ width: total > 0 ? `${(week.ingresos / total) * 100}%` : '0%' }} />
                      <div className="h-full bg-brand-danger transition-all duration-700" style={{ width: total > 0 ? `${(week.egresos / total) * 100}%` : '0%' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
