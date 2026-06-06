import { X } from 'lucide-react';
import { motion } from 'motion/react';
import type { ActivityLog } from '../services';

interface Props {
  log: ActivityLog;
  locale: string;
  onClose: () => void;
}

export function LogDetailModal({ log, locale, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-[40px] p-8 sm:p-12 w-full max-w-sm shadow-2xl space-y-8"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Detalle del Log</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-brand-primary/10 text-brand-primary rounded-[20px] flex items-center justify-center text-xl font-black">
            {log.initial}
          </div>
          <div>
            <p className="text-base font-black text-slate-900">{log.userName}</p>
            <span className="text-sm font-bold text-slate-700 mt-1 inline-block">{log.action}</span>
          </div>
        </div>

        <div className="space-y-4">
          {([
            ['Módulo', log.module],
            ['Fecha y hora', new Date(log.timestamp).toLocaleString(locale, { dateStyle: 'long', timeStyle: 'medium' })],
            ['ID de registro', log.id],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 bg-slate-50 px-5 py-4 rounded-2xl">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
              <span className="text-sm font-bold text-slate-700 break-all">{value}</span>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="w-full py-4 rounded-2xl font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
          Cerrar
        </button>
      </motion.div>
    </div>
  );
}
