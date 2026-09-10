import { CalendarClock } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  /** Days between the original due date and the agreed one; + is pushed out. */
  days?: number;
  originalDueDate?: string;
  className?: string;
}

/**
 * The annotation that keeps a renegotiated date honest.
 *
 * Once an agreed date is set it governs the money everywhere, so without this
 * the slippage would simply disappear — a document pushed out four months would
 * look no different from one that was always due then. Renders nothing when
 * there is no agreement, and stays neutral when the date moved by zero days.
 */
export function DueDateShift({ days, originalDueDate, className }: Props) {
  if (days === undefined || days === null) return null;

  const label = days === 0
    ? 'Misma fecha'
    : days > 0
      ? `+${days} ${days === 1 ? 'día' : 'días'}`
      : `${days} ${days === -1 ? 'día' : 'días'}`;

  const title = originalDueDate
    ? days > 0
      ? `Aplazado ${days} día(s) desde el vencimiento original (${originalDueDate})`
      : days < 0
        ? `Adelantado ${-days} día(s) frente al vencimiento original (${originalDueDate})`
        : `Igual al vencimiento original (${originalDueDate})`
    : undefined;

  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider',
        days > 0 ? 'bg-brand-warning/10 text-brand-warning'
          : days < 0 ? 'bg-brand-success/10 text-brand-success'
          : 'bg-slate-100 text-slate-500',
        className,
      )}
    >
      <CalendarClock size={11} />
      {label}
    </span>
  );
}
