import {
AlertTriangle,
ArrowLeftRight,
BarChart3,
Bell,
CheckCircle2,
ChevronDown,
LayoutDashboard,
LogOut,
Menu,
RefreshCw,
Search,
Settings,
TrendingUp,
Wallet,
X,
} from 'lucide-react';
import { useEffect,useRef,useState,type ReactNode } from 'react';
import type { LoggedInUser } from '../App';
import { BrandLogo } from '../components/BrandLogo';
import { SyncResultModal } from '../components/SyncResultModal';
import { useSettings } from '../contexts/SettingsContext';
import { canWrite } from '../lib/roles';
import { cn } from '../lib/utils';
import { notificationsService,siigoService,type NotificationSummary,type SiigoSyncMode,type SiigoSyncResult } from '../services';

interface MainLayoutProps {
  children: ReactNode;
  currentView: string;
  onNavigate: (view: any) => void;
  onLogout?: () => void;
  onSyncSuccess?: () => void;
  onSearch?: (query: string) => void;
  user?: LoggedInUser | null;
}

export function MainLayout({ children, currentView, onNavigate, onLogout, onSyncSuccess, onSearch, user }: MainLayoutProps) {
  const [syncState, setSyncState] = useState<'idle' | 'loading' | 'success' | 'partial' | 'error'>('idle');
  const [syncResult, setSyncResult] = useState<SiigoSyncResult | null>(null);
  const [showSyncMenu, setShowSyncMenu] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const getToday = () => new Date().toISOString().split('T')[0];
  const [bootstrapDate, setBootstrapDate] = useState(getToday);
  const [showBootstrapInput, setShowBootstrapInput] = useState(false);
  const [hasData, setHasData] = useState(() => localStorage.getItem('arca_has_synced_data') === 'true');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSummary | null>(null);
  const syncMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { formatCurrency } = useSettings();

  useEffect(() => {
    notificationsService.get().then(setNotifications).catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (syncMenuRef.current && !syncMenuRef.current.contains(e.target as Node)) {
        setShowSyncMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleSyncSiigo(mode: SiigoSyncMode = 'incremental', dateStart?: string) {
    if (syncState === 'loading') return;
    setSyncState('loading');
    setShowSyncMenu(false);
    setShowBootstrapInput(false);
    try {
      const result = await siigoService.sync({ mode, dateStart });
      onSyncSuccess?.();
      localStorage.setItem('arca_has_synced_data', 'true');
      setHasData(true);
      if ((result.errors?.length ?? 0) > 0) {
        setSyncState('partial');
        setSyncResult(result);
      } else {
        setSyncState('success');
        setTimeout(() => setSyncState('idle'), 3000);
      }
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
          <BrandLogo className="h-8" />
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-8 relative z-30 gap-3">

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-2 -ml-1 text-slate-500 hover:text-brand-primary shrink-0"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu size={22} />
          </button>

          {/* Search — hidden on small screens */}
          <div className="hidden sm:block flex-1 max-w-xl">
            <form onSubmit={e => { e.preventDefault(); if (headerSearch.trim()) { onSearch?.(headerSearch.trim()); setHeaderSearch(''); } }}>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
                <input
                  type="text"
                  value={headerSearch}
                  onChange={e => setHeaderSearch(e.target.value)}
                  placeholder="Buscar movimientos o facturas..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent border focus:border-brand-primary/30 focus:bg-white rounded-xl text-sm transition-all outline-none"
                />
              </div>
            </form>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            {/* Sync button — admin + tesorería */}
            {canWrite(user?.role) && <div className="relative" ref={syncMenuRef}>
              {hasData ? (
                /* ── Has data: incremental as primary, dropdown for other modes ── */
                <>
                  <div className={cn(
                    "flex rounded-xl overflow-hidden text-sm font-semibold transition-all",
                    syncState === 'idle' && "bg-brand-primary/10 text-brand-primary",
                    syncState === 'loading' && "bg-brand-primary/10 text-brand-primary opacity-70",
                    syncState === 'success' && "bg-brand-success/10 text-brand-success",
                    syncState === 'partial' && "bg-brand-warning/10 text-brand-warning",
                    syncState === 'error' && "bg-brand-danger/10 text-brand-danger",
                  )}>
                    <button
                      onClick={() => syncState === 'partial' && syncResult ? setSyncResult(syncResult) : handleSyncSiigo('incremental')}
                      disabled={syncState === 'loading'}
                      title="Sincronización incremental (últimos registros nuevos)"
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 hover:brightness-90 transition-all disabled:cursor-not-allowed"
                    >
                      {syncState === 'success' && <CheckCircle2 size={16} />}
                      {syncState === 'partial' && <AlertTriangle size={16} />}
                      {(syncState === 'idle' || syncState === 'loading' || syncState === 'error') && (
                        <RefreshCw size={16} className={cn(syncState === 'loading' && "animate-spin")} />
                      )}
                      <span className="hidden sm:inline">
                        {syncState === 'loading' ? 'Sincronizando...'
                          : syncState === 'success' ? 'Sincronizado'
                          : syncState === 'partial' ? 'Parcial'
                          : syncState === 'error' ? 'Error'
                          : 'Sincronizar'}
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
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-[200] overflow-hidden">
                      <div className="p-1">
                        <button
                          onClick={() => handleSyncSiigo('reconcile')}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 rounded-xl transition-colors"
                        >
                          <p className="font-bold text-slate-900">Reconciliar</p>
                          <p className="text-xs text-slate-400 mt-0.5">Desde el registro más antiguo · mensual</p>
                        </button>
                        <button
                          onClick={() => { setBootstrapDate(getToday()); setShowBootstrapInput(v => !v); }}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 rounded-xl transition-colors"
                        >
                          <p className="font-bold text-slate-900">Desde un periodo específico</p>
                          <p className="text-xs text-slate-400 mt-0.5">Importar historial completo desde fecha</p>
                        </button>
                        {showBootstrapInput && (
                          <div className="px-4 pb-3 space-y-2">
                            <input
                              type="date"
                              value={bootstrapDate}
                              max={getToday()}
                              onChange={e => setBootstrapDate(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                            />
                            <button
                              onClick={() => bootstrapDate && handleSyncSiigo('bootstrap', bootstrapDate)}
                              disabled={!bootstrapDate}
                              className="w-full bg-brand-primary text-white py-2 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-brand-accent transition-colors"
                            >
                              Importar {bootstrapDate} → hoy
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* ── No data yet: bootstrap date picker as the only option ── */
                <>
                  <button
                    onClick={() => setShowSyncMenu(v => !v)}
                    disabled={syncState === 'loading'}
                    className={cn(
                      "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed",
                      syncState === 'loading' ? "bg-brand-primary/10 text-brand-primary opacity-70"
                        : syncState === 'error' ? "bg-brand-danger/10 text-brand-danger"
                        : "bg-brand-primary/10 text-brand-primary hover:brightness-90"
                    )}
                    title="Importar datos históricos desde Siigo"
                  >
                    <RefreshCw size={16} className={cn(syncState === 'loading' && "animate-spin")} />
                    <span className="hidden sm:inline">
                      {syncState === 'loading' ? 'Importando...' : syncState === 'error' ? 'Error' : 'Importar datos'}
                    </span>
                  </button>

                  {showSyncMenu && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 z-[200] overflow-hidden">
                      <div className="p-4 border-b border-slate-100">
                        <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Primera sincronización</p>
                        <p className="text-xs text-slate-400 mt-0.5">Selecciona desde qué fecha importar el historial</p>
                      </div>
                      <div className="p-3 space-y-2">
                        <input
                          type="date"
                          value={bootstrapDate}
                          max={getToday()}
                          onChange={e => setBootstrapDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                        />
                        <button
                          onClick={() => bootstrapDate && handleSyncSiigo('bootstrap', bootstrapDate)}
                          disabled={!bootstrapDate || syncState === 'loading'}
                          className="w-full bg-brand-primary text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-brand-accent transition-colors"
                        >
                          Importar desde {bootstrapDate}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>}

            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(v => !v)}
                className="p-2 text-slate-400 hover:text-brand-primary hover:bg-slate-50 rounded-lg relative transition-all"
              >
                <Bell size={20} />
                {notifications && notifications.count > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-brand-danger text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white">
                    {notifications.count > 99 ? '99+' : notifications.count}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 z-[200] overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-black text-slate-900">Notificaciones</h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {notifications?.count ?? 0} pendiente{notifications?.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button onClick={() => setShowNotifications(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
                    {/* Gastos por Pagar */}
                    {notifications && notifications.gastos.length > 0 && (
                      <div>
                        <div className="px-5 py-2.5 bg-slate-50/60 sticky top-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gastos por Pagar</p>
                        </div>
                        {notifications.gastos.map(item => (
                          <NotifItem key={item.id} item={item} formatCurrency={formatCurrency} />
                        ))}
                      </div>
                    )}

                    {/* Ingresos Pendientes */}
                    {notifications && notifications.ingresos.length > 0 && (
                      <div>
                        <div className="px-5 py-2.5 bg-slate-50/60 sticky top-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingresos Pendientes</p>
                        </div>
                        {notifications.ingresos.map(item => (
                          <NotifItem key={item.id} item={item} formatCurrency={formatCurrency} />
                        ))}
                      </div>
                    )}

                    {(!notifications || notifications.count === 0) && (
                      <div className="p-10 text-center text-slate-400">
                        <Bell size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-semibold">Sin pendientes</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-200 mx-1" />

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 sm:gap-3 rounded-xl py-1 pl-1 pr-1.5 hover:bg-slate-50 transition-colors"
                title="Cuenta"
              >
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
                <ChevronDown size={16} className={cn("text-slate-400 transition-transform", showUserMenu && "rotate-180")} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 z-[200] overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900 leading-tight truncate">{user?.name ?? '—'}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email ?? ''}</p>
                    <p className="text-[10px] text-brand-primary font-bold uppercase tracking-wider mt-1">{user?.role ?? ''}</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => { setShowUserMenu(false); handleNavigate('settings'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <Settings size={18} className="text-slate-400" />
                      <span>Configuración</span>
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); onLogout?.(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand-accent hover:bg-brand-accent/5 rounded-xl transition-colors"
                    >
                      <LogOut size={18} />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 no-scrollbar">
          {children}
        </div>
      </main>

      {/* Sync result modal — shown only on partial sync (has page errors) */}
      {syncResult && (
        <SyncResultModal
          result={syncResult}
          onClose={() => { setSyncResult(null); setSyncState('idle'); }}
        />
      )}
    </div>
  );
}

// ── Notification item ─────────────────────────────────────────────────────────

import type { NotificationItem } from '../services';

function NotifItem({ item, formatCurrency }: { item: NotificationItem; formatCurrency: (n: number) => string }) {
  const urgencyColors = {
    overdue:  { dot: 'bg-brand-danger',  text: 'text-brand-danger',  label: item.daysOverdue === 1 ? '1 día vencido' : `${item.daysOverdue} días vencido` },
    'due-soon': { dot: 'bg-brand-warning', text: 'text-brand-warning', label: item.daysOverdue === 0 ? 'Vence hoy' : `Vence en ${-item.daysOverdue}d` },
    upcoming:  { dot: 'bg-slate-300',   text: 'text-slate-400',    label: `Vence en ${-item.daysOverdue}d` },
  };
  const style = urgencyColors[item.urgency];

  return (
    <div className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
      <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', style.dot)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">{item.title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{item.category}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-black text-slate-900">{formatCurrency(item.amount)}</p>
        <p className={cn('text-[10px] font-bold mt-0.5', style.text)}>{style.label}</p>
      </div>
    </div>
  );
}
