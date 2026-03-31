import { FileText, CheckCircle, AlertTriangle, Scale, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const TermsConditions = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white py-12 sm:py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <FileText className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">Terms & Conditions</h1>
              <p className="text-slate-300 text-sm sm:text-base md:text-lg">NWSDB AquaConnect Platform</p>
            </div>
          </div>
          <p className="text-base sm:text-lg text-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
        {/* Introduction */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="flex items-start gap-3 sm:gap-4 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Introduction</h2>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Welcome to NWSDB AquaConnect. By accessing and using this platform, you agree to be bound by these 
                Terms and Conditions. Please read them carefully before using our services.
              </p>
            </div>
          </div>
        </div>

        {/* Acceptance of Terms */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">1. Acceptance of Terms</h2>
          <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-600">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>By creating an account and using NWSDB AquaConnect, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>These terms apply to all users of the platform including customers, officers, and administrators.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>NWSDB reserves the right to modify these terms at any time. Continued use of the platform constitutes acceptance of updated terms.</p>
            </div>
          </div>
        </div>

        {/* User Accounts */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">2. User Accounts</h2>
          <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-600">
            <p className="font-semibold text-gray-900">Account Registration:</p>
            <ul className="space-y-2 ml-5 list-disc">
              <li>You must provide accurate, complete, and current information during registration.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You must notify NWSDB immediately of any unauthorized access to your account.</li>
              <li>One account per person is permitted. Multiple accounts may be suspended or terminated.</li>
            </ul>
            <p className="font-semibold text-gray-900 mt-4">Account Security:</p>
            <ul className="space-y-2 ml-5 list-disc">
              <li>You are solely responsible for all activities conducted through your account.</li>
              <li>Choose a strong password and do not share it with anyone.</li>
              <li>Log out after each session, especially when using shared or public devices.</li>
            </ul>
          </div>
        </div>

        {/* Service Usage */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-600">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">3. Service Usage</h2>
          <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-600">
            <p className="font-semibold text-gray-900">Permitted Use:</p>
            <ul className="space-y-2 ml-5 list-disc">
              <li>Submit genuine water connection applications with accurate information.</li>
              <li>Track the status of your applications through the platform.</li>
              <li>Communicate with NWSDB officers through official channels.</li>
              <li>Access reports and billing information related to your account.</li>
            </ul>
            <p className="font-semibold text-gray-900 mt-4">Prohibited Activities:</p>
            <ul className="space-y-2 ml-5 list-disc">
              <li>Submitting false, misleading, or fraudulent information.</li>
              <li>Attempting to gain unauthorized access to the system or other accounts.</li>
              <li>Using the platform for any illegal or unauthorized purpose.</li>
              <li>Interfering with the proper functioning of the platform.</li>
              <li>Transmitting malware, viruses, or harmful code.</li>
            </ul>
          </div>
        </div>

        {/* Application Process */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">4. Application Process</h2>
          <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-600">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p>Applications are subject to verification and approval by NWSDB officers.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p>Processing times may vary based on location, technical feasibility, and workload.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p>NWSDB reserves the right to reject applications that do not meet technical or regulatory requirements.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p>Application fees, connection charges, and deposits are non-refundable once work has commenced.</p>
            </div>
          </div>
        </div>

        {/* Data Privacy */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-800">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">5. Data Privacy & Security</h2>
          <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-600">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>NWSDB collects and processes personal data in accordance with our Privacy Policy.</p>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>Your information is stored securely and used only for providing water supply services.</p>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>We implement industry-standard security measures to protect your data.</p>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>Personal information will not be shared with third parties except as required by law.</p>
            </div>
          </div>
        </div>

        {/* Liability & Disclaimers */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-900">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">6. Liability & Disclaimers</h2>
          <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-600">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 mb-2">Service Availability:</p>
                  <p className="text-amber-800">
                    While we strive to maintain 24/7 platform availability, NWSDB does not guarantee uninterrupted 
                    access. The platform may be temporarily unavailable due to maintenance, upgrades, or technical issues.
                  </p>
                </div>
              </div>
            </div>
            <ul className="space-y-2 ml-5 list-disc">
              <li>NWSDB is not liable for delays caused by circumstances beyond our control.</li>
              <li>Users are responsible for ensuring their devices and internet connections are secure.</li>
              <li>NWSDB is not responsible for data loss due to user error or device failure.</li>
              <li>The platform is provided "as is" without warranties of any kind.</li>
            </ul>
          </div>
        </div>

        {/* Termination */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1000">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">7. Account Termination</h2>
          <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-600">
            <p>NWSDB reserves the right to suspend or terminate accounts that:</p>
            <ul className="space-y-2 ml-5 list-disc">
              <li>Violate these Terms and Conditions</li>
              <li>Engage in fraudulent or illegal activities</li>
              <li>Provide false or misleading information</li>
              <li>Abuse platform resources or functionality</li>
              <li>Remain inactive for an extended period</li>
            </ul>
            <p className="mt-4">Users may request account deletion by contacting customer support at any time.</p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1100">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Questions About These Terms?</h2>
          <p className="text-slate-200 text-sm sm:text-base mb-4">
            If you have any questions or concerns about these Terms and Conditions, please contact us:
          </p>
          <div className="space-y-2 text-sm sm:text-base">
            <p><strong>Email:</strong> legal@waterboard.lk</p>
            <p><strong>Phone:</strong> 1939 (24/7 Hotline)</p>
            <p><strong>Address:</strong> National Water Supply & Drainage Board, Galle Road, Ratmalana, Sri Lanka</p>
          </div>
        </div>

        {/* Back Button */}
        <div className="flex justify-center animate-in fade-in duration-700 delay-1200">
          <button
            onClick={() => navigate('/')}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 text-sm sm:text-base"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
};

export default TermsConditions;
