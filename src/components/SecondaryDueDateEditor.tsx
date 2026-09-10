import { Check, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { cn } from '../lib/utils';
import { DueDateShift } from './DueDateShift';

interface Props {
  originalDueDate?: string;
  secondaryDueDate?: string;
  dueDateShiftDays?: number;
  /** Empty string clears the agreement. */
  onSave: (secondaryDueDate: string) => Promise<void>;
  canEdit?: boolean;
}

/**
 * Editor for the agreed payment date.
 *
 * On a Siigo document this is the only thing a user may change — everything
 * else is overwritten by the next sync — so the control is deliberately narrow:
 * one date, save, or clear it to fall back to what the document says.
 */
export function SecondaryDueDateEditor({
  originalDueDate, secondaryDueDate, dueDateShiftDays, onSave, canEdit = true,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(secondaryDueDate ?? '');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function commit(next: string) {
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
      toast.success(next ? 'Fecha de pago acordada actualizada' : 'Fecha de pago acordada retirada');
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo guardar la fecha de pago acordada.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-slate-50 p-4 rounded-2xl">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha de pago acordada</p>
        {canEdit && !editing && (
          <button
            onClick={() => { setValue(secondaryDueDate ?? ''); setEditing(true); }}
            title="Editar la fecha en que se pagará realmente"
            className="p-1 rounded-lg text-slate-400 hover:text-brand-primary hover:bg-white transition-colors"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value}
            onChange={e => setValue(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-primary bg-white"
          />
          <button
            onClick={() => commit(value)}
            disabled={saving}
            title="Guardar"
            className="p-2 rounded-xl bg-brand-primary text-white hover:bg-brand-accent disabled:opacity-50 transition-colors"
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => { setEditing(false); setValue(secondaryDueDate ?? ''); }}
            disabled={saving}
            title="Cancelar"
            className="p-2 rounded-xl text-slate-400 hover:bg-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : secondaryDueDate ? (
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-slate-900">{secondaryDueDate}</p>
          <DueDateShift days={dueDateShiftDays} originalDueDate={originalDueDate} />
          {canEdit && (
            <button
              onClick={() => commit('')}
              disabled={saving}
              title="Quitar la fecha acordada y volver al vencimiento original"
              className="text-[10px] font-bold text-slate-400 hover:text-brand-danger transition-colors"
            >
              Quitar
            </button>
          )}
        </div>
      ) : (
        <p className={cn('text-sm font-semibold text-slate-300')}>
          Sin acordar · vence {originalDueDate || '—'}
        </p>
      )}
    </div>
  );
}
