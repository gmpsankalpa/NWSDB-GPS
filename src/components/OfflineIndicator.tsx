import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online! Connection restored.', {
        icon: '🌐',
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('No internet connection', {
        icon: '📡',
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-2 px-4 text-center z-50 shadow-lg">
      <div className="flex items-center justify-center gap-2">
        <WifiOff size={20} />
        <span className="font-semibold">No Internet Connection</span>
      </div>
      <p className="text-xs mt-1">Some features may not work properly</p>
    </div>
  );
}
