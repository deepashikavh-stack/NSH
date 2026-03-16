import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardView from './views/DashboardView';
import VehiclesView from './views/VehiclesView';
import ReportsView from './views/ReportsView';
import ScheduledMeetingsView from './views/ScheduledMeetingsView';
import UserManagementView from './views/UserManagementView';
import VisitorTypeSelection from './views/VisitorTypeSelection';
import LoginPage from './views/LoginPage';
import VisitorSelfCheckIn from './components/VisitorSelfCheckIn';
import VisitorCheckOut from './components/VisitorCheckOut';
import SettingsView from './views/SettingsView';
import AuditTrailView from './views/AuditTrailView';
import ExternalApprovalView from './views/ExternalApprovalView';
import PublicMeetingRequestView from './views/PublicMeetingRequestView';
import { ArrowLeft } from 'lucide-react';
import { AlertProvider } from './context/AlertContext';
import { logAudit } from './lib/audit';
import { syncTranslations } from './lib/translationSync';
import { ROUTE_PERMISSIONS } from './utils/routeConfig';
import './App.css';

function AppContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Sync translations from DB (non-blocking)
    syncTranslations().catch(err => {
      console.warn('Translation sync failed, using local translations:', err);
    });
  }, []);

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ngs_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Session integrity check — verify essential fields exist
      if (!parsed || !parsed.role || !parsed.username) {
        localStorage.removeItem('ngs_user');
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem('ngs_user');
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    // Sync activeTab with URL if possible, or just keep it simple for now
    const path = location.pathname.substring(1);
    if (path && ['dashboard', 'scheduled-meetings', 'visitors', 'vehicles', 'reports', 'audit-trail', 'user-management', 'settings'].includes(path)) {
      setActiveTab(path);
    }
  }, [location]);

  useEffect(() => {
    // Load Google API and Identity Services scripts
    const loadScript = (src) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };

    loadScript('https://apis.google.com/js/api.js');
    loadScript('https://accounts.google.com/gsi/client');
  }, []);

  const handleLogin = (userData) => {
    const userRole = userData.role || 'Security Officer';
    const finalUser = { ...userData, role: userRole };
    setUser(finalUser);
    localStorage.setItem('ngs_user', JSON.stringify(finalUser));

    if (userRole === 'Security Officer') {
      navigate('/dashboard');
    } else if (userRole === 'School Management') {
      navigate('/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogout = () => {
    if (user) {
      logAudit('Logout', 'users', null, user.username || user.email, { name: user.full_name, role: user.role });
    }
    setUser(null);
    localStorage.removeItem('ngs_user');
    navigate('/');
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('ngs_user', JSON.stringify(updatedUser));
  };

  const isKioskMode = location.pathname.startsWith('/kiosk');
  const isApprovalLink = location.pathname.startsWith('/approve');
  const isPublicMeetingRequest = location.pathname === '/request-meeting';

  if (!user && !isKioskMode && !isApprovalLink && !isPublicMeetingRequest && location.pathname !== '/' && location.pathname !== '/login') {
    return <Navigate to="/" replace />;
  }

  const isStandalone = isKioskMode || isApprovalLink || isPublicMeetingRequest;

  return (
    <AlertProvider user={user}>
      <div className="app-container" style={{ display: 'flex', minHeight: '100vh' }}>
        {user && !isStandalone && (
          <Sidebar
            activeTab={activeTab}
            setActiveTab={(tab) => {
              navigate('/' + tab);
              if (isMobile) setSidebarOpen(false);
            }}
            onLogout={handleLogout}
            role={user?.role}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            isMobile={isMobile}
          />
        )}

        <main style={{
          flex: 1,
          marginLeft: (user && !isStandalone && !isMobile) ? '280px' : '0',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'transparent',
          transition: 'var(--transition)',
          width: '100%',
          overflowX: 'hidden'
        }}>
          {isKioskMode ? (
            <header style={{
              padding: '1rem 2rem',
              margin: '1rem',
              backgroundColor: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow)'
            }}>
              <button
                onClick={() => navigate('/')}
                style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none' }}
              >
                <ArrowLeft size={20} /> {t('common.back_to_home', { defaultValue: 'Back to Home' })}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '10px' }}>
                  <img src="/logo.png" alt="Logo" style={{ width: '24px', height: 'auto' }} />
                </div>
                <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>Nextgen Shield</span>
              </div>
            </header>
          ) : (
            user && !isStandalone && <Navbar
              activeTab={activeTab}
              user={user}
              theme={theme}
              toggleTheme={toggleTheme}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              isMobile={isMobile}
            />
          )}

          <div className="main-content" style={{
            flex: 1,
            padding: (user && !isStandalone && !isMobile) ? '0 1.5rem 1.5rem 0' : '0'
          }}>
            <Routes>
              <Route path="/" element={<VisitorTypeSelection />} />
              <Route path="/login" element={<LoginPage onLogin={handleLogin} onBack={() => navigate('/')} />} />

              {/* Protected Routes — wrapped with role-based access control */}
              <Route path="/dashboard" element={
                <ProtectedRoute user={user} allowedRoles={ROUTE_PERMISSIONS['/dashboard']}>
                  <DashboardView user={user} />
                </ProtectedRoute>
              } />
              <Route path="/scheduled-meetings" element={
                <ProtectedRoute user={user} allowedRoles={ROUTE_PERMISSIONS['/scheduled-meetings']}>
                  <ScheduledMeetingsView />
                </ProtectedRoute>
              } />
              <Route path="/vehicles" element={
                <ProtectedRoute user={user} allowedRoles={ROUTE_PERMISSIONS['/vehicles']}>
                  <VehiclesView />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute user={user} allowedRoles={ROUTE_PERMISSIONS['/reports']}>
                  <ReportsView user={user} />
                </ProtectedRoute>
              } />
              <Route path="/audit-trail" element={
                <ProtectedRoute user={user} allowedRoles={ROUTE_PERMISSIONS['/audit-trail']}>
                  <AuditTrailView />
                </ProtectedRoute>
              } />
              <Route path="/user-management" element={
                <ProtectedRoute user={user} allowedRoles={ROUTE_PERMISSIONS['/user-management']}>
                  <UserManagementView />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute user={user} allowedRoles={ROUTE_PERMISSIONS['/settings']}>
                  <SettingsView user={user} onUpdateUser={handleUpdateUser} />
                </ProtectedRoute>
              } />

              {/* Kiosk Routes */}
              <Route path="/kiosk/check-in" element={<VisitorSelfCheckIn />} />
              <Route path="/kiosk/check-out" element={<VisitorCheckOut />} />
              <Route path="/kiosk/vehicles" element={<VehiclesView />} />
              <Route path="/approve/:token" element={<ExternalApprovalView />} />
              <Route path="/request-meeting" element={<PublicMeetingRequestView />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </AlertProvider>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
