import { ArrowDownCircle, ArrowUpCircle, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { dialogProps,useModal } from '../hooks/useModal';
import { cn } from '../lib/utils';
import { categoriesService, type Category } from '../services';

const inputCls =
  'w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none font-semibold';
const btnSecondary =
  'flex-1 py-4 rounded-2xl font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all';
const btnPrimary =
  'flex-1 py-4 rounded-2xl font-bold bg-brand-primary text-white hover:bg-brand-accent transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-60';

interface Props {
  /** Preselects the type when opened from a form that already knows it. */
  initialType?: 'income' | 'expense';
  onSuccess: (category: Category) => void;
  onClose: () => void;
}

export function CategoryFormModal({ initialType = 'income', onSuccess, onClose }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>(initialType);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const panelRef = useModal({ onClose });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('El nombre de la categoría es obligatorio.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const created = await categoriesService.create({ name: trimmed, type });
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'No se pudo crear la categoría.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        ref={panelRef}
        {...dialogProps}
        aria-labelledby="category-form-title"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl sm:rounded-[40px] p-6 sm:p-10 w-full max-w-md shadow-2xl space-y-6 sm:space-y-8 max-h-[90dvh] overflow-y-auto outline-none"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 id="category-form-title" className="text-2xl font-black text-slate-900 tracking-tight">
              Nueva Categoría
            </h3>
            <p className="text-sm font-semibold text-slate-400 mt-1">
              Estará disponible en movimientos y proyecciones.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-sm font-semibold px-4 py-3 rounded-2xl">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="category-name" className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre</label>
            <input
              id="category-name"
              type="text"
              required
              autoFocus
              maxLength={80}
              placeholder="Ej: Gastos - Logística"
              value={name}
              onChange={e => setName(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="space-y-2">
            <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Tipo</span>
            <div className="flex gap-3">
              {([['income', 'Ingreso'], ['expense', 'Egreso']] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={type === value}
                  onClick={() => setType(value)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all font-bold",
                    type === value
                      ? value === 'income'
                        ? "border-brand-success bg-brand-success/5 text-brand-success"
                        : "border-brand-primary bg-brand-primary/5 text-brand-primary"
                      : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                  )}
                >
                  {value === 'income' ? <ArrowDownCircle size={18} /> : <ArrowUpCircle size={18} />}
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] font-bold text-slate-400 pl-1">
              Una categoría pertenece a un solo tipo y no puede cambiarse después.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className={btnSecondary}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? 'Creando...' : 'Crear Categoría'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
