import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type ToastType = 'error' | 'success' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  error:   (message: string) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((message: string, type: ToastType) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    error:   (msg) => add(msg, 'error'),
    success: (msg) => add(msg, 'success'),
    warning: (msg) => add(msg, 'warning'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ── Toaster UI ────────────────────────────────────────────────────────────────

const styles: Record<ToastType, { bar: string; icon: string; label: string }> = {
  error:   { bar: 'bg-brand-danger',   icon: '✕', label: 'text-brand-danger' },
  success: { bar: 'bg-brand-success',  icon: '✓', label: 'text-brand-success' },
  warning: { bar: 'bg-brand-warning',  icon: '!', label: 'text-brand-warning' },
};

function Toaster({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const s = styles[t.type];
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 bg-white rounded-2xl shadow-2xl border border-slate-100 px-4 py-3 w-80 max-w-[calc(100vw-3rem)] animate-[slideInRight_0.2s_ease-out]"
          >
            <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 ${s.bar}`}>
              {s.icon}
            </span>
            <p className="flex-1 text-sm font-semibold text-slate-800 leading-snug">{t.message}</p>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-slate-300 hover:text-slate-500 transition-colors shrink-0 mt-0.5 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
