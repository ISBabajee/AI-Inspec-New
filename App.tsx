



import React from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import SiteEngineerDashboardPage from './pages/SiteEngineerDashboardPage';
import ClientReportsPage from './pages/ClientReportsPage';
import CompleteReportPage from './pages/CompleteReportPage';
import SingleReportPage from './pages/SingleReportPage';
import AdminLayout from './components/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import AdminClientOverviewPage from './pages/admin/AdminClientOverviewPage';
import AdminLoginActivityPage from './pages/admin/AdminLoginActivityPage';
import AdminEditInspectionPage from './pages/admin/AdminEditInspectionPage';
import AdminClientManagementPage from './pages/admin/AdminClientManagementPage';
import { UserRole } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import ThemeToggle from './components/ThemeToggle';
import { LogoIcon, OnlineStatusIcon, OfflineStatusIcon, SignOutIcon } from './components/Icons';
import { AdminProvider } from './hooks/useAdmin';

const HeaderLogo: React.FC = () => (
    <div className="flex items-center text-white gap-2 sm:gap-3">
        <LogoIcon />
        <span className="text-xl sm:text-3xl font-bold tracking-tight">AI-Inspec</span>
    </div>
);


const App: React.FC = () => {
  const { currentUser, initialAuthCompleted, signOut } = useAuth();
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!initialAuthCompleted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-brand-dark">
        <LoadingSpinner text="Initializing AI-Inspec..." />
      </div>
    );
  }

  const commonRedirectPath = () => {
    if (!currentUser) return "/signin";
    return currentUser.role === UserRole.ADMIN ? "/admin/dashboard" : "/dashboard";
  }

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-gray-950">
        <header className="bg-red-600 text-white p-2 sm:p-4 shadow-md sticky top-0 z-[60] flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-4">
             <Link to={commonRedirectPath()} className="flex items-center hover:opacity-90 transition-opacity">
                <HeaderLogo />
             </Link>
          </div>
          <nav className="flex items-center space-x-2 sm:space-x-4">
            {currentUser ? (
              <div className="flex items-center space-x-2 sm:space-x-4">
                <ThemeToggle />
                <div 
                  title={isOnline ? 'Online' : 'Offline - Some features may be limited'} 
                  className="flex items-center gap-1.5"
                  aria-label={`Network status: ${isOnline ? 'Online' : 'Offline'}`}
                >
                  {isOnline ? <OnlineStatusIcon /> : <OfflineStatusIcon />}
                  <span className={`hidden sm:inline text-xs font-medium ${isOnline ? 'text-green-200' : 'text-yellow-200'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                {currentUser.role === UserRole.ADMIN && (
                  <Link to="/admin/dashboard" className="hidden sm:inline text-xs sm:text-sm hover:text-red-200 font-medium">Admin Panel</Link>
                )}
                 {currentUser.role === UserRole.SITE_ENGINEER && (
                  <Link to="/dashboard" className="hidden sm:inline text-xs sm:text-sm hover:text-red-200 font-medium">Dashboard</Link>
                )}
                <button 
                  onClick={signOut} 
                  className="p-1.5 sm:p-2 rounded-full text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-600 focus:ring-white"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <SignOutIcon />
                </button>
              </div>
            ) : <ThemeToggle />}
          </nav>
        </header>
        <main className="flex-grow pt-0 sm:pt-4 bg-slate-100 dark:bg-gray-950">
          <Routes>
            <Route path="/signin" element={!currentUser ? <SignInPage /> : <Navigate to={commonRedirectPath()} />} />
            <Route path="/signup" element={!currentUser ? <SignUpPage /> : <Navigate to={commonRedirectPath()} />} />
            
            {/* Site Engineer Routes */}
            <Route
              path="/dashboard"
              element={
                currentUser && currentUser.role === UserRole.SITE_ENGINEER && currentUser.status === 'approved' ? (
                  <SiteEngineerDashboardPage />
                ) : (
                  <Navigate to="/signin" />
                )
              }
            />
            <Route
              path="/client-reports"
              element={
                currentUser && (currentUser.role === UserRole.SITE_ENGINEER || currentUser.role === UserRole.ADMIN) && currentUser.status === 'approved' ? (
                  <ClientReportsPage />
                ) : (
                  <Navigate to="/signin" />
                )
              }
            />
            <Route
              path="/complete-report"
              element={
                 currentUser && (currentUser.role === UserRole.SITE_ENGINEER || currentUser.role === UserRole.ADMIN) && currentUser.status === 'approved' ? (
                  <CompleteReportPage />
                ) : (
                  <Navigate to="/signin" />
                )
              }
            />
             <Route
              path="/report/:inspectionId"
              element={
                 currentUser && (currentUser.role === UserRole.SITE_ENGINEER || currentUser.role === UserRole.ADMIN) && currentUser.status === 'approved' ? (
                  <SingleReportPage />
                ) : (
                  <Navigate to="/signin" />
                )
              }
            />

            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                currentUser && currentUser.role === UserRole.ADMIN && currentUser.status === 'approved' ? (
                  <AdminProvider>
                    <AdminLayout /> 
                  </AdminProvider>
                ) : (
                  <Navigate to="/signin" />
                )
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="client-management" element={<AdminClientManagementPage />} />
              <Route path="clients" element={<AdminClientOverviewPage />} />
              <Route path="activity" element={<AdminLoginActivityPage />} />
              <Route path="edit-report/:inspectionId" element={<AdminEditInspectionPage />} />
            </Route>
            
            <Route path="*" element={<Navigate to={commonRedirectPath()} />} />
          </Routes>
        </main>
        <footer className="text-center p-3 sm:p-4 bg-slate-200 text-slate-600 text-xs sm:text-sm border-t border-slate-300 dark:bg-gray-800 dark:text-slate-400 dark:border-gray-700">
          © 2025 NAFA Entech Solutionz. All rights reserved.
        </footer>
      </div>
    </HashRouter>
  );
};

export default App;