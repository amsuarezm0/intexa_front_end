import { useState, useEffect } from 'react';
import {
  ArrowDownCircle, ArrowUpCircle,
  Calendar as CalendarIcon, ChevronDown,
  TrendingUp, TrendingDown, Building2
} from 'lucide-react';
import { motion } from 'motion/react';
import { projectionsService, categoriesService, type Category, type CreateProjectionInput } from '../services';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';

interface CreateProjectionViewProps {
  onBack: () => void;
  onSave: () => void;
}

export function CreateProjectionView({ onBack, onSave }: CreateProjectionViewProps) {
  const [type, setType] = useState<'Ingreso' | 'Egreso'>('Ingreso');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { formatCurrency, currencyCode } = useSettings();

  useEffect(() => {
    categoriesService.list()
      .then(cats => { setCategories(cats); if (cats.length > 0) setCategory(cats[0].name); })
      .catch(() => {});
  }, []);

  const amountNum = parseFloat(amount.replace(/,/g, '.')) || 0;

  const daysUntil = date
    ? Math.max(0, Math.round((new Date(date).getTime() - Date.now()) / 86_400_000))
    : null;

  const horizon = daysUntil === null ? null
    : daysUntil <= 30 ? 30
    : daysUntil <= 60 ? 60
    : daysUntil <= 90 ? 90
    : null;

  const handleSave = async () => {
    if (!date || !amount || !description) {
      setError('Por favor complete todos los campos requeridos.');
      return;
    }
    if (daysUntil !== null && daysUntil > 90) {
      setError('La fecha esperada debe estar dentro de los próximos 90 días.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const body: CreateProjectionInput = {
        date,
        description,
        category,
        type,
        amount: amountNum,
      };
      await projectionsService.create(body);
      onSave();
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar la proyección');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 pb-12">
      <nav className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <button onClick={onBack} className="hover:text-brand-primary transition-colors">GESTIÓN ARCA</button>
        <div className="w-1 h-1 bg-slate-300 rounded-full" />
        <button onClick={onBack} className="hover:text-brand-primary transition-colors">PROYECCIONES</button>
        <div className="w-1 h-1 bg-slate-300 rounded-full" />
        <span className="text-brand-primary">NUEVA PROYECCIÓN</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Nueva Proyección</h1>
            <p className="text-slate-500 font-semibold tracking-tight">Registra un ingreso o egreso futuro esperado. No afectará el saldo real hasta ser conciliado.</p>
          </div>

          <div className="bg-white p-5 sm:p-10 rounded-3xl sm:rounded-[48px] border border-slate-100 card-shadow space-y-10">
            {error && (
              <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-sm font-semibold px-4 py-3 rounded-2xl">{error}</div>
            )}

            {/* Type */}
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">TIPO DE FLUJO ESPERADO</label>
              <div className="flex gap-4">
                {(['Ingreso', 'Egreso'] as const).map(t => (
                  <button key={t} onClick={() => setType(t)} className={cn(
                    "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 transition-all font-bold",
                    type === t
                      ? t === 'Ingreso' ? "border-brand-success bg-brand-success/5 text-brand-success" : "border-brand-danger bg-brand-danger/5 text-brand-danger"
                      : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                  )}>
                    {t === 'Ingreso' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                    <span>{t === 'Ingreso' ? 'Ingreso Esperado' : 'Egreso Esperado'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">FECHA ESPERADA</label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setDate(e.target.value)}
                    className="w-full pl-5 pr-12 py-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand-primary transition-all"
                  />
                  <CalendarIcon className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                </div>
                {daysUntil !== null && (
                  <p className={cn("text-xs font-bold pl-1", daysUntil > 90 ? "text-brand-danger" : "text-slate-400")}>
                    {daysUntil === 0 ? 'Hoy' : `En ${daysUntil} día${daysUntil !== 1 ? 's' : ''}`}
                    {daysUntil > 90 && ' — fuera del horizonte de 90 días'}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">MONTO ESPERADO ({currencyCode})</label>
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
                placeholder="Ej: Cobro factura cliente Acme, cuota de arriendo oficina..."
                className="w-full px-5 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-semibold text-slate-700 outline-none focus:border-brand-primary focus:bg-white transition-all h-32 resize-none"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={onBack} className="flex-1 py-5 rounded-3xl font-black text-slate-400 hover:bg-slate-50 transition-all uppercase tracking-widest text-sm">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-[2] bg-brand-dark text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-brand-accent shadow-xl shadow-brand-dark/20 transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Guardar Proyección'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[48px] border border-slate-100 card-shadow space-y-8">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Impacto en Horizonte</h3>
            <div className="space-y-4">
              {([30, 60, 90] as const).map(d => {
                const inWindow = horizon !== null && d >= horizon;
                return (
                  <div key={d} className={cn(
                    "flex items-center justify-between p-4 rounded-2xl transition-all",
                    inWindow
                      ? type === 'Ingreso' ? "bg-brand-success/10 border border-brand-success/20" : "bg-brand-danger/10 border border-brand-danger/20"
                      : "bg-slate-50 border border-slate-100"
                  )}>
                    <div className="flex items-center gap-3">
                      {inWindow
                        ? (type === 'Ingreso' ? <TrendingUp size={16} className="text-brand-success" /> : <TrendingDown size={16} className="text-brand-danger" />)
                        : <Building2 size={16} className="text-slate-300" />
                      }
                      <span className={cn("text-xs font-black uppercase tracking-widest", inWindow ? (type === 'Ingreso' ? "text-brand-success" : "text-brand-danger") : "text-slate-300")}>{d} días</span>
                    </div>
                    <span className={cn("text-sm font-extrabold", inWindow ? (type === 'Ingreso' ? "text-brand-success" : "text-brand-danger") : "text-slate-300")}>
                      {inWindow && amountNum > 0
                        ? `${type === 'Ingreso' ? '+' : '-'}${formatCurrency(amountNum)}`
                        : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs font-semibold text-slate-400 leading-relaxed">
              La proyección aparecerá en los horizontes que incluyan su fecha esperada.
            </p>
          </div>

          <div className="bg-brand-dark p-5 sm:p-8 rounded-3xl sm:rounded-[48px] text-white space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Recuerda</p>
            <p className="text-sm font-semibold opacity-80 leading-relaxed">
              Las proyecciones no afectan el saldo real. Quedan como <span className="text-white font-black">Pendiente</span> hasta que se concilien con un movimiento real.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
