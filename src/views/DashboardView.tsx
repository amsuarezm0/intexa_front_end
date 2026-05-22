import { useState, useEffect } from 'react';
import {
  Building2,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  Calendar,
  Plus,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion } from 'motion/react';
import { Skeleton, SkeletonCard, SkeletonChart } from '../components/Skeleton';
import { dashboardService, type DashboardSummary } from '../services';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';

const PIE_COLORS = [
  '#3B82F6', // blue    – Tecnología
  '#10B981', // emerald – Ventas
  '#8B5CF6', // violet  – Personal
  '#F59E0B', // amber   – Finanzas
  '#EC4899', // pink    – Marketing
  '#F97316', // orange  – Operaciones
  '#14B8A6', // teal    – Administración
  '#EF4444', // red     – Legal
];

export function DashboardView({ onCreateMovement }: { onCreateMovement?: () => void }) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { formatCurrency, formatCompact } = useSettings();

  useEffect(() => {
    dashboardService.getSummary()
      .then(setData)
      .catch(() => setError('No se pudo cargar el dashboard.'))
      .finally(() => setIsLoading(false));
  }, []);

  if (error) return <div className="p-8 text-brand-danger font-semibold">{error}</div>;
  if (isLoading || !data) {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><SkeletonChart /></div>
          <SkeletonChart />
        </div>
      </div>
    );
  }

  const statIcons = [Building2, ArrowDownCircle, ArrowUpCircle];

  return (
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
          <button
            onClick={onCreateMovement}
            className="flex items-center gap-2 bg-brand-dark text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-accent transition-all active:scale-[0.98] shadow-lg shadow-brand-dark/20"
          >
            <Plus size={20} />
            <span>Nuevo Registro</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.stats.map((stat, i) => {
          const Icon = statIcons[i] ?? Building2;
          return (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow group hover:border-brand-primary/30 transition-all cursor-default">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className={cn(
                  "p-2.5 rounded-xl transition-colors group-hover:scale-110",
                  i === 0 ? "bg-slate-100 text-brand-primary" :
                  i === 1 ? "bg-brand-success/10 text-brand-success" :
                  "bg-brand-danger/10 text-brand-danger"
                )}>
                  <Icon size={24} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full",
                  stat.isPositive ? "bg-brand-success/10 text-brand-success" : "bg-brand-danger/10 text-brand-danger"
                )}>
                  {stat.change}
                </span>
                <span className="text-xs text-slate-400 font-medium">{stat.trendText}</span>
              </div>
            </div>
          );
        })}

        <div className="bg-brand-primary p-6 rounded-2xl text-white relative overflow-hidden group hover:scale-[1.02] transition-all cursor-default shadow-xl shadow-brand-primary/20">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold opacity-70 uppercase tracking-widest">FLUJO NETO</p>
                <p className="text-2xl font-bold">{formatCurrency(data.netFlow)}</p>
              </div>
              <div className="bg-white/20 p-2 rounded-xl">
                <TrendingUp size={24} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <div className="flex gap-0.5">
                {[...Array(3)].map((_, i) => <div key={i} className="w-1.5 h-3 bg-brand-success rounded-full" />)}
              </div>
              <p className="text-xs font-medium text-brand-success">Salud financiera: Óptima</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform" />
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
                <div className="w-2 h-2 rounded-full bg-brand-success" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">INGRESOS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-primary" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SALDO</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', padding: '12px' }} />
                <Bar dataKey="ingresos" radius={[6, 6, 0, 0]} barSize={40}>
                  {data.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'MAY' ? '#003366' : entry.name === 'JUN' ? '#10B981' : '#E2E8F0'} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="saldo" stroke="#003366" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#003366', stroke: '#fff', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-[32px] border border-slate-100 card-shadow flex flex-col">
          <div className="mb-8">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Distribución de Gastos</h3>
            <p className="text-sm text-slate-400 font-medium">Por categorías principales este mes</p>
          </div>
          <div className="flex-1 min-h-[250px] relative">
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
              <span className="text-3xl font-bold text-slate-900 tracking-tight">$8.2k</span>
            </div>
          </div>
          <div className="mt-8 space-y-4">
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
            {data.alerts.map((alert) => (
              <div key={alert.id} className={cn(
                "p-4 sm:p-6 rounded-2xl sm:rounded-3xl border hover:opacity-90 transition-all cursor-pointer group",
                alert.type === 'danger' ? "bg-brand-danger/5 border-brand-danger/10 hover:bg-brand-danger/[0.08]" : "bg-slate-50 border-slate-100 hover:bg-white hover:shadow-lg"
              )}>
                <div className="flex gap-4">
                  <div className={cn("p-3 rounded-2xl h-fit", alert.type === 'danger' ? "bg-brand-danger/20" : "bg-slate-200 text-slate-600")}>
                    {alert.type === 'danger' ? <AlertCircle size={24} className="text-brand-danger" /> : <Clock size={24} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h4 className={cn("font-bold text-slate-900", alert.type === 'danger' && "group-hover:text-brand-danger transition-colors")}>{alert.title}</h4>
                      <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed font-medium">{alert.description}</p>
                  </div>
                </div>
              </div>
            ))}
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
            {data.weeklyData.map((week) => (
              <div key={week.week} className="space-y-3">
                <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>SEMANA {week.week}</span>
                  <span className="text-slate-900">{formatCompact(week.ingresos)} / {formatCompact(week.egresos)}</span>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-brand-success transition-all duration-700" style={{ width: `${(week.ingresos / (week.ingresos + week.egresos)) * 100}%` }} />
                  <div className="h-full bg-brand-primary transition-all duration-700" style={{ width: `${(week.egresos / (week.ingresos + week.egresos)) * 70}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
