import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  title: string;
  /** One line explaining why it is empty, or what to do about it. */
  hint?: string;
  icon?: LucideIcon;
  action?: { label: string; onClick: () => void };
  className?: string;
}

/** Empty table/list placeholder: says what is missing and offers the next step. */
export function EmptyState({ title, hint, icon: Icon = Inbox, action, className }: Props) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center gap-3 py-14 px-6', className)}>
      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
        <Icon size={22} className="text-slate-300" />
      </div>
      <div className="space-y-1 max-w-xs">
        <p className="text-sm font-black text-slate-600 tracking-tight">{title}</p>
        {hint && <p className="text-xs font-semibold text-slate-400 leading-relaxed">{hint}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 px-4 py-2 rounded-xl bg-brand-dark text-white text-xs font-bold hover:bg-brand-accent transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
