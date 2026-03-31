import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Droplets, Mail, Lock, Loader2, Building2, Eye, EyeOff, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { cn } from '../lib/utils';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();

  // Check for session timeout
  useEffect(() => {
    const timeout = searchParams.get('timeout');
    if (timeout === 'true') {
      toast.error('Your session has expired due to inactivity. Please login again.', {
        duration: 5000,
        icon: '⏱️'
      });
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const success = await login(email, password);
      
      if (success) {
        toast.success('Login successful!');
        setTimeout(() => navigate('/dashboard'), 500);
      } else {
        toast.error('Invalid credentials. Please check email and password.');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setResetLoading(true);
    
    try {
      // This will ONLY work with emails registered in Firebase Authentication
      // Firebase Auth will reject emails that don't exist in the system
      await sendPasswordResetEmail(auth, resetEmail);
      
      toast.success('If this email is registered, a password reset link has been sent. Please check your inbox.', {
        duration: 6000
      });
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      if (error.code === 'auth/user-not-found') {
        // Email not registered in Firebase Authentication
        toast.error('This email is not registered in the system. Please contact your administrator.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address format');
      } else if (error.code === 'auth/missing-email') {
        toast.error('Please enter your email address');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Too many password reset attempts. Please try again later.');
      } else if (error.code === 'auth/unauthorized-continue-uri') {
        toast.error('Password reset configuration error. Please contact administrator.');
      } else {
        // For security, use generic message
        toast.error('Unable to process password reset. Please ensure you are using a registered email address.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <Toaster position="top-center" />
      
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 relative overflow-hidden">
        {/* Animated Background Circles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 sm:-top-40 -left-20 sm:-left-40 w-48 h-48 sm:w-96 sm:h-96 bg-blue-300 rounded-full opacity-20 blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-20 sm:-bottom-40 -right-20 sm:-right-40 w-48 h-48 sm:w-96 sm:h-96 bg-indigo-300 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

      <div className="w-full max-w-md p-5 sm:p-6 lg:p-8 mx-3 sm:mx-4 my-4 sm:my-6 lg:my-8 bg-white/80 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-2xl border border-white/20 relative z-10 animate-in fade-in zoom-in duration-500">
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-nwsdbBlue to-blue-700 rounded-full flex items-center justify-center shadow-lg mb-3 sm:mb-4">
            <Droplets className="text-white" size={28} />
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent mb-1 text-center px-2">NWSDB GPS Connect</h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium text-center px-2">Water Connection GPS Management System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
          {/* Email Input */}
          <div className="relative">
            <Mail className="absolute left-3 top-3 sm:top-3.5 text-gray-400 flex-shrink-0" size={16} />
            <input 
              type="email" 
              placeholder="Officer Email" 
              value={email}
              className={cn(
                "w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl",
                "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                "outline-none transition-all duration-200",
                "bg-white/50 backdrop-blur-sm text-base"
              )}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 sm:top-3.5 text-gray-400 flex-shrink-0" size={16} />
            <input 
              type={showPassword ? "text" : "password"}
              placeholder="Password" 
              value={password}
              className={cn(
                "w-full pl-9 sm:pl-10 pr-11 sm:pr-12 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl",
                "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                "outline-none transition-all duration-200",
                "bg-white/50 backdrop-blur-sm text-base"
              )}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 sm:top-3.5 text-gray-400 hover:text-gray-600 active:scale-95 transition"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={loading}
            className={cn(
              "w-full bg-gradient-to-r from-nwsdbBlue to-blue-700",
              "text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base",
              "hover:shadow-lg active:scale-[0.98] transition-all duration-200",
              "flex items-center justify-center gap-2",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin flex-shrink-0" size={16} />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <Building2 className="flex-shrink-0" size={16} />
                <span>Login to System</span>
              </>
            )}
          </button>
        </form>

        {/* Forgot Password Link - Available for all users */}
        <div className="text-center mt-3 sm:mt-4">
          <button
            onClick={() => setShowForgotPassword(true)}
            className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline active:scale-95 transition"
          >
            Forgot Password?
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-4 sm:mt-6 p-2.5 sm:p-3 bg-orange-50/50 backdrop-blur-sm rounded-lg border border-orange-200/50">
          <p className="text-[10px] sm:text-xs text-orange-800 font-medium mb-1">🔒 Security Notice</p>
          <p className="text-[10px] sm:text-xs text-orange-700">
            Your session will expire after 30 minutes of inactivity or when you close this browser tab/window. 
            You'll need to login again for security.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] sm:text-xs text-gray-500 mt-4 sm:mt-6">
          National Water Supply & Drainage Board
        </p>
      </div>
      </div>
      
      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 relative animate-in fade-in zoom-in duration-200">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setResetEmail('');
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 active:scale-95 transition"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-5 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                <Lock className="text-blue-600" size={20} />
              </div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-2">Reset Password</h3>
              <p className="text-xs sm:text-sm text-gray-600 px-2">
                Enter your email address and we'll send you a link to reset your password
              </p>
            </div>

            {/* Reset Form */}
            <form onSubmit={handlePasswordReset} className="space-y-3 sm:space-y-4">
              {/* Info Notice */}
              <div className="p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-[10px] sm:text-xs text-blue-800">
                  <strong>Note:</strong> Password reset only works for email addresses that are registered in the system. 
                  If you don't receive an email, your address may not be registered. Please contact your administrator.
                </p>
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-3 sm:top-3.5 text-gray-400 flex-shrink-0" size={16} />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className={cn(
                    "w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl",
                    "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                    "outline-none transition-all text-base"
                  )}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className={cn(
                  "w-full bg-gradient-to-r from-blue-600 to-blue-700",
                  "text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base",
                  "hover:shadow-lg active:scale-[0.98] transition-all",
                  "flex items-center justify-center gap-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                )}
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="animate-spin flex-shrink-0" size={16} />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Mail className="flex-shrink-0" size={16} />
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
};
export default Login;
