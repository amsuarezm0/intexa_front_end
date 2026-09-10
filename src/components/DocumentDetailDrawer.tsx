import { ArrowDownLeft,ArrowUpRight,Calendar,Database,Hash,Tag,User,X } from 'lucide-react';
import { AnimatePresence,motion } from 'motion/react';
import { useSettings } from '../contexts/SettingsContext';
import { documentsService } from '../services';
import { dialogProps,useModal } from '../hooks/useModal';
import { cn } from '../lib/utils';
import type { PeriodInvoice,PeriodPurchase } from '../services/cashflow';
import { CategoryBadge } from './CategoryBadge';
import { StatusBadge } from './StatusBadge';
import { SecondaryDueDateEditor } from './SecondaryDueDateEditor';
import { ThirdPartyLink } from './ThirdPartyLink';

type Doc = (PeriodInvoice & { docType: 'FV' }) | (PeriodPurchase & { docType: 'FC' });

interface Props {
  doc: Doc | null;
  onClose: () => void;
  /** Called after the agreed date changes, so the view can refresh its figures. */
  onDueDateChanged?: (doc: Doc) => void;
  canEdit?: boolean;
}

function Row({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 p-4 rounded-2xl">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-slate-400">{icon}</span>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      </div>
      {children}
    </div>
  );
}

export function DocumentDetailDrawer({ doc, onClose, onDueDateChanged, canEdit }: Props) {
  const { formatCurrency } = useSettings();
  const open = !!doc;
  const isInvoice = doc?.docType === 'FV';
  const panelRef = useModal<HTMLDivElement>({ onClose, active: open });

  return (
    <AnimatePresence>
      {open && doc && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            {...dialogProps}
            aria-label={isInvoice ? 'Detalle de factura de venta' : 'Detalle de factura de compra'}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-white shadow-2xl flex flex-col outline-none"
          >
            {/* Header */}
            <div className={cn(
              "p-6 flex items-start justify-between shrink-0",
              isInvoice ? "bg-brand-success/5" : "bg-brand-danger/5"
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-2xl",
                  isInvoice ? "bg-brand-success/15 text-brand-success" : "bg-brand-danger/15 text-brand-danger"
                )}>
                  {isInvoice ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                </div>
                <div>
                  <p className={cn("text-[10px] font-black uppercase tracking-widest",
                    isInvoice ? "text-brand-success" : "text-brand-danger"
                  )}>
                    {isInvoice ? 'Factura de Venta' : 'Factura de Compra'}
                  </p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(doc.balance)}</p>
                  {doc.balance !== doc.total && (
                    <div className="mt-0.5 space-y-0.5">
                      <p className="text-xs text-slate-400 font-semibold">Total: {formatCurrency(doc.total)}</p>
                      <p className="text-xs text-brand-success font-semibold">Pagado: {formatCurrency(doc.total - doc.balance)}</p>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Descripción</p>
                <p className="text-base font-semibold text-slate-900">{doc.detail || doc.reference}</p>
                {doc.detail && (
                  <p className="text-sm text-slate-500 mt-1 leading-snug">{doc.reference}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Row label="Fecha" icon={<Calendar size={14} />}>
                  <p className="text-sm font-bold text-slate-900">{doc.date}</p>
                </Row>

                {doc.dueDate && (
                  <Row label="Vencimiento" icon={<Calendar size={14} />}>
                    <p className="text-sm font-bold text-slate-900">{doc.dueDate}</p>
                    {doc.secondaryDueDate && (
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">original</p>
                    )}
                  </Row>
                )}

                {/* The one field on a Siigo document that is ours to set. */}
                <div className="col-span-2">
                  <SecondaryDueDateEditor
                    originalDueDate={doc.dueDate || doc.date}
                    secondaryDueDate={doc.secondaryDueDate}
                    dueDateShiftDays={doc.dueDateShiftDays}
                    canEdit={canEdit}
                    onSave={async next => {
                      const saved = doc.docType === 'FV'
                        ? await documentsService.setInvoiceSecondaryDueDate(doc.id, next)
                        : await documentsService.setPurchaseSecondaryDueDate(doc.id, next);
                      onDueDateChanged?.({ ...(saved as any), docType: doc.docType });
                    }}
                  />
                </div>

                <Row label={isInvoice ? 'Cliente' : 'Proveedor'} icon={<User size={14} />}>
                  {doc.thirdParty ? (
                    <div className="text-sm font-bold text-slate-900">
                      <ThirdPartyLink thirdParty={doc.thirdParty} />
                      {doc.thirdParty.identification && doc.thirdParty.name && (
                        <p className="text-[11px] font-mono font-semibold text-slate-400 mt-0.5">
                          {doc.thirdParty.identification}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-slate-900 line-clamp-2">
                      {isInvoice
                        ? (doc as PeriodInvoice).customerName || '—'
                        : (doc as PeriodPurchase).providerName || '—'}
                    </p>
                  )}
                </Row>

                <Row label="Categoría" icon={<Tag size={14} />}>
                  <CategoryBadge category={doc.category} className="px-2 py-0.5" />
                </Row>

                <Row label="Fuente" icon={<Database size={14} />}>
                  <p className="text-sm font-bold text-slate-900">{doc.source}</p>
                </Row>

                <Row label="Documento" icon={<Hash size={14} />}>
                  <p className="text-sm font-bold text-slate-900">{doc.reference}</p>
                </Row>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Estado</p>
                <StatusBadge status={doc.status} className="text-xs px-3 rounded-xl" />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
