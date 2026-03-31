import { useNavigate, useLocation } from 'react-router-dom';
import { Droplets, LogOut, User, ChevronDown, Mail, Building2, Shield, LayoutDashboard, Users as UsersIcon, FileText, Bell, Clock, X, Map as MapIcon, Tags } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import toast from 'react-hot-toast';
import { useState, useRef, useEffect } from 'react';
import { ROLES } from '../lib/offices';
import { cn } from '../lib/utils';
import { formatDistance } from 'date-fns';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
    setShowNotifications(false);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-all active:scale-95 flex-shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
              <Droplets className="text-white" size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base lg:text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent truncate">
                NWSDB GPS Connect
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-600 hidden sm:block">Water Connection GPS Management</p>
            </div>
          </button>

          {/* Navigation Tabs (only show when logged in) */}
          {user && (
            <nav className="hidden md:flex items-center gap-2">
              {user.role === ROLES.DEVELOPER ? (
                <button
                  onClick={() => navigate('/developer')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                    location.pathname === '/developer'
                      ? "bg-blue-100 text-blue-700 shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <LayoutDashboard size={18} />
                  <span>Developer</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate('/dashboard')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                    location.pathname === '/dashboard'
                      ? "bg-blue-100 text-blue-700 shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </button>
              )}

              <button
                onClick={() => navigate('/map')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                  location.pathname === '/map'
                    ? "bg-blue-100 text-blue-700 shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <MapIcon size={18} />
                <span>Map</span>
              </button>

              <button
                onClick={() => navigate('/reports')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                  location.pathname === '/reports'
                    ? "bg-blue-100 text-blue-700 shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <FileText size={18} />
                <span>Reports</span>
              </button>

              {(user.role === ROLES.REGIONAL_ENGINEER || user.role === ROLES.DEVELOPER) && (
                <>
                  <button
                    onClick={() => navigate('/categories')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                      location.pathname === '/categories'
                        ? "bg-blue-100 text-blue-700 shadow-sm"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Tags size={18} />
                    <span>Categories</span>
                  </button>
                  
                  <button
                    onClick={() => navigate('/users')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                      location.pathname === '/users'
                        ? "bg-blue-100 text-blue-700 shadow-sm"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <UsersIcon size={18} />
                    <span>Users</span>
                  </button>
                </>
              )}
            </nav>
          )}

          {/* Right section */}
          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
              {/* Notification Bell */}
              <div className="relative" ref={notificationMenuRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 sm:p-2.5 hover:bg-gray-100 rounded-lg transition-transform active:scale-95"
                >
                  <Bell size={18} className="sm:w-5 sm:h-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <>
                    {/* Mobile Backdrop */}
                    <div 
                      className="sm:hidden fixed inset-0 bg-black/30 z-40" 
                      onClick={() => setShowNotifications(false)}
                    />
                    
                    <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 mt-2 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 max-h-[80vh] sm:max-h-[500px] flex flex-col">
                      {/* Header */}
                      <div className="p-3 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">Notifications</h3>
                            <p className="text-[10px] sm:text-xs text-gray-600">
                              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2">
                            {unreadCount > 0 && (
                              <button
                                onClick={markAllAsRead}
                                className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap active:scale-95 transition-transform px-2 py-1 rounded-lg hover:bg-blue-100"
                              >
                                Mark all read
                              </button>
                            )}
                            <button
                              onClick={() => setShowNotifications(false)}
                              className="sm:hidden p-1.5 hover:bg-white/50 rounded-lg transition-colors active:scale-95"
                              aria-label="Close notifications"
                            >
                              <X size={16} className="text-gray-600" />
                            </button>
                          </div>
                        </div>
                      </div>

                    {/* Notifications List */}
                    <div className="overflow-y-auto flex-1 overscroll-contain">
                      {notifications.length === 0 ? (
                        <div className="p-6 sm:p-8 text-center text-gray-400">
                          <Bell size={40} className="sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-50" />
                          <p className="font-medium text-sm sm:text-base">No notifications yet</p>
                          <p className="text-xs sm:text-sm">You'll see notifications here</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {notifications.slice(0, 10).map((notification) => (
                            <button
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification)}
                              className={cn(
                                "w-full p-3 sm:p-4 text-left hover:bg-gray-50 transition-all active:scale-[0.99]",
                                !notification.read && "bg-blue-50/50 border-l-2 border-l-blue-500"
                              )}
                            >
                              <div className="flex items-start gap-2 sm:gap-3">
                                <div className={cn(
                                  "w-2 h-2 rounded-full mt-1.5 sm:mt-2 flex-shrink-0",
                                  !notification.read ? "bg-blue-500" : "bg-transparent"
                                )} />
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-xs sm:text-sm text-gray-900 mb-0.5 sm:mb-1",
                                    !notification.read && "font-semibold"
                                  )}>
                                    {notification.title}
                                  </p>
                                  <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-500">
                                    <Clock size={10} className="sm:w-3 sm:h-3 flex-shrink-0" />
                                    <span className="truncate">{formatDistance(notification.timestamp, new Date(), { addSuffix: true })}</span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="p-2 sm:p-3 border-t border-gray-200 bg-gray-50">
                        <button
                          onClick={() => {
                            setShowNotifications(false);
                            navigate('/dashboard');
                          }}
                          className="w-full text-center text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium py-2 sm:py-2.5 rounded-lg hover:bg-blue-50 active:scale-95 transition-all"
                        >
                          View all notifications
                        </button>
                      </div>
                    )}
                  </div>
                  </>
                )}
              </div>

              {/* Profile Menu */}
              <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-transform active:scale-95 border border-blue-200"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={14} className="sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="hidden sm:block text-left min-w-0">
                  <p className="text-[10px] text-gray-600">Logged in as</p>
                  <p className="text-xs sm:text-sm font-semibold text-gray-800 leading-none truncate max-w-[120px]">{user.name}</p>
                </div>
                <ChevronDown size={14} className={`sm:w-4 sm:h-4 text-gray-600 transition-transform flex-shrink-0 ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-[90vw] sm:w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                  {/* Mobile Navigation */}
                  <div className="md:hidden border-b border-gray-200 p-2 sm:p-3">
                    <p className="text-[10px] sm:text-xs text-gray-500 font-semibold mb-2 px-2">Navigation</p>
                    <div className="space-y-1">
                      {user.role === ROLES.DEVELOPER ? (
                        <button
                          onClick={() => {
                            navigate('/developer');
                            setShowProfileMenu(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all text-left active:scale-[0.98]",
                            location.pathname === '/developer'
                              ? "bg-blue-100 text-blue-700"
                              : "text-gray-700 hover:bg-gray-100"
                          )}
                        >
                          <LayoutDashboard size={16} className="sm:w-[18px] sm:h-[18px]" />
                          <span>Developer Dashboard</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            navigate('/dashboard');
                            setShowProfileMenu(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all text-left active:scale-[0.98]",
                            location.pathname === '/dashboard'
                              ? "bg-blue-100 text-blue-700"
                              : "text-gray-700 hover:bg-gray-100"
                          )}
                        >
                          <LayoutDashboard size={16} className="sm:w-[18px] sm:h-[18px]" />
                          <span>Dashboard</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          navigate('/reports');
                          setShowProfileMenu(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all text-left active:scale-[0.98]",
                          location.pathname === '/reports'
                            ? "bg-blue-100 text-blue-700"
                            : "text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <FileText size={16} className="sm:w-[18px] sm:h-[18px]" />
                        <span>Reports</span>
                      </button>

                      {(user.role === ROLES.REGIONAL_ENGINEER || user.role === ROLES.DEVELOPER) && (
                        <button
                          onClick={() => {
                            navigate('/users');
                            setShowProfileMenu(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all text-left active:scale-[0.98]",
                            location.pathname === '/users'
                              ? "bg-blue-100 text-blue-700"
                              : "text-gray-700 hover:bg-gray-100"
                          )}
                        >
                          <UsersIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
                          <span>User Management</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Profile Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 sm:p-4 text-white">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                        <User size={20} className="sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base sm:text-lg truncate">{user.name}</p>
                        <p className="text-[10px] sm:text-xs text-blue-100 truncate">{user.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* Profile Details */}
                  <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <div className="flex items-start gap-2 sm:gap-3 p-2 bg-gray-50 rounded-lg">
                      <Mail size={14} className="sm:w-4 sm:h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Email Address</p>
                        <p className="text-xs sm:text-sm font-medium text-gray-800 break-all">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 sm:gap-3 p-2 bg-gray-50 rounded-lg">
                      <Building2 size={14} className="sm:w-4 sm:h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Office Location</p>
                        <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{user.office}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 sm:gap-3 p-2 bg-gray-50 rounded-lg">
                      <Shield size={14} className="sm:w-4 sm:h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Role & Permissions</p>
                        <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{user.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <div className="border-t border-gray-200 p-2 sm:p-3">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleLogout();
                      }}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-transform active:scale-95 font-medium text-xs sm:text-sm flex items-center justify-center gap-2"
                    >
                      <LogOut size={14} className="sm:w-4 sm:h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-transform active:scale-95 font-medium text-xs sm:text-sm whitespace-nowrap"
            >
              <span className="hidden sm:inline">Officer Login</span>
              <span className="sm:hidden">Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
