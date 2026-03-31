import { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import Layout from '../components/Layout';
import { QrCode, Camera, X, Search, AlertCircle, CheckCircle2, Smartphone } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import toast, { Toaster } from 'react-hot-toast';

interface Application {
  id: string;
  fileNumber: string;
  applicantName: string;
  customerId: string;
  status: string;
  phone?: string;
  address?: string;
  submissionDate: any;
}

const QRScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();

  const startScanner = async () => {
    try {
      setCameraError('');
      
      // Check if element exists
      const readerElement = document.getElementById("qr-reader");
      if (!readerElement) {
        throw new Error('Scanner element not ready. Please try again.');
      }

      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          // Successfully scanned
          await handleScan(decodedText);
          stopScanner();
        },
        (_errorMessage) => {
          // Scanning error - ignore, this happens frequently
        }
      );
      
      setScanning(true);
      toast.success('Camera started. Point at QR code');
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraError(err.message || 'Unable to access camera');
      toast.error('Camera access denied or unavailable');
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current = null;
        setScanning(false);
      }).catch(err => console.error("Error stopping scanner:", err));
    }
  };

  const handleScan = async (data: string) => {
    if (!data) return;

    setLoading(true);
    try {
      // Parse QR data
      const qrData = JSON.parse(data);
      setScannedData(qrData);

      // Search for application by file number
      const appsQuery = query(
        collection(db, "applications"),
        where("fileNumber", "==", qrData.fileNumber)
      );
      
      const snapshot = await getDocs(appsQuery);
      
      if (!snapshot.empty) {
        const appData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Application;
        setApplication(appData);
        toast.success('Application found!');
      } else {
        toast.error('Application not found in database');
      }
    } catch (error) {
      console.error("Error processing QR code:", error);
      toast.error('Invalid QR code format');
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScannedData(null);
    setApplication(null);
    setCameraError('');
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <Layout>
      <Toaster position="top-right" />

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-0">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <QrCode size={20} className="sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">QR Code Scanner</h1>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600">Scan application QR codes to view details</p>
            </div>
          </div>
        </div>

        {/* Scanner Section */}
        {!application && (
          <div className="bg-white rounded-xl shadow-sm border mb-4 sm:mb-6">
            {/* QR Reader - always rendered in DOM */}
            <div className={cn(scanning ? "block" : "hidden", "p-2 sm:p-4")}>
              <div className="relative rounded-xl overflow-hidden bg-gray-900 shadow-2xl">
                <div id="qr-reader" style={{ width: '100%' }}></div>
                
                {/* Targeting Frame Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                  <div className="relative w-48 h-48 sm:w-64 sm:h-64">
                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 w-8 h-8 sm:w-12 sm:h-12 border-t-4 border-l-4 border-green-400 shadow-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 sm:w-12 sm:h-12 border-t-4 border-r-4 border-green-400 shadow-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 sm:w-12 sm:h-12 border-b-4 border-l-4 border-green-400 shadow-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 sm:w-12 sm:h-12 border-b-4 border-r-4 border-green-400 shadow-lg"></div>
                    
                    {/* Center text */}
                    <div className="absolute -bottom-12 sm:-bottom-16 left-0 right-0 flex items-center justify-center">
                      <div className="bg-black/70 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-green-400/50">
                        <p className="text-white text-xs sm:text-sm font-medium">Align QR code within frame</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stop Button */}
                <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-20">
                  <button
                    onClick={stopScanner}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition shadow-lg flex items-center gap-1.5 sm:gap-2 font-medium text-sm"
                  >
                    <X size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                    <span className="hidden sm:inline">Stop Camera</span>
                    <span className="sm:hidden">Stop</span>
                  </button>
                </div>

                {/* Status Bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-4 z-10">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="font-medium text-sm sm:text-base">Camera Active</span>
                    </div>
                    <span className="hidden sm:inline text-gray-300">|</span>
                    <span className="text-gray-200 text-xs sm:text-sm text-center">Point at QR code to scan</span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Camera size={18} className="sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs sm:text-sm text-blue-900">
                    <p className="font-medium mb-1">Scanning Tips:</p>
                    <ul className="space-y-0.5 sm:space-y-1 text-blue-700">
                      <li>• Hold your device steady</li>
                      <li>• Align the QR code within the green frame</li>
                      <li>• Ensure good lighting for best results</li>
                      <li className="hidden sm:list-item">• Keep the QR code flat and unfolded</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {!scanning && !cameraError && !loading && (
              <div className="text-center p-4 sm:p-6 lg:p-8">
                <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mx-auto mb-3 sm:mb-4 lg:mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                  <Camera size={40} className="sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-blue-600" />
                </div>
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-1 sm:mb-2">Ready to Scan</h2>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600 mb-3 sm:mb-4 lg:mb-6 px-2">Click the button below to activate your camera</p>
                
                <button
                  onClick={startScanner}
                  className={cn(
                    "px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700",
                    "text-white rounded-lg font-medium shadow-lg text-sm sm:text-base",
                    "hover:shadow-xl hover:scale-105 active:scale-[0.98] transition-all duration-200",
                    "flex items-center gap-1.5 sm:gap-2 mx-auto"
                  )}
                >
                  <Camera size={16} className="sm:w-[18px] sm:h-[18px] lg:w-5 lg:h-5 flex-shrink-0" />
                  <span>Start Camera</span>
                </button>

                <div className="mt-4 sm:mt-6 lg:mt-8 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Smartphone size={16} className="sm:w-[18px] sm:h-[18px] lg:w-5 lg:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-left min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-blue-900 mb-1">How to use:</p>
                      <ul className="text-xs sm:text-sm text-blue-700 space-y-0.5 sm:space-y-1">
                        <li>• Allow camera access when prompted</li>
                        <li>• Point your camera at the QR code</li>
                        <li>• Hold steady until the code is recognized</li>
                        <li className="hidden sm:list-item">• Application details will appear automatically</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {cameraError && (
              <div className="text-center p-4 sm:p-6 lg:p-8">
                <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 mx-auto mb-4 sm:mb-5 lg:mb-6 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle size={48} className="sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-red-600" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-1.5 sm:mb-2 px-2">Camera Access Error</h2>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-5 lg:mb-6 px-2">{cameraError}</p>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-5 lg:mb-6">
                  <p className="text-xs sm:text-sm text-yellow-800">
                    <strong>Troubleshooting:</strong> Make sure you've allowed camera permissions 
                    in your browser settings and no other application is using the camera.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setCameraError('');
                    startScanner();
                  }}
                  className={cn(
                    "px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg font-medium text-sm sm:text-base",
                    "hover:bg-blue-700 active:scale-[0.98] transition-all",
                    "flex items-center gap-2 mx-auto"
                  )}
                >
                  Try Again
                </button>
              </div>
            )}

            {loading && (
              <div className="text-center py-6 sm:py-8">
                <div className="animate-spin w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3 sm:mb-4"></div>
                <p className="text-gray-600 text-sm sm:text-base">Processing QR code...</p>
              </div>
            )}
          </div>
        )}

        {/* Application Details */}
        {application && scannedData && (
          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            {/* Success Banner */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg sm:rounded-xl p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                  <CheckCircle2 size={24} className="text-white sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold text-green-900 mb-0.5 sm:mb-1 truncate">Application Found!</h2>
                  <p className="text-xs sm:text-sm lg:text-base text-green-700">QR code scanned successfully at {new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>

            {/* Application Card */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-lg border overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-5 lg:p-6">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-blue-100 text-xs sm:text-sm mb-0.5 sm:mb-1">File Number</p>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold font-mono truncate">{application.fileNumber}</h3>
                  </div>
                  <span className={cn(
                    "px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap flex-shrink-0",
                    application.status === 'Connected' && 'bg-green-500 text-white',
                    application.status === 'Rejected' && 'bg-red-500 text-white',
                    !['Connected', 'Rejected'].includes(application.status) && 'bg-blue-400 text-white'
                  )}>
                    {application.status}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="p-4 sm:p-5 lg:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">Applicant Name</p>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{application.applicantName}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">NIC Number</p>
                    <p className="font-semibold text-gray-900 font-mono text-sm sm:text-base truncate">{application.customerId}</p>
                  </div>
                  {application.phone && (
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-500 mb-1">Phone Number</p>
                      <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{application.phone}</p>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">Submission Date</p>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{formatDate(application.submissionDate)}</p>
                  </div>
                </div>

                {application.address && (
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">Connection Address</p>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base break-words">{application.address}</p>
                  </div>
                )}

                {/* QR Data Info */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2"><strong>QR Code Data:</strong></p>
                  <div className="text-[10px] sm:text-xs text-gray-500 space-y-0.5 sm:space-y-1">
                    <p>Generated: {new Date(scannedData.generatedAt).toLocaleString()}</p>
                    <p>Verified: ✓ Valid NWSDB QR Code</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-50 px-4 sm:px-5 lg:px-6 py-3 sm:py-4 flex flex-col sm:flex-row gap-2 sm:gap-3 border-t">
                <button
                  onClick={() => navigate(`/application/${application.id}`)}
                  className={cn(
                    "flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm sm:text-base",
                    "hover:bg-blue-700 active:scale-[0.98] transition font-medium flex items-center justify-center gap-1.5 sm:gap-2"
                  )}
                >
                  <Search size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                  <span>View Full Details</span>
                </button>
                <button
                  onClick={resetScanner}
                  className={cn(
                    "px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm sm:text-base",
                    "hover:bg-gray-300 active:scale-95 transition font-medium flex items-center justify-center gap-1.5 sm:gap-2"
                  )}
                >
                  <QrCode size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                  <span>Scan Another</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global styles for QR scanner */}
      <style>{`
        #qr-reader {
          position: relative;
          width: 100% !important;
        }
        #qr-reader video {
          width: 100% !important;
          height: auto !important;
          display: block !important;
          border-radius: 0 !important;
        }
        #qr-reader canvas {
          display: none !important;
        }
        #qr-reader__dashboard_section {
          display: none !important;
        }
        #qr-reader__dashboard_section_csr {
          display: none !important;
        }
      `}</style>
    </Layout>
  );
};

export default QRScanner;
