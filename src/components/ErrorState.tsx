import { AlertTriangle,RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface Props {
  message: string;
  /** Omit to render a dead-end message (nothing to retry). */
  onRetry?: () => void | Promise<void>;
  className?: string;
}

/**
 * Failure state for a view or panel. Always offer `onRetry` when the data can
 * be re-fetched — otherwise a transient 500 forces the user to reload the page.
 */
export function ErrorState({ message, onRetry, className }: Props) {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center text-center gap-4 py-16 px-6', className)}
    >
      <div className="w-14 h-14 rounded-3xl bg-brand-danger/10 flex items-center justify-center">
        <AlertTriangle size={26} className="text-brand-danger" />
      </div>
      <div className="space-y-1 max-w-sm">
        <p className="font-black text-slate-900 tracking-tight">No se pudo cargar la información</p>
        <p className="text-sm font-semibold text-slate-400">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-bold hover:bg-brand-accent transition-colors disabled:opacity-60"
        >
          <RefreshCw size={16} className={cn(retrying && 'animate-spin')} />
          {retrying ? 'Reintentando…' : 'Reintentar'}
        </button>
      )}
    </div>
  );
}
