import { X, Search, Loader2, FileText, ArrowDownCircle, ArrowUpCircle, Receipt, ShoppingCart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { searchService, type SearchDocument } from '../services';
import { StatusBadge } from './StatusBadge';
import { cn } from '../lib/utils';

const DOC_ICONS: Record<string, React.ReactNode> = {
  RC: <ArrowDownCircle size={16} className="text-brand-success" />,
  RP: <ArrowUpCircle size={16} className="text-brand-danger" />,
  FV: <FileText size={16} className="text-brand-success" />,
  FC: <ShoppingCart size={16} className="text-brand-danger" />,
};

const DOC_LABELS: Record<string, string> = {
  RC: 'Recibo de Caja',
  RP: 'Recibo de Pago',
  FV: 'Factura de Venta',
  FC: 'Factura de Compra',
};

interface Props {
  initialQuery?: string;
  onClose: () => void;
}

export function DocumentSearchModal({ initialQuery = '', onClose }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchDocument[]>([]);
  const [selected, setSelected] = useState<SearchDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { formatCurrency } = useSettings();

  useEffect(() => {
    inputRef.current?.focus();
    if (initialQuery.trim()) runSearch(initialQuery.trim());
  }, []);

  async function runSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setSelected(null);
    setSearched(false);
    try {
      const data = await searchService.search(q.trim());
      setResults(data ?? []);
      if (data?.length === 1) setSelected(data[0]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(query);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">

        {/* Search bar */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <Search size={20} className="text-slate-400 shrink-0" />
          <form onSubmit={handleSubmit} className="flex-1">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por referencia, nombre o descripción… (RC-001, FV-123)"
              className="w-full text-sm font-medium text-slate-900 placeholder-slate-400 outline-none bg-transparent"
            />
          </form>
          {loading && <Loader2 size={18} className="animate-spin text-slate-400 shrink-0" />}
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Results list */}
          {(!selected || results.length > 1) && (
            <div className={cn("flex flex-col overflow-y-auto", selected ? "w-64 border-r border-slate-100" : "w-full")}>
              {searched && results.length === 0 && (
                <p className="px-6 py-10 text-sm text-slate-400 text-center">Sin resultados para "{query}"</p>
              )}
              {!searched && !loading && (
                <p className="px-6 py-10 text-sm text-slate-400 text-center">Ingresa un prefijo o término para buscar</p>
              )}
              {results.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setSelected(doc)}
                  className={cn(
                    "flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors border-b border-slate-50",
                    selected?.id === doc.id && "bg-brand-primary/5 border-l-2 border-l-brand-primary"
                  )}
                >
                  <span className="shrink-0">{DOC_ICONS[doc.docType] ?? <Receipt size={16} />}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{doc.reference}</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{doc.counterparty || doc.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-sm font-extrabold", doc.docType === 'RC' || doc.docType === 'FV' ? "text-brand-success" : "text-brand-danger")}>
                      {formatCurrency(doc.amount)}
                    </p>
                    <p className="text-[10px] text-slate-400">{doc.date}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Detail pane */}
          {selected && (
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {results.length > 1 && (
                <button onClick={() => setSelected(null)} className="text-xs font-bold text-brand-primary hover:underline">
                  ← Volver a resultados
                </button>
              )}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {DOC_ICONS[selected.docType]}
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {DOC_LABELS[selected.docType] ?? selected.docType}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">{selected.reference}</h2>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
                <Row label="Monto">
                  <span className={cn("text-lg font-black", selected.docType === 'RC' || selected.docType === 'FV' ? "text-brand-success" : "text-brand-danger")}>
                    {selected.docType === 'RC' || selected.docType === 'FV' ? '+' : '-'}{formatCurrency(selected.amount)}
                  </span>
                </Row>
                {selected.counterparty && <Row label={selected.docType === 'FV' ? 'Cliente' : 'Proveedor'}><span className="text-sm font-semibold text-slate-900">{selected.counterparty}</span></Row>}
                <Row label="Fecha"><span className="text-sm font-semibold text-slate-700">{selected.date}</span></Row>
                {selected.dueDate && <Row label="Vencimiento"><span className="text-sm font-semibold text-slate-700">{selected.dueDate}</span></Row>}
                <Row label="Categoría"><span className="text-xs font-bold px-3 py-1 bg-white rounded-lg border border-slate-200 text-slate-600">{selected.category}</span></Row>
              </div>

              {selected.description && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Detalle</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{selected.description}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">{label}</span>
      {children}
    </div>
  );
}
