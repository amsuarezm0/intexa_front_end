import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ThirdPartyPicker } from './ThirdPartyPicker';
import { customersService, type ThirdParty } from '../services';
import { cn } from '../lib/utils';

export type TxTypeFilter   = '' | 'Ingreso' | 'Egreso';
export type TxStatusFilter = '' | 'Completado' | 'Parcial' | 'Pendiente' | 'Anulado';
export type TxSourceFilter = '' | 'Siigo' | 'Manual';
export type TxRecordFilter = '' | 'Movimiento' | 'Proyección';

export interface TxFilters {
  type:   TxTypeFilter;
  status: TxStatusFilter;
  source: TxSourceFilter;
  record: TxRecordFilter;
  dateFrom?: string;
  dateTo?:   string;
  /** Identification (NIT) of the third party, matched across branch offices.
   *  Only the key travels, so the filter survives in a shared URL. */
  thirdParty?: string;
}

interface Props {
  show:          boolean;
  filters:       TxFilters;
  showDateFilter?: boolean;
  // Only Siigo invoices/purchases (shown in Cash Flow) carry a "Parcial" status;
  // the Movements list holds only cash transactions, so it opts out.
  showPartialStatus?: boolean;
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
  Parcial:    'bg-brand-warning text-white border-brand-warning',
  Pendiente:  'bg-brand-primary text-white border-brand-primary',
  Anulado:    'bg-brand-danger  text-white border-brand-danger',
};

export function TransactionFilters({ show, filters, showDateFilter, showPartialStatus, onChange, onClear }: Props) {
  const statuses: TxStatusFilter[] = showPartialStatus
    ? ['Completado', 'Parcial', 'Pendiente', 'Anulado']
    : ['Completado', 'Pendiente', 'Anulado'];
  const { type, status, source, record, dateFrom = '', dateTo = '', thirdParty = '' } = filters;

  const activeCount =
    (type   ? 1 : 0) + (status ? 1 : 0) +
    (source ? 1 : 0) + (record ? 1 : 0) +
    (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) +
    (thirdParty ? 1 : 0);

  // Only the identification is in the URL, so a link opened cold knows the NIT
  // and not the name. Resolve it once so the control and the chip read as a
  // name; an identification that matches nothing still shows as itself.
  const [party, setParty] = useState<ThirdParty | null>(null);
  useEffect(() => {
    if (!thirdParty) { setParty(null); return; }
    if (party?.identification === thirdParty) return;
    let cancelled = false;
    setParty({ identification: thirdParty });
    customersService.list({ search: thirdParty, type: 'all', limit: 5 })
      .then(res => {
        const match = res.data.find(c => c.identification === thirdParty);
        if (!cancelled && match) {
          setParty({
            customerId: match.id, identification: match.identification,
            branchOffice: match.branchOffice, siigoId: match.siigoId,
            name: match.name, commercialName: match.commercialName, type: match.type,
          });
        }
      })
      .catch(() => { /* the NIT alone still filters */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thirdParty]);

  const partyLabel = party?.name || thirdParty;

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
                  {statuses.map(v => (
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
                          ? 'bg-brand-primary text-white border-brand-primary'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-brand-primary/40 hover:text-brand-primary hover:bg-brand-primary/5'
                      )}>{v}</button>
                  ))}
                </div>
              </div>

              {/* Tercero */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tercero</span>
                <ThirdPartyPicker
                  compact
                  value={party}
                  onChange={tp => onChange({ thirdParty: tp?.identification ?? '' })}
                />
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
              color={status === 'Completado' ? 'success' : status === 'Parcial' ? 'warning' : status === 'Pendiente' ? 'primary' : 'danger'}
              onRemove={() => onChange({ status: '' })}
            >{status}</Chip>
          )}
          {source && (
            <Chip color="primary" onRemove={() => onChange({ source: '' })}>{source}</Chip>
          )}
          {record && (
            <Chip color="primary" onRemove={() => onChange({ record: '' })}>
              {record}
            </Chip>
          )}
          {thirdParty && (
            <Chip color="primary" onRemove={() => onChange({ thirdParty: '' })} title={partyLabel}>
              {partyLabel}
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

type ChipColor = 'success' | 'warning' | 'primary' | 'danger' | 'slate';

const chipClass: Record<ChipColor, string> = {
  success: 'bg-brand-success/10 text-brand-success',
  warning: 'bg-brand-warning/10 text-brand-warning',
  primary: 'bg-brand-primary/10 text-brand-primary',
  danger:  'bg-brand-danger/10  text-brand-danger',
  slate:   'bg-slate-100 text-slate-500',
};

function Chip({ color, onRemove, title, children }: { color: ChipColor; onRemove: () => void; title?: string; children: React.ReactNode }) {
  return (
    <span title={title} className={cn('flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest max-w-[240px]', chipClass[color])}>
      <span className="truncate">{children}</span>
      <button onClick={onRemove} className="shrink-0"><X size={10} /></button>
    </span>
  );
}
