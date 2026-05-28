import { useState, useRef, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  ArrowLeftRight,
  BarChart3,
  Settings,
  Bell,
  Search,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { LoggedInUser } from '../App';
import { siigoService, type SiigoSyncMode } from '../services';

interface MainLayoutProps {
  children: ReactNode;
  currentView: string;
  onNavigate: (view: any) => void;
  onLogout?: () => void;
  onSyncSuccess?: () => void;
  user?: LoggedInUser | null;
}

export function MainLayout({ children, currentView, onNavigate, onLogout, onSyncSuccess, user }: MainLayoutProps) {
  const [syncState, setSyncState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showSyncMenu, setShowSyncMenu] = useState(false);
  const [bootstrapDate, setBootstrapDate] = useState('');
  const [showBootstrapInput, setShowBootstrapInput] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const syncMenuRef = useRef<HTMLDivElement>(null);

  async function handleSyncSiigo(mode: SiigoSyncMode = 'incremental', dateStart?: string) {
    if (syncState === 'loading') return;
    setSyncState('loading');
    setShowSyncMenu(false);
    setShowBootstrapInput(false);
    try {
      await siigoService.sync({ mode, dateStart });
      setSyncState('success');
      onSyncSuccess?.();
      setTimeout(() => setSyncState('idle'), 3000);
    } catch {
      setSyncState('error');
      setTimeout(() => setSyncState('idle'), 3000);
    }
  }

  function handleNavigate(view: any) {
    onNavigate(view);
    setMobileNavOpen(false);
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cashflow', label: 'Flujo de caja', icon: Wallet },
    { id: 'projections', label: 'Proyecciones', icon: TrendingUp },
    { id: 'movements', label: 'Movimientos', icon: ArrowLeftRight },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden">

      {/* Mobile backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-40 w-64 bg-brand-sidebar border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out",
        mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-primary">Intexa ArCa</h1>
          </div>
          <button
            className="md:hidden p-1 text-slate-400 hover:text-slate-600"
            onClick={() => setMobileNavOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-slate-100 text-brand-primary font-semibold shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-brand-primary"
                )}
              >
                <Icon size={20} className={cn(isActive ? "text-brand-primary" : "text-slate-400 group-hover:text-brand-primary")} />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-1">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-brand-primary text-sm transition-colors"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-8 z-10 gap-3">

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-2 -ml-1 text-slate-500 hover:text-brand-primary shrink-0"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu size={22} />
          </button>

          {/* Search — hidden on small screens */}
          <div className="hidden sm:block flex-1 max-w-xl">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar movimientos o facturas..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent border focus:border-brand-primary/30 focus:bg-white rounded-xl text-sm transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            {/* Sync button with mode dropdown */}
            <div className="relative" ref={syncMenuRef}>
              <div className={cn(
                "flex rounded-xl overflow-hidden text-sm font-semibold transition-all",
                syncState === 'idle' && "bg-brand-primary/10 text-brand-primary",
                syncState === 'loading' && "bg-brand-primary/10 text-brand-primary opacity-70",
                syncState === 'success' && "bg-brand-success/10 text-brand-success",
                syncState === 'error' && "bg-brand-danger/10 text-brand-danger",
              )}>
                <button
                  onClick={() => handleSyncSiigo('incremental')}
                  disabled={syncState === 'loading'}
                  title="Sincronizar Siigo (últimos 90 días)"
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 hover:brightness-90 transition-all disabled:cursor-not-allowed"
                >
                  {syncState === 'success' ? <CheckCircle2 size={16} /> : <RefreshCw size={16} className={cn(syncState === 'loading' && "animate-spin")} />}
                  <span className="hidden sm:inline">
                    {syncState === 'loading' ? 'Sincronizando...' : syncState === 'success' ? 'Sincronizado' : syncState === 'error' ? 'Error' : 'Sincronizar'}
                  </span>
                </button>
                <button
                  onClick={() => setShowSyncMenu(v => !v)}
                  disabled={syncState === 'loading'}
                  className="px-2 py-2 border-l border-current/20 hover:brightness-90 transition-all disabled:cursor-not-allowed"
                  title="Más opciones de sincronización"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 8L1 3h10z"/></svg>
                </button>
              </div>

              {showSyncMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                  <div className="p-1">
                    <button
                      onClick={() => handleSyncSiigo('incremental')}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <p className="font-bold text-slate-900">Incremental</p>
                      <p className="text-xs text-slate-400 mt-0.5">Últimos 90 días · automático diario</p>
                    </button>
                    <button
                      onClick={() => handleSyncSiigo('reconcile')}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <p className="font-bold text-slate-900">Reconciliar</p>
                      <p className="text-xs text-slate-400 mt-0.5">Desde el registro más antiguo · mensual</p>
                    </button>
                    <button
                      onClick={() => { setShowBootstrapInput(v => !v); }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <p className="font-bold text-slate-900">Carga inicial</p>
                      <p className="text-xs text-slate-400 mt-0.5">Importar historial completo desde fecha</p>
                    </button>
                    {showBootstrapInput && (
                      <div className="px-4 pb-3 space-y-2">
                        <input
                          type="date"
                          value={bootstrapDate}
                          onChange={e => setBootstrapDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                        />
                        <button
                          onClick={() => bootstrapDate && handleSyncSiigo('bootstrap', bootstrapDate)}
                          disabled={!bootstrapDate}
                          className="w-full bg-brand-primary text-white py-2 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-brand-accent transition-colors"
                        >
                          Importar desde {bootstrapDate || '—'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button className="p-2 text-slate-400 hover:text-brand-primary hover:bg-slate-50 rounded-lg relative transition-all">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-brand-danger border-2 border-white rounded-full" />
            </button>

            <div className="hidden sm:block h-8 w-px bg-slate-200 mx-1" />

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Name/role hidden on mobile */}
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-slate-900 leading-tight">{user?.name ?? '—'}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{user?.role ?? ''}</p>
              </div>
              <div className="relative">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-primary/10 text-brand-primary font-black text-lg flex items-center justify-center ring-2 ring-slate-100">
                  {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-brand-success border-2 border-white rounded-full shadow-sm" />
              </div>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 no-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
