import { type ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface PageErrorBoundaryProps {
  children: ReactNode;
  pageName?: string;
}

function PageErrorFallback({ pageName }: { pageName?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="text-red-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {pageName ? `Error loading ${pageName}` : 'Page Error'}
        </h2>
        <p className="text-gray-600 mb-6">
          This page encountered an error. This might be temporary.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors mx-auto"
        >
          <RefreshCw size={20} />
          Reload Page
        </button>
      </div>
    </div>
  );
}

export function PageErrorBoundary({ children, pageName }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary fallback={<PageErrorFallback pageName={pageName} />}>
      {children}
    </ErrorBoundary>
  );
}
