import { Eye } from 'lucide-react';
import { cn } from '../lib/utils';
import type { ActivityLog } from '../services';

interface Props {
  log: ActivityLog;
  locale: string;
  onSelect: (log: ActivityLog) => void;
}

export function LogRow({ log, locale, onSelect }: Props) {
  return (
    <tr className="hover:bg-slate-50 transition-colors group">
      <td className="px-4 sm:px-10 py-4 sm:py-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xs font-black text-slate-600 group-hover:bg-brand-primary group-hover:text-white transition-colors">
            {log.initial}
          </div>
          <span className="text-base font-black text-slate-900">{log.userName}</span>
        </div>
      </td>
      <td className="px-4 sm:px-10 py-4 sm:py-8">
        <span className={cn('text-[10px] font-black px-3 py-1.5 rounded-lg text-white uppercase tracking-widest', log.color)}>
          {log.action}
        </span>
      </td>
      <td className="hidden sm:table-cell px-4 sm:px-10 py-4 sm:py-8 text-base font-bold text-slate-500">
        {log.module}
      </td>
      <td className="hidden sm:table-cell px-4 sm:px-10 py-4 sm:py-8 text-base font-bold text-slate-500">
        {new Date(log.timestamp).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}
      </td>
      <td className="px-4 sm:px-10 py-4 sm:py-8 text-right">
        <button
          onClick={() => onSelect(log)}
          className="p-3 text-slate-300 hover:text-brand-primary hover:bg-brand-primary/10 rounded-2xl transition-all"
        >
          <Eye size={20} />
        </button>
      </td>
    </tr>
  );
}
