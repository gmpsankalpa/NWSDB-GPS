import { useNavigate } from 'react-router-dom';

/**
 * Custom hook for optimized navigation with smooth scrolling
 */
export const useSmoothNavigate = () => {
  const navigate = useNavigate();

  const smoothNavigate = (path: string, options?: { replace?: boolean }) => {
    // Scroll to top instantly before navigation
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    
    // Navigate
    navigate(path, options);
  };

  return smoothNavigate;
};

/**
 * Custom hook to prefetch routes on hover for instant navigation
 */
export const usePrefetchRoute = (path: string) => {
  const prefetch = () => {
    // Dynamically import the route component
    const routeMap: Record<string, () => Promise<any>> = {
      '/dashboard': () => import('../pages/Dashboard'),
      '/developer': () => import('../pages/DeveloperDashboard'),
      '/maps': () => import('../pages/Maps'),
      '/reports': () => import('../pages/Reports'),
      '/users': () => import('../pages/UserManagement'),
      '/settings': () => import('../pages/Settings'),
      '/qr-scanner': () => import('../pages/QRScanner'),
      '/system-log': () => import('../pages/SystemLog'),
      '/login': () => import('../pages/Login'),
      '/about': () => import('../pages/AboutNWSDB'),
      '/terms': () => import('../pages/TermsConditions'),
      '/privacy': () => import('../pages/PrivacyPolicy'),
    };

    const importFn = routeMap[path];
    if (importFn) {
      importFn().catch(() => {
        // Silently fail - prefetch is optional
      });
    }
  };

  return prefetch;
};

/**
 * Optimize link component with prefetching
 */
interface OptimizedLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const OptimizedLink: React.FC<OptimizedLinkProps> = ({ 
  to, 
  children, 
  className,
  onClick 
}) => {
  const navigate = useSmoothNavigate();
  const prefetch = usePrefetchRoute(to);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.();
    navigate(to);
  };

  return (
    <a
      href={to}
      className={className}
      onClick={handleClick}
      onMouseEnter={prefetch}
      onTouchStart={prefetch}
    >
      {children}
    </a>
  );
};
