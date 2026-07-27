import { lazy,Suspense,useEffect,useState } from 'react';
import { Navigate,Outlet,Route,Routes,useLocation,useNavigate } from 'react-router-dom';
import { SettingsProvider } from './contexts/SettingsContext';
import { ToastProvider } from './contexts/ToastContext';
import { CommandPalette } from './components/CommandPalette';
import { DocumentSearchModal } from './components/DocumentSearchModal';
import { Skeleton,SkeletonCard } from './components/Skeleton';
import { ViewErrorBoundary } from './components/ViewErrorBoundary';
import { MainLayout } from './layouts/MainLayout';
import { clearToken,getStoredUser,getToken,isTokenExpired,setStoredUser,setToken } from './lib/api';
import { friendlyAuthError } from './lib/authErrors';
import { hasRedirectResponse } from './lib/msal';
import { authService } from './services';
import { LoginView } from './views/LoginView';

// Login stays in the entry bundle — it is the first screen of a cold visit and
// nothing else can be shown until it is done. Every view behind it is fetched
// when its route is first opened, so the initial download carries one view's
// worth of charting and table code instead of all seven.
const CashFlowView         = lazyView(() => import('./views/CashFlowView'),         m => m.CashFlowView);
const CreateMovementView   = lazyView(() => import('./views/CreateMovementView'),   m => m.CreateMovementView);
const CreateProjectionView = lazyView(() => import('./views/CreateProjectionView'), m => m.CreateProjectionView);
const DashboardView        = lazyView(() => import('./views/DashboardView'),        m => m.DashboardView);
const MovementsView        = lazyView(() => import('./views/MovementsView'),        m => m.MovementsView);
const ProjectionsView      = lazyView(() => import('./views/ProjectionsView'),      m => m.ProjectionsView);
const ReportsView          = lazyView(() => import('./views/ReportsView'),          m => m.ReportsView);
const SettingsView         = lazyView(() => import('./views/SettingsView'),         m => m.SettingsView);

/** `lazy` for the named exports the views use, instead of a default export. */
function lazyView<M, C extends React.ComponentType<any>>(load: () => Promise<M>, pick: (mod: M) => C) {
  return lazy(() => load().then(mod => ({ default: pick(mod) })));
}

/** Holds the page's shape while a view's chunk arrives, so the layout doesn't
 *  jump once it renders. Views swap in their own skeletons while they fetch. */
function ViewFallback() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-10 w-56" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 h-96"><Skeleton className="h-full w-full" /></div>
    </div>
  );
}

export interface LoggedInUser { id: string; name: string; email: string; role: string; }

/** Path segment used by MainLayout to highlight the active nav item. */
function viewFromPath(pathname: string): string {
  const [, first, second] = pathname.split('/');
  if (first === 'movements' && second === 'new') return 'create-movement';
  if (first === 'projections' && second === 'new') return 'create-projection';
  return first || 'dashboard';
}

