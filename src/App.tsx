import { useEffect,useState } from 'react';
import { SettingsProvider } from './contexts/SettingsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { DocumentSearchModal } from './components/DocumentSearchModal';
import { MainLayout } from './layouts/MainLayout';
import { clearToken,getStoredUser,getToken,isTokenExpired,setStoredUser,setToken } from './lib/api';
import { authService } from './services';
import { CashFlowView } from './views/CashFlowView';
import { CreateMovementView } from './views/CreateMovementView';
import { CreateProjectionView } from './views/CreateProjectionView';
import { DashboardView } from './views/DashboardView';
import { LoginView } from './views/LoginView';
import { MovementsView } from './views/MovementsView';
import { ProjectionsView } from './views/ProjectionsView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';

type View = 'login' | 'dashboard' | 'cashflow' | 'projections' | 'movements' | 'reports' | 'settings' | 'create-movement' | 'create-projection';

export interface LoggedInUser { id: string; name: string; email: string; role: string; }

export default function App() {
  const [currentView, setCurrentView] = useState<View>(() =>
    getToken() && !isTokenExpired() ? 'dashboard' : 'login'
  );
  const [user, setUser] = useState<LoggedInUser | null>(() => getStoredUser());
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  // True while we resolve a Microsoft redirect, so we don't flash the login view.
  const [resolvingAuth, setResolvingAuth] = useState(
    () => /(?:code|state|error|session_state)=/.test(window.location.hash + window.location.search)
  );

  useEffect(() => {
    if (!getToken() && currentView !== 'login') setCurrentView('login');
  }, [currentView]);

  // Send the user back to login when the session expires: reactively (a 401
  // from the API fires 'auth:session-expired') and proactively (token's exp
  // has passed on load or when the tab regains focus).
  useEffect(() => {
    const logoutIfExpired = () => {
      if (getToken() && isTokenExpired()) handleLogout();
    };
    logoutIfExpired();
    const onExpired = () => handleLogout();
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
      .catch(() => { /* on failure the login view is shown */ })
      .finally(() => setResolvingAuth(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = (u: LoggedInUser) => {
    setStoredUser(u);
    setUser(u);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setCurrentView('login');
  };

  const handleNavigate = (view: View) => setCurrentView(view);

  const handleCreateProjection = () => setCurrentView('create-projection');

  const renderView = () => {
    switch (currentView) {
      case 'login':
        return <LoginView onLogin={handleLogin} />;
      case 'dashboard':
        return <DashboardView key={refreshKey} onCreateMovement={() => handleNavigate('create-movement')} user={user} />;
      case 'cashflow':
        return <CashFlowView key={refreshKey} onCreateMovement={() => handleNavigate('create-movement')} onCreateProjection={handleCreateProjection} user={user} />;
      case 'movements':
        return <MovementsView key={refreshKey} onCreateMovement={() => handleNavigate('create-movement')} user={user} />;
      case 'create-movement':
        return <CreateMovementView
          onBack={() => handleNavigate('movements')}
          onSave={() => handleNavigate('movements')}
        />;
      case 'projections':
        return <ProjectionsView onCreateProjection={handleCreateProjection} user={user} />;
      case 'create-projection':
        return <CreateProjectionView onBack={() => handleNavigate('projections')} onSave={() => handleNavigate('projections')} />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onCreateMovement={() => handleNavigate('create-movement')} user={user} />;
    }
  };

  if (resolvingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg text-slate-400 font-semibold">
        Iniciando sesión…
      </div>
    );
  }

  if (currentView === 'login') {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <ThemeProvider>
    <ToastProvider>
    <SettingsProvider userId={user?.id ?? null}>
      {searchQuery !== null && (
        <DocumentSearchModal initialQuery={searchQuery} onClose={() => setSearchQuery(null)} />
      )}
      <MainLayout
        currentView={currentView}
        onNavigate={handleNavigate as any}
        onLogout={handleLogout}
        onSyncSuccess={() => setRefreshKey(k => k + 1)}
        onSearch={q => setSearchQuery(q)}
        user={user}
      >
        {renderView()}
      </MainLayout>
    </SettingsProvider>
    </ToastProvider>
    </ThemeProvider>
  );
}
