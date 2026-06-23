import { Landmark, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import type { BankAccount } from '../services';

interface Props {
  /** Existing accounts to edit; empty for the first-of-day prompt. */
  initialAccounts?: BankAccount[];
  onConfirm: (accounts: BankAccount[]) => void;
  onSkip: () => void;
}

interface Row {
  label: string;
  amount: string;
}

function toRows(accounts?: BankAccount[]): Row[] {
  if (accounts && accounts.length > 0) {
    return accounts.map(a => ({ label: a.label, amount: String(a.amount) }));
  }
  return [{ label: '', amount: '' }];
}

export function BankSaldoModal({ initialAccounts, onConfirm, onSkip }: Props) {
  const [rows, setRows] = useState<Row[]>(() => toRows(initialAccounts));
  const [error, setError] = useState('');

  const total = rows.reduce((sum, r) => {
    const n = parseFloat(r.amount.replace(/,/g, '.'));
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  function setRow(i: number, patch: Partial<Row>) {
    setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    setError('');
  }

  function addRow() {
    setRows(rs => [...rs, { label: '', amount: '' }]);
  }

  function removeRow(i: number) {
    setRows(rs => (rs.length === 1 ? rs : rs.filter((_, idx) => idx !== i)));
  }

  function handleConfirm() {
    const accounts: BankAccount[] = [];
    for (const r of rows) {
      const label = r.label.trim();
      const amount = parseFloat(r.amount.replace(/,/g, '.'));
      // Skip fully-empty rows so a stray blank line doesn't block saving.
      if (!label && !r.amount.trim()) continue;
      if (!label) {
        setError('Cada banco necesita un nombre.');
        return;
      }
      if (isNaN(amount) || amount < 0) {
        setError(`Ingresa un valor numérico válido para "${label}".`);
        return;
      }
      accounts.push({ label, amount });
    }
    if (accounts.length === 0) {
      setError('Agrega al menos un banco con su saldo.');
      return;
    }
    onConfirm(accounts);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg max-h-[90dvh] overflow-y-auto"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary">
            <Landmark size={22} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Actualizar Saldo Bancario</h2>
        </div>
        <p className="text-sm text-slate-500 mb-6 ml-[52px]">
          Especifica el saldo actual de cada banco.
        </p>

        <div className="space-y-3 mb-4">
          <div className="flex gap-2 px-1">
            <label className="flex-1 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Banco</label>
            <label className="w-36 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Saldo (COP)</label>
            <span className="w-9" />
          </div>
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Ej: Bancolombia"
                value={row.label}
                onChange={e => setRow(i, { label: e.target.value })}
                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/10 transition-all"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="15000000"
                value={row.amount}
                onChange={e => setRow(i, { amount: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                className="w-36 px-3 py-2.5 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/10 transition-all"
              />
              <button
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
                title="Eliminar banco"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 hover:text-brand-danger hover:bg-brand-danger/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addRow}
          className="flex items-center gap-2 text-sm font-bold text-brand-primary hover:text-brand-accent transition-colors mb-5"
        >
          <Plus size={16} /><span>Agregar banco</span>
        </button>

        <div className="flex items-center justify-between px-1 mb-6 pt-4 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total</span>
          <span className="text-lg font-bold text-slate-900">
            {total.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
          </span>
        </div>

        {error && <p className="text-xs text-brand-danger font-medium mb-4">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Omitir
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-xl bg-brand-dark text-white font-bold text-sm hover:bg-brand-accent transition-all shadow-lg shadow-brand-dark/20"
          >
            Actualizar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
