import { type ReactNode } from 'react';

/**
 * PageTransition component
 * Wraps page content with smooth fade-in animation
 */
interface PageTransitionProps {
  children: ReactNode;
}

export const PageTransition = ({ children }: PageTransitionProps) => {
  return (
    <div className="animate-in fade-in duration-300">
      {children}
    </div>
  );
};
