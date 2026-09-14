import { Building2, Check, ChevronDown, Search, User, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/utils';
import { customersService, type Customer, type CustomerType, type ThirdParty } from '../services';

interface Props {
  value?: ThirdParty | null;
  onChange: (thirdParty: ThirdParty | null) => void;
  /** Preselects the tab most likely to be wanted; the user can still pick any. */
  preferredType?: CustomerType;
  label?: string;
  disabled?: boolean;
  /** `compact` is the filter-bar form: no label, a chip-sized control. */
  compact?: boolean;
}

const TABS: { value: CustomerType | 'all'; label: string }[] = [
  { value: 'Cliente',   label: 'Clientes' },
  { value: 'Proveedor', label: 'Proveedores' },
  { value: 'all',       label: 'Todos' },
];

function toThirdParty(c: Customer): ThirdParty {
  return {
    customerId: c.id,
    identification: c.identification,
    branchOffice: c.branchOffice,
    siigoId: c.siigoId,
    name: c.name,
    commercialName: c.commercialName,
    type: c.type,
  };
}

/**
 * Searchable third-party selector.
 *
 * There are ~1,800 third parties, so this searches the API rather than
 * filtering a list held in the browser. The tab follows the movement type —
 * income suggests a client, expense a supplier — but never restricts: Siigo
 * classifies plenty of real suppliers as "Cliente", so locking the list to one
 * type would make legitimate third parties unselectable.
 */
export function ThirdPartyPicker({ value, onChange, preferredType, label = 'Tercero', disabled, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  // A form usually knows which side it wants; a filter does not, so it opens
  // on every third party rather than hiding suppliers behind a tab.
  const [type, setType] = useState<CustomerType | 'all'>(preferredType ?? (compact ? 'all' : 'Cliente'));
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Follow the movement type while the user has not overridden the tab.
  const touchedTab = useRef(false);
  useEffect(() => {
    if (!touchedTab.current && preferredType) setType(preferredType);
  }, [preferredType]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setLoading(true);
      customersService.list({ search: search.trim() || undefined, type, limit: 20, sort: 'name' })
        .then(res => { setResults(res.data); setTotal(res.total); })
        .catch(() => { setResults([]); setTotal(0); })
        .finally(() => setLoading(false));
    }, 250); // debounce: this hits the API on every keystroke otherwise
    return () => clearTimeout(t);
  }, [search, type, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    return value.name || value.identification || '';
  }, [value]);

  const iconSize = compact ? 14 : 16;

  return (
    <div className={cn('relative', compact && 'w-56')} ref={boxRef}>
      {!compact && (
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          {label} <span className="text-slate-300 normal-case tracking-normal font-semibold">· opcional</span>
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        title={value ? `${selectedLabel} · ${value.identification ?? ''}` : undefined}
        className={cn(
          'w-full flex items-center gap-2 border text-left transition-colors outline-none',
          compact
            ? 'px-3 py-1.5 rounded-lg text-xs bg-slate-50'
            : 'px-4 py-3 rounded-2xl text-sm',
          'border-slate-200 hover:border-slate-300 focus:border-brand-primary disabled:opacity-50',
          open && 'border-brand-primary',
          compact && value && 'bg-brand-primary/5 border-brand-primary/40',
        )}
      >
        {value ? (
          <>
            {value.type === 'Proveedor'
              ? <User size={iconSize} className="text-slate-400 shrink-0" />
              : <Building2 size={iconSize} className="text-slate-400 shrink-0" />}
            <span className={cn('flex-1 min-w-0 truncate font-semibold text-slate-900', compact && 'font-bold')}>{selectedLabel}</span>
            {!compact && <span className="text-[11px] font-mono text-slate-400 shrink-0">{value.identification}</span>}
            <span
              role="button"
              tabIndex={0}
              aria-label="Quitar tercero"
              onClick={e => { e.stopPropagation(); onChange(null); }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange(null); } }}
              className={cn('rounded-lg text-slate-400 hover:text-brand-danger hover:bg-slate-100 shrink-0', compact ? 'p-0.5' : 'p-1')}
            >
              <X size={compact ? 12 : 14} />
            </span>
          </>
        ) : (
          <>
            <Search size={iconSize} className="text-slate-400 shrink-0" />
            <span className={cn('flex-1 truncate', compact ? 'text-slate-500 font-bold' : 'text-slate-400')}>
              {compact ? 'Cliente o proveedor' : 'Buscar cliente o proveedor...'}
            </span>
            <ChevronDown size={iconSize} className={cn('text-slate-400 transition-transform shrink-0', open && 'rotate-180')} />
          </>
        )}
      </button>

      {open && (
        <div className={cn('absolute z-50 left-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden', compact ? 'w-72' : 'right-0')}>
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Nombre, NIT o correo..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-primary"
              />
            </div>
            <div className="flex gap-1.5">
              {TABS.map(tab => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => { touchedTab.current = true; setType(tab.value); }}
                  className={cn(
                    'px-3 py-1 rounded-lg text-[11px] font-bold transition-colors',
                    type === tab.value ? 'bg-brand-dark text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
            {loading && results.length === 0 && (
              <p className="px-4 py-6 text-center text-xs font-semibold text-slate-400">Buscando...</p>
            )}
            {!loading && results.length === 0 && (
              <p className="px-4 py-6 text-center text-xs font-semibold text-slate-400">
                Ningún tercero coincide.
              </p>
            )}
            {results.map(c => {
              const isSelected = value?.customerId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(toThirdParty(c)); setOpen(false); setSearch(''); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-400 shrink-0">
                    {c.personType === 'Company' ? <Building2 size={14} /> : <User size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {c.name || <span className="italic text-slate-400">Sin nombre en Siigo</span>}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {c.identification}
                      {c.branchOffice > 0 && ` · sucursal ${c.branchOffice}`}
                      {' · '}{c.type}
                    </p>
                  </div>
                  {isSelected && <Check size={16} className="text-brand-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          {total > results.length && (
            <p className="px-4 py-2 text-[11px] font-semibold text-slate-400 border-t border-slate-100 bg-slate-50/60">
              {results.length} de {total} — afina la búsqueda para ver más
            </p>
          )}
        </div>
      )}
    </div>
  );
}
