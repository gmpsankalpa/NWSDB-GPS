import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ScrollToTop } from './components/ScrollToTop';
import { NavigationProgress } from './components/NavigationProgress';
import { PerformanceMonitor, ResourcePreconnect } from './components/PerformanceMonitor';
import { FirestoreConnectionMonitor } from './components/FirestoreConnectionMonitor';
import { Loader2, Droplets } from 'lucide-react';
import { ROLES } from './lib/offices';

// Lazy load page components for code splitting
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DeveloperDashboard = lazy(() => import('./pages/DeveloperDashboard'));
const ApplicationDetails = lazy(() => import('./pages/ApplicationDetails'));
const Reports = lazy(() => import('./pages/Reports'));
const Maps = lazy(() => import('./pages/MapViewPage'));
const MapViewPage = lazy(() => import('./pages/MapViewPage'));
const CategoryManagement = lazy(() => import('./pages/CategoryManagement'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Settings = lazy(() => import('./pages/Settings'));
const SystemLog = lazy(() => import('./pages/SystemLog'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AboutNWSDB = lazy(() => import('./pages/AboutNWSDB'));
const TermsConditions = lazy(() => import('./pages/TermsConditions'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));

// Loading component for lazy-loaded routes
function RouteLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-gradient-to-br from-nwsdbBlue to-blue-700 rounded-full flex items-center justify-center shadow-lg mb-4 animate-pulse mx-auto">
          <Droplets className="text-white" size={32} />
        </div>
        <Loader2 className="animate-spin mx-auto mb-2 text-blue-600" size={24} />
        <p className="text-sm font-medium text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Protected route wrapper component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-gradient-to-br from-nwsdbBlue to-blue-700 rounded-full flex items-center justify-center shadow-2xl mb-6 animate-pulse mx-auto">
            <Droplets className="text-white" size={40} />
          </div>
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={32} />
          <p className="text-lg font-semibold text-gray-700">Loading NWSDB System...</p>
          <p className="text-sm text-gray-500 mt-1">Please wait</p>
        </div>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

// Public route wrapper (redirects to appropriate dashboard if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-gradient-to-br from-nwsdbBlue to-blue-700 rounded-full flex items-center justify-center shadow-2xl mb-6 animate-pulse mx-auto">
            <Droplets className="text-white" size={40} />
          </div>
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={32} />
          <p className="text-lg font-semibold text-gray-700">Loading NWSDB System...</p>
          <p className="text-sm text-gray-500 mt-1">Please wait</p>
        </div>
      </div>
    );
  }
  
  if (!user) return <>{children}</>;
  
  // Redirect to appropriate dashboard based on role
  if (user.role === ROLES.DEVELOPER) {
    return <Navigate to="/developer" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

// Preload critical routes for faster navigation
function usePreloadRoutes() {
  const location = useLocation();
  
  useEffect(() => {
    // Preload common routes based on current location
    if (location.pathname === '/' || location.pathname === '/login') {
      // Preload dashboard when on login page
      import('./pages/Dashboard');
    } else if (location.pathname === '/dashboard') {
      // Preload frequently accessed pages from dashboard
      import('./pages/ApplicationDetails');
      import('./pages/MapViewPage');
      import('./pages/CategoryManagement');
    }
  }, [location.pathname]);
}

function AppRoutes() {
  return (
    <Router>
      <ScrollToTop />
      <NavigationProgress />
      <PerformanceMonitor />
      <ResourcePreconnect />
      <RoutePreloader />
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/developer" element={<ProtectedRoute><DeveloperDashboard /></ProtectedRoute>} />
          <Route path="/map" element={<ProtectedRoute><MapViewPage /></ProtectedRoute>} />
          <Route path="/maps" element={<ProtectedRoute><Maps /></ProtectedRoute>} />
          <Route path="/categories" element={<ProtectedRoute><CategoryManagement /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/system-log" element={<ProtectedRoute><SystemLog /></ProtectedRoute>} />
          <Route path="/application/:id" element={<ProtectedRoute><ApplicationDetails /></ProtectedRoute>} />
          <Route path="/connections/:id" element={<ProtectedRoute><ApplicationDetails /></ProtectedRoute>} />
          <Route path="/about" element={<AboutNWSDB />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

// Component to trigger route preloading
function RoutePreloader() {
  usePreloadRoutes();
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <OfflineIndicator />
      <FirestoreConnectionMonitor />
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
export default App;
