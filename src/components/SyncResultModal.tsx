import { AlertTriangle, CheckCircle2, Lightbulb, X } from 'lucide-react';
import type { SiigoSyncResult } from '../services/siigo';
import { cn } from '../lib/utils';

interface SyncResultModalProps {
  result: SiigoSyncResult;
  onClose: () => void;
}

export function SyncResultModal({ result, onClose }: SyncResultModalProps) {
  const hasErrors = (result.errors?.length ?? 0) > 0;
  const totalNew = result.invoicesImported + result.purchasesImported + result.vouchersImported + result.paymentReceiptsImported;

  const counts = [
    { label: 'Facturas de Venta', abbr: 'FV', value: result.invoicesImported },
    { label: 'Facturas de Compra', abbr: 'FC', value: result.purchasesImported },
    { label: 'Recibos de Cobro', abbr: 'RC', value: result.vouchersImported },
    { label: 'Recibos de Pago', abbr: 'RP', value: result.paymentReceiptsImported },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className={cn('px-6 py-5 flex items-start justify-between gap-4', hasErrors ? 'bg-brand-warning/10' : 'bg-brand-success/10')}>
          <div className="flex items-center gap-3">
            {hasErrors
              ? <AlertTriangle size={22} className="text-brand-warning shrink-0 mt-0.5" />
              : <CheckCircle2 size={22} className="text-brand-success shrink-0 mt-0.5" />}
            <div>
              <h2 className="font-black text-slate-900 text-base leading-tight">
                {hasErrors ? 'Sincronización parcial' : 'Sincronización completada'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{result.dateStart} → {result.dateEnd}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-black/5 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Import counts */}
        <div className="px-6 pt-5 pb-3 grid grid-cols-2 gap-3">
          {counts.map(c => (
            <div key={c.abbr} className="bg-slate-50 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{c.label}</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{c.value}</p>
              <p className="text-[10px] text-slate-400 font-semibold">{c.abbr} · nuevos</p>
            </div>
          ))}
        </div>

        <div className="px-6 pb-4">
          <p className="text-xs text-slate-400">
            {totalNew} registros nuevos importados · {result.updated} actualizados
          </p>
        </div>

        {/* Incremental sync tip — only when records were imported */}
        {totalNew > 0 && result.mode !== 'incremental' && (
          <div className="mx-6 mb-5 flex gap-3 bg-brand-primary/5 border border-brand-primary/15 rounded-2xl px-4 py-3">
            <Lightbulb size={16} className="text-brand-primary shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-black text-brand-primary">Recomendación: </span>
              usa la sincronización <span className="font-bold">incremental</span> para el día a día — importa solo los registros nuevos desde la última sincronización y es significativamente más rápida.
            </p>
          </div>
        )}

        {/* Errors */}
        {hasErrors && (
          <div className="px-6 pb-5">
            <p className="text-xs font-black text-brand-warning uppercase tracking-wider mb-2">Páginas con errores</p>
            <ul className="space-y-1.5 max-h-40 overflow-y-auto">
              {result.errors!.map((e, i) => (
                <li key={i} className="text-xs text-slate-600 bg-brand-warning/5 border border-brand-warning/20 rounded-xl px-3 py-2 leading-snug">
                  {e}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Los registros de las páginas con error no fueron importados. Puede volver a sincronizar cuando Siigo esté disponible.
            </p>
          </div>
        )}

        {/* Action */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className={cn(
              'w-full py-3 rounded-2xl font-black text-sm text-white transition-colors',
              hasErrors ? 'bg-brand-warning hover:bg-brand-accent' : 'bg-brand-success hover:opacity-90'
            )}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
