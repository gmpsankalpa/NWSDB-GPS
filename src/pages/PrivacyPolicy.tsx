import { Shield, Eye, Lock, Database, UserCheck, AlertCircle, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white py-12 sm:py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Shield className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">Privacy Policy</h1>
              <p className="text-emerald-100 text-sm sm:text-base md:text-lg">Your Privacy, Our Priority</p>
            </div>
          </div>
          <p className="text-base sm:text-lg text-emerald-50 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
        {/* Introduction */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="flex items-start gap-3 sm:gap-4 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Introduction</h2>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                The National Water Supply & Drainage Board (NWSDB) is committed to protecting your privacy and 
                ensuring the security of your personal information. This Privacy Policy explains how we collect, 
                use, store, and protect your data when you use the NWSDB AquaConnect platform.
              </p>
            </div>
          </div>
        </div>

        {/* Data We Collect */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">1. Information We Collect</h2>
          <div className="space-y-4 sm:space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-900 text-base sm:text-lg">Personal Information</h3>
              </div>
              <ul className="space-y-2 ml-7 text-sm sm:text-base text-gray-600 list-disc">
                <li>Full name, National Identity Card (NIC) number</li>
                <li>Contact details (email address, phone number, postal address)</li>
                <li>Property information (location, GPS coordinates, maps)</li>
                <li>Payment and billing information</li>
                <li>Government-issued identification documents</li>
              </ul>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-teal-600" />
                <h3 className="font-semibold text-gray-900 text-base sm:text-lg">Technical Information</h3>
              </div>
              <ul className="space-y-2 ml-7 text-sm sm:text-base text-gray-600 list-disc">
                <li>IP address, browser type, and device information</li>
                <li>Login timestamps and activity logs</li>
                <li>Cookies and tracking technologies</li>
                <li>Application usage patterns and preferences</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900 text-base sm:text-lg">Application Information</h3>
              </div>
              <ul className="space-y-2 ml-7 text-sm sm:text-base text-gray-600 list-disc">
                <li>Water connection application details</li>
                <li>Site survey information and photographs</li>
                <li>Communication history with NWSDB officers</li>
                <li>Customer reviews and feedback</li>
              </ul>
            </div>
          </div>
        </div>

        {/* How We Use Data */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">2. How We Use Your Information</h2>
          <div className="space-y-3 text-sm sm:text-base text-gray-600">
            <p className="font-semibold text-gray-900">We use your personal information to:</p>
            <ul className="space-y-2 ml-5 list-disc">
              <li><strong>Process Applications:</strong> Verify identity, assess eligibility, and process water connection requests.</li>
              <li><strong>Service Delivery:</strong> Install water connections, provide customer support, and manage billing.</li>
              <li><strong>Communication:</strong> Send notifications, updates, and important information about your account.</li>
              <li><strong>Legal Compliance:</strong> Comply with regulatory requirements and respond to legal requests.</li>
              <li><strong>Platform Improvement:</strong> Analyze usage patterns to enhance user experience and system performance.</li>
              <li><strong>Security:</strong> Prevent fraud, unauthorized access, and protect against security threats.</li>
              <li><strong>Record Keeping:</strong> Maintain accurate records for operational and audit purposes.</li>
            </ul>
          </div>
        </div>

        {/* Data Sharing */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-600">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">3. Data Sharing & Disclosure</h2>
          <div className="space-y-4 text-sm sm:text-base text-gray-600">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <p className="font-semibold text-teal-900 mb-2">Data Sharing Policy:</p>
              <p className="text-teal-800">
                NWSDB does not sell, rent, or trade your personal information to third parties for marketing purposes.
              </p>
            </div>
            <p className="font-semibold text-gray-900">We may share your information with:</p>
            <ul className="space-y-2 ml-5 list-disc">
              <li><strong>Government Agencies:</strong> When required by law or for regulatory compliance.</li>
              <li><strong>Service Providers:</strong> Trusted contractors performing installation, maintenance, or technical services on our behalf.</li>
              <li><strong>Payment Processors:</strong> Secure third-party payment gateways for processing transactions.</li>
              <li><strong>Legal Authorities:</strong> When required by court orders, subpoenas, or legal investigations.</li>
              <li><strong>NWSDB Regional Offices:</strong> To facilitate service delivery and customer support in your area.</li>
            </ul>
            <p className="mt-3">All third parties are contractually obligated to protect your data and use it only for authorized purposes.</p>
          </div>
        </div>

        {/* Data Security */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">4. Data Security</h2>
          <div className="space-y-3 text-sm sm:text-base text-gray-600">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Encryption:</p>
                <p>All data transmitted between your device and our servers is encrypted using industry-standard SSL/TLS protocols.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Secure Storage:</p>
                <p>Personal data is stored in secure, access-controlled servers with regular security audits and updates.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Access Controls:</p>
                <p>Only authorized NWSDB personnel with legitimate business needs can access your personal information.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Firebase Authentication:</p>
                <p>User authentication is handled by Google Firebase, a trusted and secure authentication platform.</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Rights */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-800">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">5. Your Rights</h2>
          <div className="space-y-3 text-sm sm:text-base text-gray-600">
            <p className="font-semibold text-gray-900">As a user of NWSDB AquaConnect, you have the right to:</p>
            <ul className="space-y-2 ml-5 list-disc">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Update or correct inaccurate or incomplete information.</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data (subject to legal retention requirements).</li>
              <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format.</li>
              <li><strong>Objection:</strong> Object to processing of your data for specific purposes.</li>
              <li><strong>Restriction:</strong> Request limitation of data processing in certain circumstances.</li>
              <li><strong>Withdrawal:</strong> Withdraw consent for data processing (where consent is the legal basis).</li>
            </ul>
            <p className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              To exercise any of these rights, please contact our Data Protection Officer at 
              <strong> privacy@waterboard.lk</strong> or call <strong>1939</strong>.
            </p>
          </div>
        </div>

        {/* Data Retention */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-900">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">6. Data Retention</h2>
          <div className="space-y-3 text-sm sm:text-base text-gray-600">
            <p>NWSDB retains your personal information for as long as necessary to:</p>
            <ul className="space-y-2 ml-5 list-disc">
              <li>Provide ongoing water supply services</li>
              <li>Comply with legal and regulatory obligations</li>
              <li>Resolve disputes and enforce agreements</li>
              <li>Maintain accurate financial and operational records</li>
            </ul>
            <p className="mt-4">
              Once the retention period expires and there is no legal requirement to keep the data, we will securely 
              delete or anonymize your information. Active user accounts and service records are retained indefinitely 
              while the service is active. Inactive accounts may be deleted after 5 years of inactivity.
            </p>
          </div>
        </div>

        {/* Cookies */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1000">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">7. Cookies & Tracking</h2>
          <div className="space-y-3 text-sm sm:text-base text-gray-600">
            <p>NWSDB AquaConnect uses cookies and similar technologies to:</p>
            <ul className="space-y-2 ml-5 list-disc">
              <li>Maintain your login session and remember your preferences</li>
              <li>Analyze platform usage and improve user experience</li>
              <li>Ensure security and prevent fraudulent activities</li>
              <li>Provide personalized content and features</li>
            </ul>
            <p className="mt-4">
              You can control cookie settings through your browser preferences. However, disabling cookies may affect 
              the functionality of the platform. We do not use third-party advertising cookies or track you across other websites.
            </p>
          </div>
        </div>

        {/* Children's Privacy */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1100">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">8. Children's Privacy</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm sm:text-base text-amber-900">
                NWSDB AquaConnect is intended for users aged 18 and above. We do not knowingly collect personal 
                information from individuals under 18. If we discover that we have collected data from a minor, 
                we will delete it immediately. Parents or guardians who believe their child has provided information 
                should contact us at <strong>privacy@waterboard.lk</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Policy Updates */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1200">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">9. Changes to This Policy</h2>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            NWSDB may update this Privacy Policy from time to time to reflect changes in our practices, technology, 
            legal requirements, or other factors. We will notify you of significant changes by posting a notice on 
            the platform or sending an email to your registered address. The "Last Updated" date at the top of this 
            policy indicates when it was most recently revised. Continued use of the platform after updates constitutes 
            acceptance of the revised policy.
          </p>
        </div>

        {/* Contact Information */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1300">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Contact Our Data Protection Team</h2>
          <p className="text-emerald-50 text-sm sm:text-base mb-4">
            If you have questions, concerns, or requests regarding this Privacy Policy or your personal data:
          </p>
          <div className="space-y-2 text-sm sm:text-base bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p><strong>Data Protection Officer:</strong> privacy@waterboard.lk</p>
            <p><strong>Customer Support:</strong> 1939 (24/7 Hotline)</p>
            <p><strong>Postal Address:</strong> National Water Supply & Drainage Board, Galle Road, Ratmalana, Sri Lanka</p>
          </div>
        </div>

        {/* Back Button */}
        <div className="flex justify-center animate-in fade-in duration-700 delay-1400">
          <button
            onClick={() => navigate('/')}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 text-sm sm:text-base"
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

export default PrivacyPolicy;
