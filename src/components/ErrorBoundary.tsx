import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      errorInfo: errorInfo.componentStack || undefined,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in duration-500">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <AlertTriangle className="text-white" size={40} />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Oops! Something went wrong
            </h1>

            {/* Message */}
            <p className="text-center text-gray-600 mb-6">
              The application encountered an unexpected error. This might be due to:
            </p>

            {/* Possible Causes */}
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2 bg-gray-50 p-4 rounded-lg">
              <li>Network connectivity issues</li>
              <li>Database configuration problems</li>
              <li>Missing required data</li>
              <li>Browser compatibility issues</li>
            </ul>

            {/* Error Details (if in development) */}
            {this.state.error && process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-semibold text-red-800 mb-2">Error Details:</p>
                <pre className="text-xs text-red-700 overflow-auto max-h-40">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
              >
                <RefreshCw size={20} />
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
              >
                <Home size={20} />
                Go to Home
              </button>
            </div>

            {/* Support Message */}
            <p className="text-center text-sm text-gray-500 mt-6">
              If the problem persists, please contact system support
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
