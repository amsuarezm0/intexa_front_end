import { cn } from '../lib/utils';

interface Props {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: Props) {
  return (
    <span className={cn(
      'font-black uppercase tracking-widest border rounded-lg text-[10px] px-2.5 py-1.5',
      status === 'Completado' ? 'bg-brand-success/10 text-brand-success border-brand-success/20' :
      status === 'Pendiente'  ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' :
      'bg-brand-danger/10 text-brand-danger border-brand-danger/20',
      className,
    )}>
      {status}
    </span>
  );
}
