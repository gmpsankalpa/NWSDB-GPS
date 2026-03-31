import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search, Droplets } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Animated 404 */}
        <div className="relative mb-8">
          <div className="text-[150px] sm:text-[200px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 leading-none animate-in zoom-in duration-700">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-nwsdbBlue/20 to-purple-600/20 rounded-full flex items-center justify-center animate-pulse">
              <Droplets className="text-nwsdbBlue" size={64} />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-2">
            Oops! The page you're looking for doesn't exist.
          </p>
          <p className="text-gray-500">
            The page might have been moved, deleted, or the URL might be incorrect.
          </p>
        </div>

        {/* Suggestions */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">What can you do?</h2>
          <ul className="text-left space-y-3 text-gray-600">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <span>Check the URL for typos or mistakes</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <span>Go back to the previous page</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <span>Return to the homepage and start again</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all transform hover:scale-105 active:scale-95 shadow-lg border border-gray-200"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-nwsdbBlue to-blue-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
          >
            <Home size={20} />
            Go to Dashboard
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
          >
            <Search size={20} />
            Go to Home
          </button>
        </div>

        {/* Footer Help Text */}
        <div className="mt-8 text-sm text-gray-500 animate-in fade-in duration-700 delay-700">
          <p>Need help? Contact your system administrator</p>
          <p className="mt-1">
            <span className="font-semibold text-nwsdbBlue">NWSDB</span> Water Connection Management System
          </p>
        </div>
      </div>
    </div>
  );
}
