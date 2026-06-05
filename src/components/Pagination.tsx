import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  page:      number;
  totalPages: number;
  total:     number;
  pageSize:  number;
  onPage:    (p: number) => void;
  label?:    string;
}

export function Pagination({ page, totalPages, total, pageSize, onPage, label = 'movimientos' }: Props) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  const range = Math.min(totalPages, 5);
  const start = Math.max(1, Math.min(page - Math.floor(range / 2), totalPages - range + 1));
  const pages = Array.from({ length: range }, (_, i) => start + i);

  return (
    <div className="p-4 sm:p-8 border-t border-slate-100 flex items-center justify-between">
      <span className="text-sm font-semibold text-slate-400">
        {total === 0
          ? `0 ${label}`
          : `Mostrando ${from}–${to} de ${total} ${label}`}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 text-slate-400 hover:text-brand-primary disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          {pages.map(p => (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={cn(
                'w-8 h-8 rounded-lg text-xs font-bold transition-colors',
                p === page ? 'bg-brand-dark text-white' : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => onPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 text-slate-400 hover:text-brand-primary disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
