import { ArrowLeftRight,BarChart3,Clock,CornerDownLeft,LayoutDashboard,Plus,Search,Settings,TrendingUp,Users,Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect,useMemo,useRef,useState } from 'react';
import type { LoggedInUser } from '../App';
import { dialogProps,useModal } from '../hooks/useModal';
import { canWrite,canWriteProjections } from '../lib/roles';
import { cn } from '../lib/utils';

const RECENT_KEY = 'arca_recent_searches';
const MAX_RECENT = 5;

interface Props {
  onClose: () => void;
  onNavigate: (path: string) => void;
  onSearch: (query: string) => void;
  user?: LoggedInUser | null;
}

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
}

export function readRecentSearches(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter(x => typeof x === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function rememberSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const next = [trimmed, ...readRecentSearches().filter(q => q !== trimmed)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

/** Normalised for matching: case- and accent-insensitive ("proyeccion" finds "Proyecciones"). */
function fold(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function CommandPalette({ onClose, onNavigate, onSearch, user }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useModal({ onClose, autoFocus: false });
  const recents = useMemo(readRecentSearches, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const commands = useMemo<Command[]>(() => {
    const items: Command[] = [
      { id: 'dashboard',   label: 'Dashboard',        hint: 'General',      icon: LayoutDashboard, run: () => onNavigate('/dashboard') },
      { id: 'cashflow',    label: 'Flujo de Caja',    hint: 'Liquidez',     icon: Wallet,          run: () => onNavigate('/cashflow') },
      { id: 'movements',   label: 'Movimientos',      hint: 'Transacciones',icon: ArrowLeftRight,  run: () => onNavigate('/movements') },
      { id: 'projections', label: 'Proyecciones',     hint: 'Horizontes',   icon: TrendingUp,      run: () => onNavigate('/projections') },
      { id: 'clients',     label: 'Clientes',         hint: 'Terceros',     icon: Users,           run: () => onNavigate('/clients') },
      { id: 'reports',     label: 'Reportes',         hint: 'Análisis',     icon: BarChart3,       run: () => onNavigate('/reports') },
      { id: 'settings',    label: 'Configuración',    hint: 'Ajustes',      icon: Settings,        run: () => onNavigate('/settings') },
    ];
    if (canWrite(user?.role)) {
      items.push({ id: 'new-movement', label: 'Nuevo movimiento', hint: 'Crear', icon: Plus, run: () => onNavigate('/movements/new') });
    }
    if (canWriteProjections(user?.role)) {
      items.push({ id: 'new-projection', label: 'Nueva proyección', hint: 'Crear', icon: Plus, run: () => onNavigate('/projections/new') });
    }
    return items;
  }, [user?.role, onNavigate]);

  const trimmed = query.trim();

  const results = useMemo<Command[]>(() => {
    const matches = trimmed
      ? commands.filter(c => fold(c.label).includes(fold(trimmed)))
      : commands;
    if (!trimmed) {
      return [
        ...recents.map(q => ({
          id: `recent:${q}`,
          label: q,
          hint: 'Búsqueda reciente',
          icon: Clock,
          run: () => { rememberSearch(q); onSearch(q); },
        })),
        ...matches,
      ];
    }
    // Searching documents is always available — it is the fallback when the
    // text isn't a view name (references like "FV-123" never will be).
    return [
      ...matches,
      {
        id: 'search-docs',
        label: `Buscar «${trimmed}» en documentos`,
        hint: 'Facturas y recibos',
        icon: Search,
        run: () => { rememberSearch(trimmed); onSearch(trimmed); },
      },
    ];
  }, [commands, trimmed, recents, onSearch]);

  useEffect(() => { setActive(0); }, [trimmed]);

  // Keep the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      results[active]?.run();
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        {...dialogProps}
        aria-label="Paleta de comandos"
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden outline-none"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ir a una sección o buscar un documento…"
            aria-label="Buscar comandos"
            className="flex-1 text-sm font-semibold text-slate-900 placeholder-slate-400 bg-transparent outline-none"
          />
          <kbd className="text-[10px] font-black text-slate-400 border border-slate-200 rounded-md px-1.5 py-0.5">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 && (
            <p className="px-5 py-8 text-sm text-slate-400 text-center font-semibold">Sin coincidencias</p>
          )}
          {results.map((cmd, i) => (
            <button
              key={cmd.id}
              data-active={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={cmd.run}
              className={cn(
                'w-full flex items-center gap-3 px-5 py-3 text-left transition-colors',
                i === active ? 'bg-slate-50' : 'hover:bg-slate-50',
              )}
            >
              <cmd.icon size={16} className={cn('shrink-0', i === active ? 'text-brand-primary' : 'text-slate-400')} />
              <span className="flex-1 text-sm font-bold text-slate-700 truncate">{cmd.label}</span>
              {cmd.hint && <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest shrink-0">{cmd.hint}</span>}
              {i === active && <CornerDownLeft size={14} className="text-slate-300 shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
