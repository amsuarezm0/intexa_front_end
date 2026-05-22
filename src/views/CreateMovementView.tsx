import { useState, useEffect } from 'react';
import {
  ArrowLeft, ArrowDownCircle, ArrowUpCircle,
  Calendar as CalendarIcon, ChevronDown,
  Sparkles, Zap, User, CheckCircle2, TrendingUp
} from 'lucide-react';
import { motion } from 'motion/react';
import { transactionsService, categoriesService, type Category, type TransactionSummary } from '../services';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';

interface CreateMovementViewProps {
  onBack: () => void;
  onSave: () => void;
  initialIsProjection?: boolean;
}

export function CreateMovementView({ onBack, onSave, initialIsProjection = false }: CreateMovementViewProps) {
  const [type, setType] = useState<'Ingreso' | 'Egreso'>('Ingreso');
  const [source, setSource] = useState<'SIIGO' | 'Manual'>('Manual');
  const [isProjection, setIsProjection] = useState(initialIsProjection);
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    categoriesService.list()
      .then(cats => { setCategories(cats); if (cats.length > 0) setCategory(cats[0].name); })
      .catch(() => {});
    transactionsService.summary()
      .then(setSummary)
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!date || !amount || !description) {
      setError('Por favor complete todos los campos requeridos.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await transactionsService.create({
        date,
        description,
        category,
        type,
        amount: parseFloat(amount.replace(/,/g, '.')),
        status: 'Pendiente',
        source,
        isProjection,
      });
      onSave();
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar el movimiento');
    } finally {
      setSaving(false);
    }
  };

  const amountNum = parseFloat(amount.replace(/,/g, '.')) || 0;
  const { formatCurrency, currencyCode } = useSettings();

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 pb-12">
      <nav className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <button onClick={onBack} className="hover:text-brand-primary transition-colors">GESTIÓN ARCA</button>
        <div className="w-1 h-1 bg-slate-300 rounded-full" />
        <button onClick={onBack} className="hover:text-brand-primary transition-colors">MOVIMIENTOS</button>
        <div className="w-1 h-1 bg-slate-300 rounded-full" />
        <span className="text-brand-primary">NUEVO REGISTRO</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Crear Movimiento</h1>
            <p className="text-slate-500 font-semibold tracking-tight">Complete los detalles para registrar una nueva transacción o proyección.</p>
          </div>

          <div className="bg-white p-5 sm:p-10 rounded-3xl sm:rounded-[48px] border border-slate-100 card-shadow space-y-10">
            {error && (
              <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-sm font-semibold px-4 py-3 rounded-2xl">{error}</div>
            )}

            {/* Type */}
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">TIPO DE MOVIMIENTO</label>
              <div className="flex gap-4">
                {(['Ingreso', 'Egreso'] as const).map(t => (
                  <button key={t} onClick={() => setType(t)} className={cn(
                    "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 transition-all font-bold",
                    type === t
                      ? t === 'Ingreso' ? "border-brand-success bg-brand-success/5 text-brand-success" : "border-brand-primary bg-brand-primary/5 text-brand-primary"
                      : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                  )}>
                    {t === 'Ingreso' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                    <span>{t}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">FECHA</label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full pl-5 pr-12 py-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand-primary transition-all"
                  />
                  <CalendarIcon className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">MONTO ({currencyCode})</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="text"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-10 pr-5 py-5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:border-brand-primary transition-all text-right"
                  />
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">CATEGORÍA</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-5 py-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 appearance-none outline-none focus:border-brand-primary transition-all"
                >
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">DESCRIPCIÓN</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Detalle del movimiento..."
                className="w-full px-5 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-semibold text-slate-700 outline-none focus:border-brand-primary focus:bg-white transition-all h-32 resize-none"
              />
            </div>

            {/* Source */}
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">ORIGEN DEL DATO</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['SIIGO', 'Manual'] as const).map(s => (
                  <button key={s} onClick={() => setSource(s)} className={cn(
                    "relative p-6 rounded-3xl border-2 text-left transition-all group",
                    source === s ? "border-brand-primary bg-brand-primary/5" : "border-slate-100 bg-white hover:border-slate-200"
                  )}>
                    <div className="flex justify-between items-start mb-4">
                      <div className={cn("p-3 rounded-2xl transition-colors", source === s ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-400 group-hover:bg-brand-primary/10 group-hover:text-brand-primary")}>
                        {s === 'SIIGO' ? <Zap size={24} /> : <User size={24} />}
                      </div>
                      {source === s && <div className="w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center p-1"><CheckCircle2 size={16} /></div>}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-base font-black text-slate-900">{s}</p>
                      {s === 'SIIGO' && <span className="text-[8px] font-black bg-brand-primary text-white px-2 py-0.5 rounded-md uppercase tracking-widest">AUTOMÁTICO</span>}
                    </div>
                    <p className="text-xs font-semibold text-slate-400">{s === 'SIIGO' ? 'Sincronizado vía ERP' : 'Entrada de usuario'}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Projection toggle */}
            <button
              onClick={() => setIsProjection(p => !p)}
              className={cn("w-full bg-brand-success/5 border border-brand-success/10 p-6 rounded-3xl flex items-center gap-4 transition-colors text-left", isProjection ? "bg-brand-success/10" : "hover:bg-brand-success/10")}
            >
              <div className={cn("w-6 h-6 border-2 border-brand-success rounded-md flex items-center justify-center transition-colors", isProjection ? "bg-brand-success" : "bg-white")}>
                <div className={cn("w-2.5 h-2.5 rounded-sm transition-colors", isProjection ? "bg-white" : "bg-brand-success")} />
              </div>
              <div>
                <p className="text-sm font-black text-brand-success uppercase tracking-widest">Es proyección</p>
                <p className="text-xs font-semibold text-slate-500">Este movimiento no afectará el saldo real hasta ser conciliado.</p>
              </div>
            </button>

            <div className="flex gap-4 pt-4">
              <button onClick={onBack} className="flex-1 py-5 rounded-3xl font-black text-slate-400 hover:bg-slate-50 transition-all uppercase tracking-widest text-sm">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-[2] bg-brand-primary text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-brand-accent shadow-xl shadow-brand-primary/20 transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Guardar Movimiento'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-10">
          <div className="bg-white p-5 sm:p-10 rounded-3xl sm:rounded-[48px] border border-slate-100 card-shadow space-y-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-primary/5 text-brand-primary rounded-2xl flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Impacto Estimado</h3>
            </div>
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-slate-400">Saldo Actual</p>
                <p className="text-lg font-black text-slate-900">
                  {summary ? formatCurrency(summary.totalBalance) : '—'}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-slate-400">{type === 'Ingreso' ? 'Nuevo Ingreso' : 'Nuevo Egreso'}</p>
                <p className={cn("text-lg font-black", type === 'Ingreso' ? "text-brand-success" : "text-brand-danger")}>
                  {type === 'Ingreso' ? '+' : '-'} {formatCurrency(amountNum)}
                </p>
              </div>
              <div className="pt-8 border-t border-slate-100 flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Proyectado</p>
                  <p className="text-3xl font-black text-brand-primary">
                    {summary
                      ? formatCurrency(summary.totalBalance + (type === 'Ingreso' ? amountNum : -amountNum))
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-5 sm:p-10 rounded-3xl sm:rounded-[48px] border border-slate-100 relative overflow-hidden group">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-sm">
              <Sparkles className="text-brand-primary" size={24} />
            </div>
            <h4 className="text-xl font-black text-slate-900 tracking-tight mb-4">Consejo Editorial</h4>
            <p className="text-base font-semibold text-slate-500 leading-relaxed italic">
              "Mantener las categorías estandarizadas permite una visualización de flujo de caja mucho más clara en los reportes mensuales."
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
