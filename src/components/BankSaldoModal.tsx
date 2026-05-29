import { useState } from 'react';
import { motion } from 'motion/react';
import { Landmark } from 'lucide-react';

interface Props {
  onConfirm: (amount: number) => void;
  onSkip: () => void;
}

export function BankSaldoModal({ onConfirm, onSkip }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function handleConfirm() {
    const parsed = parseFloat(value.replace(/,/g, '.'));
    if (isNaN(parsed) || parsed < 0) {
      setError('Ingresa un valor numérico válido.');
      return;
    }
    onConfirm(parsed);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary">
            <Landmark size={22} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Actualizar Saldo Bancario</h2>
        </div>
        <p className="text-sm text-slate-500 mb-6 ml-[52px]">
          Ingresa el saldo bancario actual para el día de hoy.
        </p>
        <div className="space-y-2 mb-6">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Saldo actual (COP)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Ej: 15000000"
            value={value}
            onChange={e => { setValue(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            autoFocus
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 font-semibold text-lg focus:outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/10 transition-all"
          />
          {error && <p className="text-xs text-brand-danger font-medium">{error}</p>}
        </div>
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
