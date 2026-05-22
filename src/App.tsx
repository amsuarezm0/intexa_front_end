import { useState, useEffect } from 'react';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { MovementsView } from './views/MovementsView';
import { ProjectionsView } from './views/ProjectionsView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { CashFlowView } from './views/CashFlowView';
import { CreateMovementView } from './views/CreateMovementView';
import { CreateProjectionView } from './views/CreateProjectionView';
import { MainLayout } from './layouts/MainLayout';
import { getToken, clearToken, getStoredUser, setStoredUser } from './lib/api';

type View = 'login' | 'dashboard' | 'cashflow' | 'projections' | 'movements' | 'reports' | 'settings' | 'create-movement' | 'create-projection';

export interface LoggedInUser { id: string; name: string; email: string; role: string; }

export default function App() {
  const [currentView, setCurrentView] = useState<View>(() =>
    getToken() ? 'dashboard' : 'login'
  );
  const [user, setUser] = useState<LoggedInUser | null>(() => getStoredUser());

  useEffect(() => {
    if (!getToken() && currentView !== 'login') {
      setCurrentView('login');
    }
  }, [currentView]);

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
        return <DashboardView onCreateMovement={() => handleNavigate('create-movement')} />;
      case 'cashflow':
        return <CashFlowView onCreateMovement={() => handleNavigate('create-movement')} />;
      case 'movements':
        return <MovementsView onCreateMovement={() => handleNavigate('create-movement')} />;
      case 'create-movement':
        return <CreateMovementView
          onBack={() => handleNavigate('movements')}
          onSave={() => handleNavigate('movements')}
        />;
      case 'projections':
        return <ProjectionsView onCreateProjection={handleCreateProjection} />;
      case 'create-projection':
        return <CreateProjectionView onBack={() => handleNavigate('projections')} onSave={() => handleNavigate('projections')} />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onCreateMovement={() => handleNavigate('create-movement')} />;
    }
  };

  if (currentView === 'login') {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <MainLayout
      currentView={currentView}
      onNavigate={handleNavigate as any}
      onLogout={handleLogout}
      user={user}
    >
      {renderView()}
    </MainLayout>
  );
}
