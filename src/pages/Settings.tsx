import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Bell, BellOff, Mail, MessageSquare, FileText, Save, Loader2, Shield, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

interface NotificationSettings {
  newReviews: boolean;
  newApplications: boolean;
  applicationUpdates: boolean;
  emailNotifications: boolean;
  browserNotifications: boolean;
}

const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    newReviews: true,
    newApplications: true,
    applicationUpdates: true,
    emailNotifications: false,
    browserNotifications: false
  });
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;

      try {
        const userId = user.id || (auth.currentUser ? auth.currentUser.uid : undefined);
        if (!userId) return;

        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.notificationSettings) {
            setSettings(userData.notificationSettings);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  // Check browser notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const requestBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      
      if (permission === 'granted') {
        toast.success('Browser notifications enabled');
        setSettings(prev => ({ ...prev, browserNotifications: true }));
      } else if (permission === 'denied') {
        toast.error('Browser notifications denied');
        setSettings(prev => ({ ...prev, browserNotifications: false }));
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const userId = user.id || (auth.currentUser ? auth.currentUser.uid : undefined);
    if (!userId) {
      toast.error('User ID not found');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        notificationSettings: settings,
        updatedAt: new Date().toISOString()
      });
      
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-2 sm:p-2.5 lg:p-3 bg-blue-100 rounded-xl flex-shrink-0">
              <Shield size={24} className="sm:w-7 sm:h-7 lg:w-7 lg:h-7 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Settings</h1>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600 truncate">Manage your notification preferences and account settings</p>
            </div>
          </div>
        </div>

        {/* Notification Settings Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <Bell size={20} className="sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">Notification Preferences</h2>
              <p className="text-xs sm:text-sm text-gray-600 truncate">Choose what notifications you want to receive</p>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {/* New Reviews Notification */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                  <MessageSquare size={18} className="sm:w-5 sm:h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900">New Customer Reviews</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Get notified when customers submit new reviews</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('newReviews')}
                className={cn(
                  "relative w-14 h-7 rounded-full transition-all duration-200 flex-shrink-0 active:scale-95 ml-auto sm:ml-0",
                  settings.newReviews ? "bg-green-500" : "bg-gray-300"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm",
                    settings.newReviews && "transform translate-x-7"
                  )}
                />
              </button>
            </div>

            {/* New Applications Notification */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <FileText size={18} className="sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900">New Applications</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Get notified when new applications are submitted</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('newApplications')}
                className={cn(
                  "relative w-14 h-7 rounded-full transition-all duration-200 flex-shrink-0 active:scale-95 ml-auto sm:ml-0",
                  settings.newApplications ? "bg-green-500" : "bg-gray-300"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm",
                    settings.newApplications && "transform translate-x-7"
                  )}
                />
              </button>
            </div>

            {/* Application Updates Notification */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg flex-shrink-0">
                  <Clock size={18} className="sm:w-5 sm:h-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900">Application Status Updates</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Get notified when applications are updated</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('applicationUpdates')}
                className={cn(
                  "relative w-14 h-7 rounded-full transition-all duration-200 flex-shrink-0 active:scale-95 ml-auto sm:ml-0",
                  settings.applicationUpdates ? "bg-green-500" : "bg-gray-300"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm",
                    settings.applicationUpdates && "transform translate-x-7"
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Delivery Method Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Mail size={20} className="sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">Notification Delivery</h2>
              <p className="text-xs sm:text-sm text-gray-600 truncate">Choose how you want to receive notifications</p>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {/* Email Notifications */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
                  <Mail size={18} className="sm:w-5 sm:h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900">Email Notifications</h3>
                  <p className="text-xs sm:text-sm text-gray-600 break-all">Receive notifications via email to {user.email}</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('emailNotifications')}
                className={cn(
                  "relative w-14 h-7 rounded-full transition-all duration-200 flex-shrink-0 active:scale-95 ml-auto sm:ml-0",
                  settings.emailNotifications ? "bg-green-500" : "bg-gray-300"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm",
                    settings.emailNotifications && "transform translate-x-7"
                  )}
                />
              </button>
            </div>

            {/* Browser Notifications */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="p-1.5 sm:p-2 bg-indigo-100 rounded-lg flex-shrink-0">
                  <Bell size={18} className="sm:w-5 sm:h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900">Browser Notifications</h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {browserPermission === 'granted' 
                      ? 'Browser notifications are enabled'
                      : browserPermission === 'denied'
                      ? 'Browser notifications are blocked. Please enable them in your browser settings.'
                      : 'Enable browser push notifications'
                    }
                  </p>
                </div>
              </div>
              {browserPermission === 'granted' ? (
                <button
                  onClick={() => handleToggle('browserNotifications')}
                  className={cn(
                    "relative w-14 h-7 rounded-full transition-all duration-200 flex-shrink-0 active:scale-95 ml-auto sm:ml-0",
                    settings.browserNotifications ? "bg-green-500" : "bg-gray-300"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm",
                      settings.browserNotifications && "transform translate-x-7"
                    )}
                  />
                </button>
              ) : browserPermission === 'denied' ? (
                <button
                  disabled
                  className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm flex-shrink-0 ml-auto sm:ml-0"
                >
                  <BellOff size={14} className="sm:w-4 sm:h-4" />
                  Blocked
                </button>
              ) : (
                <button
                  onClick={requestBrowserNotifications}
                  className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-transform active:scale-95 font-medium text-xs sm:text-sm flex-shrink-0 ml-auto sm:ml-0 whitespace-nowrap"
                >
                  Enable
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
          <div className="flex items-start gap-2 sm:gap-3">
            <CheckCircle size={18} className="sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-blue-800 flex-1 min-w-0">
              <p className="font-semibold mb-1">About Notifications</p>
              <p>
                Notifications help you stay updated with important events in the system. You can customize which 
                notifications you want to receive and how you want to receive them. Changes take effect immediately 
                after saving.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700",
              "text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-lg transition-all text-sm sm:text-base",
              "disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 w-full sm:w-auto"
            )}
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} className="sm:w-5 sm:h-5" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
