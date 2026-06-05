import { cn } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';
import type { ProjectionAlert } from '../services';

interface Props {
  type:       'income' | 'expense';
  rows:       ProjectionAlert[];
  onRowClick: (id: string) => void;
}

export function ProjectionTable({ type, rows, onRowClick }: Props) {
  const { formatCurrency, formatCompact } = useSettings();

  const isIncome  = type === 'income';
  const filtered  = rows.filter(r => isIncome ? r.color === 'brand-success' : r.color === 'brand-danger');
  const total     = filtered.reduce((s, r) => s + r.amount, 0);
  const sign      = isIncome ? '+' : '-';
  const colorText = isIncome ? 'text-brand-success' : 'text-brand-danger';
  const colorBg   = isIncome ? 'bg-brand-success/10' : 'bg-brand-danger/10';
  const dot       = isIncome ? 'bg-brand-success' : 'bg-brand-danger';
  const label     = isIncome ? 'Ingresos' : 'Egresos';

  return (
    <div className="bg-white rounded-3xl border border-slate-100 card-shadow overflow-hidden">
      {/* Header */}
      <div className={cn('px-6 py-4 flex items-center justify-between border-b border-slate-100', colorBg)}>
        <div className="flex items-center gap-2">
          <span className={cn('w-2.5 h-2.5 rounded-full', dot)} />
          <span className="text-sm font-black text-slate-700 uppercase tracking-widest">{label}</span>
        </div>
        <span className={cn('text-sm font-black', colorText)} title={formatCurrency(total)}>
          {sign}{formatCompact(total)}
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-6 py-8 text-sm text-center text-slate-400 font-semibold">
            Sin {label.toLowerCase()} en este período
          </p>
        ) : filtered.map(row => (
          <div
            key={row.id}
            onClick={() => onRowClick(row.id)}
            className="flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{row.title}</p>
              <p className="text-xs text-slate-400 truncate">{row.dueDate}</p>
            </div>
            <span className={cn('text-sm font-extrabold shrink-0', colorText)}
              title={formatCurrency(row.amount)}>
              {sign}{formatCompact(row.amount)}
            </span>
          </div>
        ))}
      </div>

      {/* Total row */}
      {filtered.length > 0 && (
        <div className="px-6 py-4 border-t-2 border-slate-100 flex items-center justify-between bg-slate-50/60">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total</span>
          <span className={cn('text-base font-black', colorText)} title={formatCurrency(total)}>
            {sign}{formatCurrency(total)}
          </span>
        </div>
      )}
    </div>
  );
}
