import { useEffect, useState } from 'react';
import { enableNetwork } from 'firebase/firestore';
import { db } from '../firebase';
import { AlertCircle, Database } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * FirestoreConnectionMonitor component
 * Monitors Firestore connection health and displays status to user
 */
export const FirestoreConnectionMonitor = () => {
  const [errorCount, setErrorCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Listen for Firestore errors via console
    const originalConsoleError = console.error;
    let errorToastShown = false;

    console.error = function (...args) {
      // Check if this is a Firestore error
      const errorMessage = args.join(' ');
      
      if (errorMessage.includes('firestore') || 
          errorMessage.includes('Firestore') ||
          errorMessage.includes('FIRESTORE') ||
          errorMessage.includes('WebChannel') ||
          errorMessage.includes('channel?')) {
        
        setErrorCount(prev => prev + 1);

        // Show warning after multiple errors
        if (errorCount >= 2 && !errorToastShown) {
          errorToastShown = true;
          setShowWarning(true);
          
          // Check if it's specifically an index error
          if (errorMessage.includes('index') || 
              errorMessage.includes('failed-precondition') ||
              errorMessage.includes('400')) {
            
            if (import.meta.env.DEV) {
              toast(() => (
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Firestore Index Missing</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Real-time updates are limited. Check console for details.
                    </p>
                  </div>
                </div>
              ), {
                duration: 6000,
                icon: '⚠️',
              });
            }
          }
        }
      }
      
      // Call original console.error
      originalConsoleError.apply(console, args);
    };

    // Restore original console.error on cleanup
    return () => {
      console.error = originalConsoleError;
    };
  }, [errorCount]);

  // Auto-hide warning after a delay
  useEffect(() => {
    if (showWarning) {
      const timer = setTimeout(() => {
        setShowWarning(false);
        setErrorCount(0);
      }, 30000); // Hide after 30 seconds

      return () => clearTimeout(timer);
    }
  }, [showWarning]);

  // Don't render anything in production or if no errors
  if (!import.meta.env.DEV || !showWarning) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-[9998] animate-in slide-in-from-right duration-300">
      <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg shadow-lg max-w-sm p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-orange-900 mb-1">
              Database Index Warning
            </h3>
            <p className="text-xs text-orange-800 leading-relaxed">
              Some Firestore indexes are missing. Real-time updates may be limited. 
              The application will continue to work with manual refreshes.
            </p>
            <button
              onClick={() => setShowWarning(false)}
              className="mt-2 text-xs text-orange-700 hover:text-orange-900 font-medium underline"
            >
              Dismiss
            </button>
          </div>
          <button
            onClick={() => setShowWarning(false)}
            className="text-orange-400 hover:text-orange-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Simple hook to check Firestore connection status
 */
export const useFirestoreConnection = () => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Monitor network state
    const handleOnline = () => {
      setIsConnected(true);
      enableNetwork(db).catch(console.error);
    };

    const handleOffline = () => {
      setIsConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isConnected };
};