export default function App() {
  const [user, setUser] = useState<LoggedInUser | null>(() => getStoredUser());
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Surfaced on the login screen when a Microsoft redirect login is rejected
  // (e.g. the account's domain is not authorised).
  const [authError, setAuthError] = useState('');
  // True while we resolve a Microsoft redirect, so we don't flash the login view.
  const [resolvingAuth, setResolvingAuth] = useState(hasRedirectResponse);

  const navigate = useNavigate();
  const location = useLocation();

  // Send the user back to login when the session expires: reactively (a 401
  // from the API fires 'auth:session-expired') and proactively (token's exp
  // has passed on load or when the tab regains focus).
  useEffect(() => {
    // An expiry is involuntary, so it carries the current URL along: signing
    // back in returns to the page instead of dropping the user on the dashboard.
    const endSession = () => {
      clearToken();
      setUser(null);
      const from = window.location.pathname + window.location.search;
      navigate('/login', { replace: true, state: from.startsWith('/login') ? null : { from } });
    };
    const logoutIfExpired = () => {
      if (getToken() && isTokenExpired()) endSession();
    };
    logoutIfExpired();
    const onExpired = () => endSession();
    window.addEventListener('auth:session-expired', onExpired);
    window.addEventListener('focus', logoutIfExpired);
    document.addEventListener('visibilitychange', logoutIfExpired);
    return () => {
      window.removeEventListener('auth:session-expired', onExpired);
      window.removeEventListener('focus', logoutIfExpired);
      document.removeEventListener('visibilitychange', logoutIfExpired);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Complete a Microsoft login if we just came back from the redirect.
  useEffect(() => {
    authService.completeMicrosoftLogin()
      .then(res => {
        if (res) {
          setToken(res.token);
          handleLogin(res.user);
        }
      })
      .catch((err: any) => setAuthError(friendlyAuthError(err?.message)))
      .finally(() => setResolvingAuth(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cmd/Ctrl+K opens the command palette from anywhere.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(open => !open);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleLogin = (u: LoggedInUser) => {
    setStoredUser(u);
    setUser(u);
    // Resume the link that sent the user to login (RequireAuth stashed it),
    // so an expired session doesn't cost them the page they were opening.
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from && !from.startsWith('/login') ? from : '/dashboard', { replace: true });
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    navigate('/login', { replace: true });
  };

  if (resolvingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg text-slate-400 font-semibold">
        Iniciando sesión…
      </div>
    );
  }

  // Authenticated shell. Rendered as a layout route so every view below keeps
  // the chrome and the URL stays the single source of truth for what is shown.
  const shell = (
    <ToastProvider>
      <SettingsProvider userId={user?.id ?? null}>
        {searchQuery !== null && (
          <DocumentSearchModal initialQuery={searchQuery} onClose={() => setSearchQuery(null)} />
        )}
        {paletteOpen && (
          <CommandPalette
            onClose={() => setPaletteOpen(false)}
            onNavigate={path => { setPaletteOpen(false); navigate(path); }}
            onSearch={q => { setPaletteOpen(false); setSearchQuery(q); }}
            user={user}
          />
        )}
        <MainLayout
          currentView={viewFromPath(location.pathname)}
          onNavigate={view => navigate(`/${view}`)}
          onLogout={handleLogout}
          onSyncSuccess={() => setRefreshKey(k => k + 1)}
          onSearch={q => setSearchQuery(q)}
          user={user}
        >
          <ViewErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<ViewFallback />}>
              <Outlet />
            </Suspense>
          </ViewErrorBoundary>
        </MainLayout>
      </SettingsProvider>
    </ToastProvider>
  );

  return (
    <Routes>
      <Route path="/login" element={<LoginView onLogin={handleLogin} initialError={authError} />} />
      <Route element={<RequireAuth>{shell}</RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={
          <DashboardView key={refreshKey} onCreateMovement={() => navigate('/movements/new')} user={user} />
        } />
        <Route path="/cashflow" element={
          <CashFlowView
            key={refreshKey}
            onCreateMovement={() => navigate('/movements/new')}
            onCreateProjection={() => navigate('/projections/new')}
            user={user}
          />
        } />
        <Route path="/movements" element={
          <MovementsView key={refreshKey} onCreateMovement={() => navigate('/movements/new')} user={user} />
        } />
        <Route path="/movements/new" element={
          <CreateMovementView onBack={() => navigate('/movements')} onSave={() => navigate('/movements')} />
        } />
        <Route path="/projections" element={<ProjectionsView onCreateProjection={() => navigate('/projections/new')} user={user} />} />
        <Route path="/projections/new" element={
          <CreateProjectionView onBack={() => navigate('/projections')} onSave={() => navigate('/projections')} />
        } />
        <Route path="/reports" element={<ReportsView />} />
        <Route path="/settings" element={<SettingsView />} />
        {/* Unknown path inside the app: fall back to the dashboard. */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

/** Gate for the authenticated shell; remembers where the user was headed. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!getToken() || isTokenExpired()) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}
