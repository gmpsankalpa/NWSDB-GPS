import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * PerformanceMonitor component
 * Tracks page navigation performance and logs metrics
 */
export const PerformanceMonitor = () => {
  const location = useLocation();

  useEffect(() => {
    // Measure page load time
    const markName = `route-${location.pathname}`;
    performance.mark(markName);

    // Log navigation timing
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigationTiming) {
        const pageLoadTime = navigationTiming.loadEventEnd - navigationTiming.fetchStart;
        const domInteractive = navigationTiming.domInteractive - navigationTiming.fetchStart;
        
        // Only log in development
        if (import.meta.env.DEV) {
          console.log(`📊 Navigation Performance (${location.pathname}):`, {
            pageLoadTime: `${pageLoadTime.toFixed(2)}ms`,
            domInteractive: `${domInteractive.toFixed(2)}ms`,
          });
        }
      }
    }

    // Cleanup old marks to prevent memory leaks
    return () => {
      try {
        performance.clearMarks(markName);
      } catch (e) {
        // Ignore errors
      }
    };
  }, [location.pathname]);

  return null;
};

/**
 * Preconnect to critical domains for faster resource loading
 */
export const ResourcePreconnect = () => {
  useEffect(() => {
    // Preconnect to Firebase domains
    const domains = [
      'https://firestore.googleapis.com',
      'https://firebase.googleapis.com',
      'https://storage.googleapis.com',
    ];

    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }, []);

  return null;
};
