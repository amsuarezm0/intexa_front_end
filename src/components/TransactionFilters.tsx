import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../lib/utils';

export type TxTypeFilter   = '' | 'Ingreso' | 'Egreso';
export type TxStatusFilter = '' | 'Completado' | 'Pendiente' | 'Anulado';
export type TxSourceFilter = '' | 'Siigo' | 'Manual';
export type TxRecordFilter = '' | 'Movimiento' | 'Proyección';

export interface TxFilters {
  type:   TxTypeFilter;
  status: TxStatusFilter;
  source: TxSourceFilter;
  record: TxRecordFilter;
  dateFrom?: string;
  dateTo?:   string;
}

interface Props {
  show:          boolean;
  filters:       TxFilters;
  showDateFilter?: boolean;
  onChange:      (next: Partial<TxFilters>) => void;
  onClear:       () => void;
}

const btn = (active: boolean, color?: string) =>
  cn('px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
    active
      ? color ?? 'bg-brand-primary text-white border-brand-primary'
      : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300');

const statusColor: Record<string, string> = {
  Completado: 'bg-brand-success text-white border-brand-success',
  Pendiente:  'bg-brand-primary text-white border-brand-primary',
  Anulado:    'bg-brand-danger  text-white border-brand-danger',
};

export function TransactionFilters({ show, filters, showDateFilter, onChange, onClear }: Props) {
  const { type, status, source, record, dateFrom = '', dateTo = '' } = filters;

  const activeCount =
    (type   ? 1 : 0) + (status ? 1 : 0) +
    (source ? 1 : 0) + (record ? 1 : 0) +
    (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const toggle = <K extends keyof TxFilters>(key: K, val: TxFilters[K]) =>
    onChange({ [key]: filters[key] === val ? '' : val });

  return (
    <>
      {/* Animated panel */}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-slate-100"
          >
            <div className="px-8 py-6 flex flex-wrap items-center gap-6">

              {/* Tipo */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</span>
                <div className="flex gap-2">
                  {(['Ingreso', 'Egreso'] as TxTypeFilter[]).map(v => (
                    <button key={v} onClick={() => toggle('type', v)}
                      className={btn(type === v,
                        v === 'Ingreso' ? 'bg-brand-success text-white border-brand-success'
                                        : 'bg-brand-danger text-white border-brand-danger'
                      )}>{v}</button>
                  ))}
                </div>
              </div>

              {/* Estado */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
                <div className="flex gap-2">
                  {(['Completado', 'Pendiente', 'Anulado'] as TxStatusFilter[]).map(v => (
                    <button key={v} onClick={() => toggle('status', v)}
                      className={btn(status === v, statusColor[v])}>{v}</button>
                  ))}
                </div>
              </div>

              {/* Origen */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Origen</span>
                <div className="flex gap-2">
                  {(['Siigo', 'Manual'] as TxSourceFilter[]).map(v => (
                    <button key={v} onClick={() => toggle('source', v)}
                      className={btn(source === v)}>{v}</button>
                  ))}
                </div>
              </div>

              {/* Registro */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registro</span>
                <div className="flex gap-2">
                  {(['Movimiento', 'Proyección'] as TxRecordFilter[]).map(v => (
                    <button key={v} onClick={() => toggle('record', v)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                        record === v
                          ? v === 'Proyección' ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-brand-primary text-white border-brand-primary'
                          : v === 'Proyección'
                            ? 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                      )}>{v}</button>
                  ))}
                </div>
              </div>

              {/* Fecha (optional) */}
              {showDateFilter && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</span>
                  <div className="flex items-center gap-2">
                    <input type="date" value={dateFrom} max={dateTo || undefined}
                      onChange={e => onChange({ dateFrom: e.target.value })}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-slate-50 focus:border-brand-primary focus:outline-none transition-all"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">→</span>
                    <input type="date" value={dateTo} min={dateFrom || undefined}
                      onChange={e => onChange({ dateTo: e.target.value })}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-slate-50 focus:border-brand-primary focus:outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {activeCount > 0 && (
                <button onClick={onClear}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-brand-danger transition-colors ml-auto">
                  <X size={14} />Limpiar filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active chips (shown when panel is closed) */}
      {!show && activeCount > 0 && (
        <div className="px-8 py-3 border-b border-slate-100 flex items-center gap-2 flex-wrap">
          {type && (
            <Chip color={type === 'Ingreso' ? 'success' : 'danger'} onRemove={() => onChange({ type: '' })}>
              {type}
            </Chip>
          )}
          {status && (
            <Chip
              color={status === 'Completado' ? 'success' : status === 'Pendiente' ? 'primary' : 'danger'}
              onRemove={() => onChange({ status: '' })}
            >{status}</Chip>
          )}
          {source && (
            <Chip color="primary" onRemove={() => onChange({ source: '' })}>{source}</Chip>
          )}
          {record && (
            <Chip color={record === 'Proyección' ? 'blue' : 'primary'} onRemove={() => onChange({ record: '' })}>
              {record}
            </Chip>
          )}
          {(dateFrom || dateTo) && (
            <Chip color="slate" onRemove={() => onChange({ dateFrom: '', dateTo: '' })}>
              {dateFrom || '…'} → {dateTo || '…'}
            </Chip>
          )}
        </div>
      )}
    </>
  );
}

type ChipColor = 'success' | 'warning' | 'primary' | 'danger' | 'blue' | 'slate';

const chipClass: Record<ChipColor, string> = {
  success: 'bg-brand-success/10 text-brand-success',
  warning: 'bg-brand-warning/10 text-brand-warning',
  primary: 'bg-brand-primary/10 text-brand-primary',
  danger:  'bg-brand-danger/10  text-brand-danger',
  blue:    'bg-blue-100 text-blue-500',
  slate:   'bg-slate-100 text-slate-500',
};

function Chip({ color, onRemove, children }: { color: ChipColor; onRemove: () => void; children: React.ReactNode }) {
  return (
    <span className={cn('flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest', chipClass[color])}>
      {children}
      <button onClick={onRemove}><X size={10} /></button>
    </span>
  );
}
