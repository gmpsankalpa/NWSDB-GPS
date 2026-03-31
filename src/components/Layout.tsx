import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { LayoutDashboard, FileText, LogOut, Droplets, Settings, Menu, X, Users, History, Map, Tags } from 'lucide-react';
import { cn } from '../lib/utils';
import Header from './Header';
import Footer from './Footer';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../lib/offices';
import packageJson from '../../package.json';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const NavItem = ({ path, icon: Icon, label }: any) => {
    const isActive = location.pathname === path || location.pathname.startsWith(path);
    
    return (
      <button
        onClick={() => {
          navigate(path);
          setSidebarOpen(false); // Close sidebar on mobile after navigation
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); // Instant scroll to top
        }}
        className={cn(
          "w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200",
          "font-medium relative overflow-hidden group active:scale-95 smooth-transition",
          isActive 
            ? "bg-white text-nwsdbBlue shadow-lg scale-105" 
            : "text-blue-50 hover:bg-blue-700/50 hover:text-white"
        )}
      >
        <Icon size={18} className={cn("sm:w-5 sm:h-5 transition-transform duration-200 flex-shrink-0", isActive && "scale-110")} />
        <span className="text-sm sm:text-base">{label}</span>
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600 rounded-r"></div>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="flex flex-1 bg-gradient-to-br from-gray-50 to-gray-100 relative">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 p-3 sm:p-4 bg-nwsdbBlue text-white rounded-full shadow-2xl hover:bg-blue-700 transition-all active:scale-95"
        >
          {sidebarOpen ? <X size={20} className="sm:w-6 sm:h-6" /> : <Menu size={20} className="sm:w-6 sm:h-6" />}
        </button>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "w-72 bg-gradient-to-b from-nwsdbBlue to-blue-800 shadow-2xl text-white flex flex-col",
          "fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          {/* Logo Section */}
          <div className="p-3 sm:p-4 lg:p-6 flex items-center gap-2.5 sm:gap-3 lg:gap-4 border-b border-blue-700/50">
            <div className="w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Droplets className="text-blue-200" size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg lg:text-xl font-bold tracking-wide truncate">NWSDB GPS Connect</h1>
              <p className="text-[10px] sm:text-xs text-blue-200 font-medium truncate">Connection GPS Management</p>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-3 sm:p-4 lg:p-5 space-y-1.5 sm:space-y-2">
            {user?.role === ROLES.DEVELOPER ? (
              <NavItem path="/developer" icon={LayoutDashboard} label="Developer Dashboard" />
            ) : (
              <NavItem path="/dashboard" icon={LayoutDashboard} label="Dashboard" />
            )}
            <NavItem path="/categories" icon={Tags} label="Categories" />
            <NavItem path="/maps" icon={Map} label="GPS" />
            <NavItem path="/reports" icon={FileText} label="Reports" />
            {(user?.role === ROLES.REGIONAL_ENGINEER || user?.role === ROLES.DEVELOPER) && (
              <NavItem path="/users" icon={Users} label="User Management" />
            )}
            {(user?.role === ROLES.REGIONAL_ENGINEER || user?.role === ROLES.DEVELOPER) && (
              <NavItem path="/system-log" icon={History} label="System Log" />
            )}
          </nav>

          {/* Footer Section */}
          <div className="p-3 sm:p-4 lg:p-5 border-t border-blue-700/50 space-y-1.5 sm:space-y-2">
            <button 
              onClick={() => {
                navigate('/settings');
                setSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 active:scale-95",
                "text-blue-100 hover:bg-blue-700/50 text-sm sm:text-base font-medium",
                location.pathname === '/settings' && "bg-white text-nwsdbBlue"
              )}
            >
              <Settings size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" /> Settings
            </button>
            <button 
              onClick={handleLogout} 
              className={cn(
                "w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 active:scale-95",
                "text-red-200 hover:bg-red-500/20 hover:text-red-100 text-sm sm:text-base font-medium"
              )}
            >
              <LogOut size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" /> Logout
            </button>
            
            {/* Version Display */}
            <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-blue-700/30">
              <div className="text-center text-blue-200/60 text-[10px] sm:text-xs font-medium">
                Version {packageJson.version}
              </div>
              <div className="text-center text-blue-200/40 text-[9px] sm:text-[10px] mt-0.5">
                © 2026 NWSDB
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
};
export default Layout;
