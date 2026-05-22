import { useState, type ReactNode } from 'react';
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
  HelpCircle,
  RefreshCw,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { LoggedInUser } from '../App';
import { siigoService } from '../services';

interface MainLayoutProps {
  children: ReactNode;
  currentView: string;
  onNavigate: (view: any) => void;
  onLogout?: () => void;
  user?: LoggedInUser | null;
}

export function MainLayout({ children, currentView, onNavigate, onLogout, user }: MainLayoutProps) {
  const [syncState, setSyncState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function handleSyncSiigo() {
    if (syncState === 'loading') return;
    setSyncState('loading');
    try {
      await siigoService.sync();
      setSyncState('success');
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
            <p className="text-[10px] text-slate-400 font-medium tracking-wider mt-1">FINANCIAL CURATOR</p>
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
          <button className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-brand-primary text-sm transition-colors">
            <HelpCircle size={18} />
            <span>Ayuda</span>
          </button>
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
            {/* Sync button — icon-only on mobile */}
            <button
              onClick={handleSyncSiigo}
              disabled={syncState === 'loading'}
              title="Sincronizar Siigo"
              className={cn(
                "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                syncState === 'idle' && "bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20",
                syncState === 'loading' && "bg-brand-primary/10 text-brand-primary opacity-70 cursor-not-allowed",
                syncState === 'success' && "bg-brand-success/10 text-brand-success",
                syncState === 'error' && "bg-brand-danger/10 text-brand-danger",
              )}
            >
              {syncState === 'success' ? <CheckCircle2 size={16} /> : <RefreshCw size={16} className={cn(syncState === 'loading' && "animate-spin")} />}
              <span className="hidden sm:inline">
                {syncState === 'loading' ? 'Sincronizando...' : syncState === 'success' ? 'Sincronizado' : syncState === 'error' ? 'Error' : 'Sincronizar Siigo'}
              </span>
            </button>

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
