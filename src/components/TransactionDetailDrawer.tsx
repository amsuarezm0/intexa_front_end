import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowUpRight, ArrowDownLeft, Calendar, Tag, Hash, Database, Trash2, Pencil, Check } from 'lucide-react';
import { type Transaction, transactionsService, categoriesService, type Category } from '../services';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';

const CATEGORY_COLORS: Record<string, string> = {
  'Tecnología':    'bg-blue-100 text-blue-700',
  'Ventas':        'bg-emerald-100 text-emerald-700',
  'Personal':      'bg-violet-100 text-violet-700',
  'Finanzas':      'bg-amber-100 text-amber-700',
  'Marketing':     'bg-pink-100 text-pink-700',
  'Operaciones':   'bg-orange-100 text-orange-700',
  'Legal':         'bg-red-100 text-red-700',
  'Administración':'bg-teal-100 text-teal-700',
};

const FALLBACK_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-cyan-100 text-cyan-700',
];

function getCategoryColor(category: string): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  const hash = category.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

interface Props {
  transaction: Transaction | null;
  isLoading?: boolean;
  onClose: () => void;
  onDeleted?: (id: string) => void;
  onUpdated?: (tx: Transaction) => void;
}

export function TransactionDetailDrawer({ transaction, isLoading, onClose, onDeleted, onUpdated }: Props) {
  const { formatCurrency } = useSettings();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Edit form state
  const [editType, setEditType]           = useState<'Ingreso' | 'Egreso'>('Ingreso');
  const [editDate, setEditDate]           = useState('');
  const [editAmount, setEditAmount]       = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory]   = useState('');
  const [editStatus, setEditStatus]       = useState<'Completado' | 'Pendiente' | 'Cancelado'>('Pendiente');

  const open = !!(transaction || isLoading);
  const canEdit = transaction && transaction.source !== 'Siigo';

  useEffect(() => {
    if (editing) {
      categoriesService.list().then(setCategories).catch(() => {});
    }
  }, [editing]);

  useEffect(() => {
    // Reset edit mode when a different transaction opens
    setEditing(false);
    setShowConfirm(false);
  }, [transaction?.id]);

  function enterEdit() {
    if (!transaction) return;
    setEditType(transaction.type as 'Ingreso' | 'Egreso');
    setEditDate(transaction.date);
    setEditAmount(String(transaction.amount));
    setEditDescription(transaction.description);
    setEditCategory(transaction.category);
    setEditStatus(transaction.status as 'Completado' | 'Pendiente' | 'Cancelado');
    setEditing(true);
  }

  async function handleSave() {
    if (!transaction) return;
    setSaving(true);
    try {
      const updated = await transactionsService.update(transaction.id, {
        type: editType,
        date: editDate,
        amount: parseFloat(editAmount.replace(/,/g, '.')),
        description: editDescription,
        category: editCategory,
        status: editStatus,
        source: transaction.source,
        isProjection: transaction.isProjection,
      });
      onUpdated?.(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!transaction) return;
    setDeleting(true);
    try {
      await transactionsService.delete(transaction.id);
      setShowConfirm(false);
      onDeleted?.(transaction.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  const inputCls = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:border-brand-primary transition-all text-sm";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-white shadow-2xl flex flex-col"
          >
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : transaction && (
              <>
                {/* Header */}
                <div className={cn(
                  "p-6 flex items-start justify-between shrink-0",
                  editing ? "bg-slate-50" : transaction.type === 'Ingreso' ? "bg-brand-success/5" : "bg-brand-danger/5"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-2xl",
                      editing ? "bg-brand-primary/10 text-brand-primary"
                        : transaction.type === 'Ingreso' ? "bg-brand-success/15 text-brand-success" : "bg-brand-danger/15 text-brand-danger"
                    )}>
                      {editing ? <Pencil size={24} /> : transaction.type === 'Ingreso' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                    </div>
                    <div>
                      <p className={cn("text-[10px] font-black uppercase tracking-widest",
                        editing ? "text-brand-primary"
                          : transaction.type === 'Ingreso' ? "text-brand-success" : "text-brand-danger"
                      )}>
                        {editing ? 'Editando' : transaction.type}
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        {editing ? transaction.description : formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => editing ? setEditing(false) : onClose()}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {editing ? (
                    <>
                      {/* Type */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</p>
                        <div className="flex gap-2">
                          {(['Ingreso', 'Egreso'] as const).map(t => (
                            <button
                              key={t}
                              onClick={() => setEditType(t)}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-bold text-sm transition-all",
                                editType === t
                                  ? t === 'Ingreso' ? "border-brand-success bg-brand-success/5 text-brand-success" : "border-brand-danger bg-brand-danger/5 text-brand-danger"
                                  : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                              )}
                            >
                              {t === 'Ingreso' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Date & Amount */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</p>
                          <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className={inputCls} />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto</p>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                            <input
                              type="text"
                              value={editAmount}
                              onChange={e => setEditAmount(e.target.value)}
                              className={cn(inputCls, "pl-8 text-right")}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</p>
                        <textarea
                          value={editDescription}
                          onChange={e => setEditDescription(e.target.value)}
                          rows={3}
                          className={cn(inputCls, "resize-none")}
                        />
                      </div>

                      {/* Category */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</p>
                        <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className={inputCls}>
                          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          {/* Keep current value if not in list */}
                          {editCategory && !categories.find(c => c.name === editCategory) && (
                            <option value={editCategory}>{editCategory}</option>
                          )}
                        </select>
                      </div>

                      {/* Status */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</p>
                        <div className="flex gap-2">
                          {(['Completado', 'Pendiente', 'Cancelado'] as const).map(s => (
                            <button
                              key={s}
                              onClick={() => setEditStatus(s)}
                              className={cn(
                                "flex-1 py-2 rounded-xl border text-xs font-bold transition-all",
                                editStatus === s
                                  ? s === 'Completado' ? "border-brand-success bg-brand-success/10 text-brand-success"
                                    : s === 'Pendiente' ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                                    : "border-brand-danger bg-brand-danger/10 text-brand-danger"
                                  : "border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300"
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Descripción</p>
                        <p className="text-base font-semibold text-slate-900">{transaction.description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar size={14} className="text-slate-400" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</p>
                          </div>
                          <p className="text-sm font-bold text-slate-900">{transaction.date}</p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <div className="flex items-center gap-2 mb-1">
                            <Tag size={14} className="text-slate-400" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categoría</p>
                          </div>
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg", getCategoryColor(transaction.category))}>
                            {transaction.category}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <div className="flex items-center gap-2 mb-1">
                            <Database size={14} className="text-slate-400" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fuente</p>
                          </div>
                          <p className="text-sm font-bold text-slate-900">{transaction.source}</p>
                        </div>

                        {transaction.reference && (
                          <div className="bg-slate-50 p-4 rounded-2xl">
                            <div className="flex items-center gap-2 mb-1">
                              <Hash size={14} className="text-slate-400" />
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Referencia</p>
                            </div>
                            <p className="text-sm font-bold text-slate-900">{transaction.reference}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Estado</p>
                        <span className={cn(
                          "text-xs font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border",
                          transaction.status === 'Completado' ? "bg-brand-success/10 text-brand-success border-brand-success/20" :
                          transaction.status === 'Pendiente'  ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" :
                          "bg-brand-danger/10 text-brand-danger border-brand-danger/20"
                        )}>{transaction.status}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer actions */}
                {canEdit && (
                  <div className={cn("p-6 border-t border-slate-100 space-y-3 shrink-0", editing && "bg-slate-50/60")}>
                    {editing ? (
                      <div className="flex gap-3">
                        <button
                          onClick={() => setEditing(false)}
                          className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-primary text-white text-sm font-bold hover:bg-brand-accent transition-colors disabled:opacity-60"
                        >
                          <Check size={16} />
                          {saving ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          onClick={enterEdit}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-brand-primary/30 text-brand-primary font-bold text-sm hover:bg-brand-primary/5 transition-colors"
                        >
                          <Pencil size={15} />
                          Editar
                        </button>
                        <button
                          onClick={() => setShowConfirm(true)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-brand-danger/30 text-brand-danger font-bold text-sm hover:bg-brand-danger/5 transition-colors"
                        >
                          <Trash2 size={15} />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>

          {/* Delete confirmation modal */}
          <AnimatePresence>
            {showConfirm && transaction && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-60 flex items-center justify-center p-4"
                onClick={() => setShowConfirm(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm space-y-4"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="w-12 h-12 rounded-2xl bg-brand-danger/10 flex items-center justify-center">
                    <Trash2 size={22} className="text-brand-danger" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">¿Eliminar {transaction.isProjection ? 'proyección' : 'movimiento'}?</p>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{transaction.description}</p>
                  </div>
                  <p className="text-xs text-slate-400">Esta acción no se puede deshacer.</p>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-brand-danger text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-60"
                    >
                      {deleting ? 'Eliminando…' : 'Eliminar'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
