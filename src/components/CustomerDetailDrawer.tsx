import {
AtSign,
Building2,
FileText,
Hash,
MapPin,
Phone,
User,
Users,
X,
} from 'lucide-react';
import { AnimatePresence,motion } from 'motion/react';
import { useSettings } from '../contexts/SettingsContext';
import { dialogProps,useModal } from '../hooks/useModal';
import { cn } from '../lib/utils';
import type { CustomerDetail } from '../services';
import { Skeleton } from './Skeleton';
import { StatusBadge } from './StatusBadge';

interface Props {
  detail: CustomerDetail | null;
  isLoading?: boolean;
  onClose: () => void;
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
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

export function CustomerDetailDrawer({ detail, isLoading, onClose }: Props) {
  const { formatCurrency } = useSettings();
  const open = !!detail || !!isLoading;
  const panelRef = useModal<HTMLDivElement>({ onClose, active: open });

  const customer = detail?.customer;
  const invoices = detail?.invoices ?? [];
  const isCompany = customer?.personType === 'Company';

  // The full NIT as Siigo writes it, verification digit included.
  const fullId = customer
    ? customer.checkDigit ? `${customer.identification}-${customer.checkDigit}` : customer.identification
    : '';

  const location = [customer?.city, customer?.state, customer?.country].filter(Boolean).join(', ');

  return (
    <AnimatePresence>
      {open && (
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
            aria-label="Detalle del cliente"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-white shadow-2xl flex flex-col outline-none"
          >
            {isLoading && !customer ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
              </div>
            ) : customer && (
              <>
                {/* Header */}
                <div className="p-6 flex items-start justify-between shrink-0 bg-brand-primary/5">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-3 rounded-2xl bg-brand-primary/15 text-brand-primary shrink-0">
                      {isCompany ? <Building2 size={24} /> : <User size={24} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary">
                        {customer.type}
                        {!customer.active && ' · inactivo'}
                      </p>
                      <p className={cn(
                        'text-lg font-bold leading-tight break-words',
                        customer.name ? 'text-slate-900' : 'text-slate-400 italic',
                      )}>
                        {customer.name || 'Sin nombre en Siigo'}
                      </p>
                      {customer.commercialName && customer.commercialName !== customer.name && (
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">{customer.commercialName}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                  {/* Cartera */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-brand-danger/5 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Saldo pendiente</p>
                      <p className="text-xl font-black text-brand-danger" title={formatCurrency(customer.pendingBalance)}>
                        {formatCurrency(customer.pendingBalance)}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total facturado</p>
                      <p className="text-xl font-black text-slate-900" title={formatCurrency(customer.totalInvoiced)}>
                        {formatCurrency(customer.totalInvoiced)}
                      </p>
                    </div>
                  </div>

                  {/* Identificación y contacto */}
                  <div className="space-y-3">
                    <Field label={customer.idType || 'Identificación'} icon={<Hash size={14} />}>
                      <p className="text-sm font-bold text-slate-900 font-mono">{fullId}</p>
                      {customer.branchOffice > 0 && (
                        <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                          Sucursal {customer.branchOffice}
                        </p>
                      )}
                    </Field>

                    {customer.email && (
                      <Field label="Correo" icon={<AtSign size={14} />}>
                        <a href={`mailto:${customer.email}`} className="text-sm font-bold text-brand-primary hover:underline break-all">
                          {customer.email}
                        </a>
                      </Field>
                    )}

                    {customer.phone && (
                      <Field label="Teléfono" icon={<Phone size={14} />}>
                        <p className="text-sm font-bold text-slate-900">{customer.phone}</p>
                      </Field>
                    )}

                    {(customer.address || location) && (
                      <Field label="Dirección" icon={<MapPin size={14} />}>
                        {customer.address && <p className="text-sm font-bold text-slate-900">{customer.address}</p>}
                        {location && <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{location}</p>}
                      </Field>
                    )}

                    {(customer.contacts?.length ?? 0) > 0 && (
                      <Field label="Contactos" icon={<Users size={14} />}>
                        <div className="space-y-2 mt-1">
                          {customer.contacts!.map((contact, i) => (
                            <div key={i} className="text-sm">
                              <p className="font-bold text-slate-900">{contact.name || '—'}</p>
                              {contact.email && (
                                <a href={`mailto:${contact.email}`} className="text-[11px] text-brand-primary hover:underline break-all">
                                  {contact.email}
                                </a>
                              )}
                              {contact.phone?.number && (
                                <p className="text-[11px] text-slate-400 font-semibold">{contact.phone.number}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </Field>
                    )}
                  </div>

                  {/* Facturas */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={14} className="text-slate-400" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Facturas ({customer.invoiceCount})
                      </p>
                    </div>
                    {invoices.length === 0 ? (
                      <p className="text-xs text-slate-400 font-semibold bg-slate-50 p-4 rounded-2xl">
                        Este tercero aún no tiene facturas de venta sincronizadas.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {invoices.slice(0, 25).map(inv => (
                          <div key={inv.id} className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 font-mono">
                                {inv.reference || `${inv.prefix ?? ''}${inv.number ? `-${inv.number}` : ''}` || '—'}
                              </p>
                              <p className="text-[11px] text-slate-400 font-semibold">{inv.date}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-black text-slate-900">{formatCurrency(inv.total)}</p>
                              {inv.balance > 0 && (
                                <p className="text-[10px] font-bold text-brand-danger" title="Saldo pendiente">
                                  Debe {formatCurrency(inv.balance)}
                                </p>
                              )}
                            </div>
                            <StatusBadge status={inv.status} />
                          </div>
                        ))}
                        {invoices.length > 25 && (
                          <p className="text-[11px] text-slate-400 font-semibold text-center pt-1">
                            y {invoices.length - 25} factura{invoices.length - 25 === 1 ? '' : 's'} más
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Procedencia — este módulo es de solo lectura, Siigo manda. */}
                  <div className="text-[11px] text-slate-400 font-semibold border-t border-slate-100 pt-4 space-y-0.5">
                    <p>Sincronizado desde Siigo · solo lectura</p>
                    {customer.siigoCreatedAt && <p>Creado en Siigo: {customer.siigoCreatedAt.split('T')[0]}</p>}
                    {customer.siigoUpdatedAt && <p>Modificado en Siigo: {customer.siigoUpdatedAt.split('T')[0]}</p>}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
