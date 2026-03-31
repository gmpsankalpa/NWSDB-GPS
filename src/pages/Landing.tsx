import { useState, useRef, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Search, 
  Download, 
  FileText, 
  CheckCircle, 
  Clock,
  Shield,
  Smartphone,
  QrCode,
  Camera,
  X,
  Droplets,
  Star,
  MessageSquare,
  Send,
  Phone,
  MapPin,
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { OFFICE_LIST } from '../lib/offices';
interface Application {
  id: string;
  fileNumber: string;
  applicantName: string;
  customerId: string;
  status: string;
  phone?: string;
  address?: string;
  submissionDate: any;
  history?: any[];
  // Site Inspection fields
  latitude?: string;
  longitude?: string;
  category?: string;
  councilType?: string;
  connectionLength?: string;
  siteType?: string;
  packNumber?: string;
  roadDamage?: string;
  // Estimation fields
  estimationNumber?: string;
  estimationCost?: string;
  isInstallment?: string;
  downPayment?: string;
  numberOfInstallments?: string;
  // Payment fields
  paymentReference?: string;
  paymentDate?: string;
  paymentAmount?: string;
}

const Landing = () => {
  const [searchType, setSearchType] = useState<'file' | 'nic' | 'qr'>('file');
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [scanning, setScanning] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  // Feedback form states
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackOffice, setFeedbackOffice] = useState('');
  const [feedbackNIC, setFeedbackNIC] = useState('');
  const [customerApplications, setCustomerApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) {
      toast.error('Please enter a valid search term');
      return;
    }

    setLoading(true);
    try {
      const field = searchType === 'file' ? 'fileNumber' : 'customerId';
      const q = query(
        collection(db, 'applications'),
        where(field, '==', searchValue.trim())
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
        setApplications(apps);
        toast.success(`${apps.length} application${apps.length > 1 ? 's' : ''} found!`);
      } else {
        toast.error('No application found with this information');
        setApplications([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Error searching for application');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = (application: Application) => {
    if (!application) return;

    const doc = new jsPDF();
    
    // Header with background
    doc.setFillColor(0, 86, 179);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('NWSDB AquaConnect', 20, 25);
    doc.setFontSize(12);
    doc.text('Water Connection Application', 20, 33);
    
    // Basic Information Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Application Details', 20, 55);
    doc.setLineWidth(0.5);
    doc.line(20, 57, 190, 57);
    
    doc.setFontSize(11);
    let y = 67;
    
    const addField = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 70, y);
      y += 8;
    };
    
    addField('File Number', application.fileNumber);
    addField('Applicant Name', application.applicantName);
    addField('NIC Number', application.customerId);
    addField('Current Status', application.status);
    if (application.phone) addField('Phone', application.phone);
    addField('Submission Date', formatDate(application.submissionDate));
    
    if (application.address) {
      doc.setFont('helvetica', 'bold');
      doc.text('Address:', 20, y);
      doc.setFont('helvetica', 'normal');
      const addressLines = doc.splitTextToSize(application.address, 120);
      doc.text(addressLines, 70, y);
      y += addressLines.length * 5 + 8;
    }

    // Add space before next section
    y += 5;

    // Processing Steps Section
    if (application.history && application.history.length > 0) {
      // Check if we need a new page
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Processing Steps', 20, y);
      doc.setLineWidth(0.5);
      doc.line(20, y + 2, 190, y + 2);
      y += 12;

      // Define all possible steps
      const allSteps = [
        'Application Received',
        'Documents Verified',
        'Site Inspection',
        'Estimation Sent',
        'Payment Received',
        'Construction',
        'Connected'
      ];

      const completedSteps = new Set(application.history?.map((h: any) => h.status) || []);

      allSteps.forEach((step, index) => {
        // Check if we need a new page
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        const isCompleted = completedSteps.has(step);
        const historyItem = application.history?.find((h: any) => h.status === step);

        // Step number and status indicator
        doc.setFontSize(10);
        if (isCompleted) {
          doc.setFillColor(34, 197, 94); // Green
          doc.circle(25, y - 2, 3, 'F');
          doc.setTextColor(34, 197, 94);
          doc.setFont('helvetica', 'bold');
          doc.text('✓', 23, y + 1);
        } else {
          doc.setFillColor(200, 200, 200); // Gray
          doc.circle(25, y - 2, 3, 'F');
          doc.setTextColor(150, 150, 150);
          doc.text('○', 23, y + 1);
        }

        // Step name
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', isCompleted ? 'bold' : 'normal');
        doc.text(`${index + 1}. ${step}`, 35, y);

        if (isCompleted && historyItem) {
          y += 7;

          // Date
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          const date = historyItem.date ? new Date(historyItem.date).toLocaleString() : 'N/A';
          doc.text(`Date: ${date}`, 40, y);
          y += 5;

          // Officer
          if (historyItem.officer) {
            doc.text(`Officer: ${historyItem.officer}`, 40, y);
            y += 5;
          }

          // Notes
          if (historyItem.note) {
            doc.setTextColor(50, 50, 50);
            doc.text('Note:', 40, y);
            const noteLines = doc.splitTextToSize(historyItem.note, 140);
            doc.setTextColor(80, 80, 80);
            doc.text(noteLines, 55, y);
            y += noteLines.length * 4 + 3;
          }

          // Site Inspection Details - check history item or fall back to main application data
          const siteInspectionData = (historyItem.status === 'Site Inspection' && (historyItem.latitude || historyItem.longitude)) 
            ? historyItem 
            : (historyItem.status === 'Site Inspection' && (application.latitude || application.longitude)) 
            ? application 
            : null;

          if (siteInspectionData) {
            if (y > 250) {
              doc.addPage();
              y = 20;
            }
            
            doc.setTextColor(100, 50, 150);
            doc.setFont('helvetica', 'bold');
            doc.text('Site Inspection Details:', 40, y);
            y += 5;
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(80, 80, 80);
            
            if (siteInspectionData.latitude) {
              doc.text(`Latitude: ${siteInspectionData.latitude}`, 45, y);
              y += 4;
            }
            if (siteInspectionData.longitude) {
              doc.text(`Longitude: ${siteInspectionData.longitude}`, 45, y);
              y += 4;
            }
            if (siteInspectionData.category) {
              doc.text(`Category: ${siteInspectionData.category}`, 45, y);
              y += 4;
            }
            if (siteInspectionData.councilType) {
              doc.text(`Council Type: ${siteInspectionData.councilType}`, 45, y);
              y += 4;
            }
            if (siteInspectionData.connectionLength) {
              doc.text(`Connection Length: ${siteInspectionData.connectionLength} meters`, 45, y);
              y += 4;
            }
            if (siteInspectionData.siteType) {
              doc.text(`Site Type: ${siteInspectionData.siteType}`, 45, y);
              y += 4;
            }
            if (siteInspectionData.packNumber) {
              doc.text(`Pack Number: ${siteInspectionData.packNumber}`, 45, y);
              y += 4;
            }
            if (siteInspectionData.roadDamage) {
              doc.text(`Road Damage: ${siteInspectionData.roadDamage}`, 45, y);
              y += 4;
            }
            
            doc.setFontSize(9);
            y += 2;
          }

          // Estimation Details - check history item or fall back to main application data
          const estimationData = historyItem.estimationNumber 
            ? historyItem 
            : (historyItem.status === 'Estimation Sent' && application.estimationNumber) 
            ? application 
            : null;

          if (estimationData && estimationData.estimationNumber) {
            if (y > 250) {
              doc.addPage();
              y = 20;
            }
            
            doc.setTextColor(0, 70, 170);
            doc.setFont('helvetica', 'bold');
            doc.text('Estimation Details:', 40, y);
            y += 5;
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(80, 80, 80);
            doc.text(`Number: ${estimationData.estimationNumber}`, 45, y);
            y += 4;
            
            if (estimationData.estimationCost) {
              doc.text(`Cost: Rs. ${Number(estimationData.estimationCost).toLocaleString()}`, 45, y);
              y += 4;
            }
            if (estimationData.isInstallment === "yes") {
              doc.text('Payment Type: Installment', 45, y);
              y += 4;
              if (estimationData.downPayment) {
                doc.text(`Down Payment: Rs. ${Number(estimationData.downPayment).toLocaleString()}`, 45, y);
                y += 4;
              }
              if (estimationData.numberOfInstallments) {
                doc.text(`Installments: ${estimationData.numberOfInstallments} months`, 45, y);
                y += 4;
              }
            }
            
            doc.setFontSize(9);
            y += 2;
          }

          // Payment Details - check history item or fall back to main application data
          const paymentData = historyItem.paymentReference 
            ? historyItem 
            : (historyItem.status === 'Payment Received' && application.paymentReference) 
            ? application 
            : null;

          if (paymentData && paymentData.paymentReference) {
            if (y > 250) {
              doc.addPage();
              y = 20;
            }
            
            doc.setTextColor(34, 150, 94);
            doc.setFont('helvetica', 'bold');
            doc.text('Payment Details:', 40, y);
            y += 5;
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(80, 80, 80);
            doc.text(`Reference: ${paymentData.paymentReference}`, 45, y);
            y += 4;
            
            if (paymentData.paymentDate) {
              doc.text(`Date: ${paymentData.paymentDate}`, 45, y);
              y += 4;
            }
            if (paymentData.paymentAmount) {
              doc.text(`Amount: Rs. ${Number(paymentData.paymentAmount).toLocaleString()}`, 45, y);
              y += 4;
            }
            
            doc.setFontSize(9);
            y += 2;
          }
        } else {
          y += 7;
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.text('Pending...', 40, y);
          y += 7;
        }

        y += 3;
      });
    }

    // Rejection Information (if applicable)
    if (application.status === 'Rejected' && application.history) {
      const rejectionItem = application.history.find((h: any) => h.status === 'Rejected');
      if (rejectionItem) {
        if (y > 240) {
          doc.addPage();
          y = 20;
        }

        y += 5;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text('Rejection Details', 20, y);
        doc.setLineWidth(0.5);
        doc.line(20, y + 2, 190, y + 2);
        y += 12;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('Reason:', 20, y);
        doc.setFont('helvetica', 'normal');
        const reasonLines = doc.splitTextToSize(rejectionItem.note || 'No reason provided', 140);
        doc.text(reasonLines, 45, y);
        y += reasonLines.length * 5 + 5;

        if (rejectionItem.officer) {
          doc.setFont('helvetica', 'bold');
          doc.text('Rejected By:', 20, y);
          doc.setFont('helvetica', 'normal');
          doc.text(rejectionItem.officer, 55, y);
          y += 7;
        }

        if (rejectionItem.date) {
          doc.setFont('helvetica', 'bold');
          doc.text('Date:', 20, y);
          doc.setFont('helvetica', 'normal');
          doc.text(new Date(rejectionItem.date).toLocaleString(), 40, y);
        }
      }
    }
    
    // Footer
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Page ${i} of ${pageCount}`, 170, 287);
      doc.text('Generated on: ' + new Date().toLocaleString(), 20, 287);
      doc.text('NWSDB AquaConnect - Water Connection Management System', 20, 292);
    }
    
    doc.save(`NWSDB_Application_${application.fileNumber}.pdf`);
    toast.success('PDF downloaded successfully!');
  };

  const startScanner = async () => {
    try {
      const readerElement = document.getElementById("landing-qr-reader");
      if (!readerElement) {
        throw new Error('Scanner element not ready. Please try again.');
      }

      const html5QrCode = new Html5Qrcode("landing-qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await handleQRScan(decodedText);
          stopScanner();
        },
        (_errorMessage) => {
          // Scanning error - ignore
        }
      );
      
      setScanning(true);
      toast.success('Camera started. Point at QR code');
    } catch (err: any) {
      console.error("Camera error:", err);
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

  const handleQRScan = async (data: string) => {
    if (!data) return;

    setLoading(true);
    try {
      const qrData = JSON.parse(data);

      const appsQuery = query(
        collection(db, "applications"),
        where("fileNumber", "==", qrData.fileNumber)
      );
      
      const snapshot = await getDocs(appsQuery);
      
      if (!snapshot.empty) {
        const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
        setApplications(apps);
        toast.success(`${apps.length} application${apps.length > 1 ? 's' : ''} found!`);
      } else {
        toast.error('Application not found in database');
        setApplications([]);
      }
    } catch (error) {
      console.error("Error processing QR code:", error);
      toast.error('Invalid QR code format');
    } finally {
      setLoading(false);
    }
  };

  // Feedback form handlers
  const handleFindApplications = async () => {
    if (!feedbackOffice || !feedbackNIC) {
      toast.error('Please select office and enter your NIC number');
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, 'applications'),
        where('office', '==', feedbackOffice),
        where('customerId', '==', feedbackNIC.trim())
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
        setCustomerApplications(apps);
        if (apps.length === 1) {
          setSelectedApplication(apps[0].id);
        }
        toast.success(`Found ${apps.length} application${apps.length > 1 ? 's' : ''}!`);
      } else {
        toast.error('No applications found for this office and NIC');
        setCustomerApplications([]);
      }
    } catch (error) {
      console.error('Error finding applications:', error);
      toast.error('Error searching for applications');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedApplication) {
      toast.error('Please select an application');
      return;
    }
    
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    if (!comment.trim()) {
      toast.error('Please write your feedback');
      return;
    }
    
    setSubmittingFeedback(true);
    
    try {
      const selectedApp = customerApplications.find(app => app.id === selectedApplication);
      if (!selectedApp) {
        toast.error('Selected application not found');
        return;
      }
      
      await addDoc(collection(db, 'customerReviews'), {
        office: feedbackOffice,
        fileNumber: selectedApp.fileNumber,
        applicantName: selectedApp.applicantName,
        customerId: feedbackNIC.trim(),
        rating,
        comment: comment.trim(),
        submittedDate: Timestamp.now()
      });
      
      toast.success('Thank you for your feedback!');
      
      // Reset form
      setShowFeedbackForm(false);
      setFeedbackOffice('');
      setFeedbackNIC('');
      setCustomerApplications([]);
      setSelectedApplication('');
      setRating(0);
      setComment('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
      <Toaster position="top-right" />
      
      <Header />

      {/* Hero Section */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-20 px-3 sm:px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-6 sm:mb-8 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4 px-2">
              Track Your Water Connection Application
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto px-4">
              Check your application status, download documents, and stay updated on your water connection request
            </p>
          </div>

          {/* Search Section */}
          <div className="max-w-2xl mx-auto bg-white rounded-xl sm:rounded-2xl shadow-xl p-5 sm:p-6 lg:p-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Search size={20} className="text-blue-600 sm:w-6 sm:h-6 flex-shrink-0" />
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Find Your Application</h3>
            </div>

            <form onSubmit={handleSearch} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchType('file');
                    setSearchValue('');
                    stopScanner();
                  }}
                  className={cn(
                    'py-2.5 sm:py-3 rounded-lg font-medium transition text-sm sm:text-base active:scale-95',
                    searchType === 'file'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  <span className="hidden sm:inline">File Number</span>
                  <span className="sm:hidden">File #</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchType('nic');
                    setSearchValue('');
                    stopScanner();
                  }}
                  className={cn(
                    'py-2.5 sm:py-3 rounded-lg font-medium transition text-sm sm:text-base active:scale-95',
                    searchType === 'nic'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  <span className="hidden sm:inline">NIC Number</span>
                  <span className="sm:hidden">NIC</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSearchType('qr')}
                  className={cn(
                    'py-2.5 sm:py-3 rounded-lg font-medium transition flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base active:scale-95',
                    searchType === 'qr'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  <QrCode size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Scan QR</span>
                  <span className="sm:hidden">Scan</span>
                </button>
              </div>

              {searchType === 'qr' ? (
                <div className="space-y-3 sm:space-y-4">
                  {/* QR Scanner */}
                  <div className={cn(scanning ? "block" : "hidden")}>
                    <div className="relative rounded-xl overflow-hidden bg-gray-900 shadow-2xl">
                      <div id="landing-qr-reader" style={{ width: '100%' }}></div>
                      
                      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
                        <button
                          type="button"
                          onClick={stopScanner}
                          className="px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition shadow-lg flex items-center gap-1.5 sm:gap-2 font-medium text-sm sm:text-base"
                        >
                          <X size={16} className="flex-shrink-0" />
                          <span>Stop</span>
                        </button>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4 z-10">
                        <div className="flex items-center justify-center gap-2 sm:gap-3 text-white">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="font-medium text-xs sm:text-sm">Camera Active</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!scanning && (
                    <button
                      type="button"
                      onClick={startScanner}
                      className={cn(
                        'w-full py-2.5 sm:py-3 bg-gradient-to-r from-green-600 to-green-700',
                        'text-white rounded-lg font-medium hover:shadow-lg active:scale-[0.98] transition',
                        'flex items-center justify-center gap-2 text-sm sm:text-base'
                      )}
                    >
                      <Camera size={18} className="flex-shrink-0" />
                      <span>Start QR Scanner</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder={searchType === 'file' ? 'Enter File Number (e.g., 2026/DM/0001)' : 'Enter NIC Number'}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
                    required
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      'w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700',
                      'text-white rounded-lg font-medium hover:shadow-lg active:scale-[0.98] transition',
                      'flex items-center justify-center gap-2 text-sm sm:text-base',
                      loading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {loading ? (
                      <div className="flex flex-col items-center gap-2 sm:gap-3">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                          <Droplets className="text-white" size={24} />
                        </div>
                        <span className="text-xs sm:text-sm">Searching...</span>
                      </div>
                    ) : (
                      <>
                        <Search size={18} className="flex-shrink-0" />
                        <span>Search Application</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          </div>

          {/* Application Results */}
          {applications.length > 0 && (
            <div className="max-w-2xl mx-auto mt-4 sm:mt-6 lg:mt-8 space-y-3 sm:space-y-4 lg:space-y-6">
              {searchType === 'nic' && applications.length > 1 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-2.5 sm:p-3 lg:p-4 mx-3 sm:mx-4">
                  <p className="text-blue-800 text-xs sm:text-sm font-medium">
                    Found {applications.length} applications for this NIC number
                  </p>
                </div>
              )}
              
              {applications.map((application) => (
                <div key={application.id} className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 mx-3 sm:mx-4">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 sm:p-4 lg:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-2 sm:gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-blue-100 text-xs sm:text-sm mb-1">File Number</p>
                        <h3 className="text-base sm:text-lg lg:text-2xl font-bold font-mono truncate">{application.fileNumber}</h3>
                      </div>
                      <span className={cn(
                        'px-2.5 py-1 sm:px-3 sm:py-1.5 lg:px-4 lg:py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap flex-shrink-0',
                        application.status === 'Connected' && 'bg-green-500',
                        application.status === 'Rejected' && 'bg-red-500',
                        !['Connected', 'Rejected'].includes(application.status) && 'bg-blue-400'
                      )}>
                        {application.status}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-3 sm:p-4 lg:p-6 space-y-2.5 sm:space-y-3 lg:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 lg:gap-4">
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
                          <p className="text-xs sm:text-sm text-gray-500 mb-1">Phone</p>
                          <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{application.phone}</p>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-gray-500 mb-1">Submitted</p>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{formatDate(application.submissionDate)}</p>
                      </div>
                    </div>

                    {application.address && (
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-gray-500 mb-1">Connection Address</p>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base break-words">{application.address}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="bg-gray-50 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-4 flex flex-col sm:flex-row gap-2 sm:gap-3 border-t">
                    <button
                      onClick={() => setSelectedApp(application)}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition font-medium flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                    >
                      <FileText size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                      <span>View Details</span>
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(application)}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-[0.98] transition font-medium flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                    >
                      <Download size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 sm:py-12 lg:py-16 px-3 sm:px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center text-gray-900 mb-6 sm:mb-8 lg:mb-12 px-2">How It Works</h3>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <div className="text-center p-3 sm:p-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 lg:mb-4">
                <FileText size={24} className="text-blue-600 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
              </div>
              <h4 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2">Submit Application</h4>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600">Visit your nearest NWSDB office to submit your water connection application</p>
            </div>
            
            <div className="text-center p-3 sm:p-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 lg:mb-4">
                <Search size={24} className="text-green-600 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
              </div>
              <h4 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2">Track Status</h4>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600">Use your file number or NIC to check your application status anytime, anywhere</p>
            </div>
            
            <div className="text-center p-3 sm:p-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 lg:mb-4">
                <CheckCircle size={24} className="text-purple-600 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
              </div>
              <h4 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2">Get Connected</h4>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600">Receive updates and get your water connection activated once approved</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-8 sm:py-12 lg:py-16 px-3 sm:px-4 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto max-w-6xl">
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center text-gray-900 mb-6 sm:mb-8 lg:mb-12 px-2">Why Choose AquaConnect?</h3>
          
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            {[
              { icon: Clock, title: '24/7 Access', desc: 'Check your application status anytime' },
              { icon: Shield, title: 'Secure & Private', desc: 'Your data is protected and encrypted' },
              { icon: Smartphone, title: 'Mobile Friendly', desc: 'Access from any device, anywhere' },
              { icon: QrCode, title: 'QR Code Support', desc: 'Quick access with scannable QR codes' }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-sm border flex items-start gap-2.5 sm:gap-3 lg:gap-4 active:scale-[0.98] transition cursor-pointer">
                <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon size={18} className="text-blue-600 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-gray-900 mb-1 text-sm sm:text-base">{item.title}</h4>
                  <p className="text-gray-600 text-xs sm:text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Feedback Section */}
      <section className="py-8 sm:py-12 lg:py-16 px-3 sm:px-4 bg-white">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-blue-600 mx-auto mb-2 sm:mb-3 lg:mb-4" />
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4 px-2">Share Your Experience</h3>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 mb-3 sm:mb-4 lg:mb-6 px-2">
              Your feedback helps us improve our services. Share your experience with NWSDB.
            </p>
            <button
              onClick={() => setShowFeedbackForm(true)}
              className="px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8 lg:py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] transition font-semibold flex items-center justify-center gap-1.5 sm:gap-2 mx-auto shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              <MessageSquare size={16} className="sm:w-5 sm:h-5 flex-shrink-0" />
              <span>Give Feedback</span>
            </button>
          </div>
        </div>
      </section>

      {/* Feedback Form Modal */}
      {showFeedbackForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto" onClick={() => setShowFeedbackForm(false)}>
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full my-4 sm:my-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-5 lg:p-6 flex justify-between items-start gap-3 z-10">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2 truncate">Customer Feedback</h2>
                <p className="text-blue-100 text-xs sm:text-sm">Share your experience with us</p>
              </div>
              <button 
                onClick={() => setShowFeedbackForm(false)} 
                className="text-white hover:bg-white/20 p-1.5 sm:p-2 rounded-lg active:scale-95 transition flex-shrink-0"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6">
              {/* Step 1: Select Office and Find Applications */}
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Select Office <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={feedbackOffice}
                    onChange={(e) => setFeedbackOffice(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    required
                  >
                    <option value="">Choose an office...</option>
                    {OFFICE_LIST.map(office => (
                      <option key={office.value} value={office.value}>{office.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Your NIC Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={feedbackNIC}
                    onChange={(e) => setFeedbackNIC(e.target.value)}
                    placeholder="Enter your NIC number"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    required
                  />
                </div>

                <button
                  onClick={handleFindApplications}
                  disabled={!feedbackOffice || !feedbackNIC}
                  className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition font-semibold flex items-center justify-center gap-1.5 sm:gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  <Search size={16} className="sm:w-5 sm:h-5 flex-shrink-0" />
                  <span>Find My Applications</span>
                </button>
              </div>

              {/* Step 2: Select Application (shown after finding) */}
              {customerApplications.length > 0 && (
                <div className="border-t pt-4 sm:pt-5 lg:pt-6">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Select Application <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedApplication}
                    onChange={(e) => setSelectedApplication(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    required
                  >
                    <option value="">Choose an application...</option>
                    {customerApplications.map(app => (
                      <option key={app.id} value={app.id}>
                        {app.fileNumber} - {app.applicantName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Step 3: Rating and Comment (shown after selecting application) */}
              {selectedApplication && (
                <div className="border-t pt-4 sm:pt-5 lg:pt-6 space-y-4 sm:space-y-5 lg:space-y-6">
                  {/* Star Rating */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                      Rate Your Experience <span className="text-red-500">*</span>
                    </label>
                    <div className="flex justify-center gap-1.5 sm:gap-2 lg:gap-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="transition-transform hover:scale-110 active:scale-95 focus:outline-none p-1"
                        >
                          <Star
                            size={28}
                            className={cn(
                              'sm:w-9 sm:h-9 lg:w-10 lg:h-10',
                              (hoverRating || rating) >= star
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            )}
                          />
                        </button>
                      ))}
                    </div>
                    {rating > 0 && (
                      <p className="text-center text-xs sm:text-sm text-gray-600 mt-1.5 sm:mt-2">
                        {rating === 5 && '⭐ Excellent!'}
                        {rating === 4 && '⭐ Very Good'}
                        {rating === 3 && '⭐ Good'}
                        {rating === 2 && '⭐ Fair'}
                        {rating === 1 && '⭐ Needs Improvement'}
                      </p>
                    )}
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                      Your Feedback <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Tell us about your experience..."
                      rows={4}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base"
                      required
                    />
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                      {comment.length} / 500 characters
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmitFeedback}
                    disabled={!rating || !comment.trim() || submittingFeedback}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 active:scale-[0.98] transition font-bold flex items-center justify-center gap-1.5 sm:gap-2 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed shadow-lg text-sm sm:text-base"
                  >
                    {submittingFeedback ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} className="sm:w-5 sm:h-5 flex-shrink-0" />
                        <span>Submit Feedback</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* No Applications Found Message */}
              {customerApplications.length === 0 && feedbackNIC && feedbackOffice && (
                <div className="border-t pt-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-yellow-800 text-sm">
                      No applications found for this NIC at the selected office.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detailed View Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto" onClick={() => setSelectedApp(null)}>
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full my-4 sm:my-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-5 lg:p-6 flex justify-between items-start gap-3 z-10">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2 truncate">Application Details</h2>
                <p className="text-blue-100 text-xs sm:text-sm">File Number: <span className="font-mono font-bold">{selectedApp.fileNumber}</span></p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-white hover:bg-white/20 p-1.5 sm:p-2 rounded-lg active:scale-95 transition flex-shrink-0">
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6">
              {/* Status Badge */}
              <div className="flex justify-center">
                <span className={cn(
                  'px-4 py-2 sm:px-5 sm:py-2.5 lg:px-6 lg:py-3 rounded-full text-base sm:text-lg font-bold',
                  selectedApp.status === 'Connected' && 'bg-green-100 text-green-700',
                  selectedApp.status === 'Rejected' && 'bg-red-100 text-red-700',
                  !['Connected', 'Rejected'].includes(selectedApp.status) && 'bg-blue-100 text-blue-700'
                )}>
                  {selectedApp.status}
                </span>
              </div>

              {/* Personal Information */}
              <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4 flex items-center gap-1.5 sm:gap-2">
                  <FileText className="text-blue-600 flex-shrink-0" size={16} />
                  <span>Personal Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 lg:gap-4">
                  <div className="min-w-0">
                    <label className="text-xs sm:text-sm text-gray-500 block mb-1">Applicant Name</label>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{selectedApp.applicantName}</p>
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs sm:text-sm text-gray-500 block mb-1">NIC Number</label>
                    <p className="font-semibold text-gray-900 font-mono text-sm sm:text-base truncate">{selectedApp.customerId}</p>
                  </div>
                  {selectedApp.phone && (
                    <div className="min-w-0">
                      <label className="text-xs sm:text-sm text-gray-500 block mb-1">Phone Number</label>
                      <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{selectedApp.phone}</p>
                    </div>
                  )}
                  <div className="min-w-0">
                    <label className="text-xs sm:text-sm text-gray-500 block mb-1">Submission Date</label>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{formatDate(selectedApp.submissionDate)}</p>
                  </div>
                  {selectedApp.address && (
                    <div className="md:col-span-2 min-w-0">
                      <label className="text-xs sm:text-sm text-gray-500 block mb-1">Connection Address</label>
                      <p className="font-semibold text-gray-900 text-sm sm:text-base break-words">{selectedApp.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Processing Timeline */}
              {selectedApp.history && selectedApp.history.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4 flex items-center gap-1.5 sm:gap-2">
                    <Clock className="text-blue-600 flex-shrink-0" size={16} />
                    <span>Processing Timeline</span>
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    {selectedApp.history.map((item: any, index: number) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                            item.status === 'Rejected' ? 'bg-red-100' : 'bg-green-100'
                          )}>
                            {item.status === 'Rejected' ? (
                              <X className="text-red-600" size={20} />
                            ) : (
                              <CheckCircle className="text-green-600" size={20} />
                            )}
                          </div>
                          {selectedApp.history && index < selectedApp.history.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 flex-1 my-1"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-gray-900">{item.status}</h4>
                            <span className="text-xs text-gray-500">{new Date(item.date).toLocaleString()}</span>
                          </div>
                          {item.note && (
                            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 mb-2">{item.note}</p>
                          )}
                          
                          {/* Site Inspection Details */}
                          {item.status === 'Site Inspection' && (item.latitude || item.longitude) && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-2 space-y-1">
                              <p className="text-xs font-semibold text-purple-700 mb-2">Site Inspection Details:</p>
                              {item.latitude && (
                                <p className="text-xs text-gray-700"><span className="font-semibold">Latitude:</span> {item.latitude}</p>
                              )}
                              {item.longitude && (
                                <p className="text-xs text-gray-700"><span className="font-semibold">Longitude:</span> {item.longitude}</p>
                              )}
                              {item.category && (
                                <p className="text-xs text-gray-700"><span className="font-semibold">Category:</span> {item.category}</p>
                              )}
                              {item.councilType && (
                                <p className="text-xs text-gray-700"><span className="font-semibold">Council Type:</span> {item.councilType}</p>
                              )}
                              {item.connectionLength && (
                                <p className="text-xs text-gray-700"><span className="font-semibold">Connection Length:</span> {item.connectionLength} meters</p>
                              )}
                              {item.siteType && (
                                <p className="text-xs text-gray-700"><span className="font-semibold">Site Type:</span> {item.siteType}</p>
                              )}
                              {item.packNumber && (
                                <p className="text-xs text-gray-700"><span className="font-semibold">Pack Number:</span> {item.packNumber}</p>
                              )}
                              {item.roadDamage && (
                                <p className="text-xs text-gray-700"><span className="font-semibold">Road Damage:</span> {item.roadDamage}</p>
                              )}
                            </div>
                          )}
                          
                          {/* Estimation Details */}
                          {item.estimationNumber && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2 space-y-1">
                              <p className="text-xs font-semibold text-blue-700 mb-2">Estimation Details:</p>
                              <p className="text-xs text-gray-700"><span className="font-semibold">Number:</span> <span className="font-mono">{item.estimationNumber}</span></p>
                              {item.estimationCost && (
                                <p className="text-xs text-gray-700"><span className="font-semibold">Cost:</span> Rs. {Number(item.estimationCost).toLocaleString()}</p>
                              )}
                              {item.isInstallment === "yes" && (
                                <>
                                  <p className="text-xs text-gray-700"><span className="font-semibold">Payment Type:</span> Installment</p>
                                  {item.downPayment && (
                                    <p className="text-xs text-gray-700"><span className="font-semibold">Down Payment:</span> Rs. {Number(item.downPayment).toLocaleString()}</p>
                                  )}
                                  {item.numberOfInstallments && (
                                    <p className="text-xs text-gray-700"><span className="font-semibold">Installments:</span> {item.numberOfInstallments} months</p>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                          
                          {/* Payment Details */}
                          {item.paymentReference && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2 space-y-1">
                              <p className="text-xs font-semibold text-green-700 mb-2">Payment Details:</p>
                              <p className="text-xs text-gray-700"><span className="font-semibold">Reference:</span> <span className="font-mono">{item.paymentReference}</span></p>
                              {item.paymentDate && (
                                <p className="text-xs text-gray-700"><span className="font-semibold">Date:</span> {item.paymentDate}</p>
                              )}
                              {item.paymentAmount && (
                                <p className="text-xs text-gray-700"><span className="font-semibold">Amount:</span> Rs. {Number(item.paymentAmount).toLocaleString()}</p>
                              )}
                            </div>
                          )}
                          
                          {item.officer && (
                            <p className="text-xs text-gray-500 mt-1">Officer: {item.officer}</p>
                          )}
                          {item.reason && (
                            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mt-2"><span className="font-semibold">Reason:</span> {item.reason}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => handleDownloadPDF(selectedApp)}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-[0.98] transition font-medium flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                >
                  <Download size={16} className="sm:w-5 sm:h-5 flex-shrink-0" />
                  <span>Download PDF Report</span>
                </button>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 active:scale-95 transition font-medium text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Office Contact Information Section */}
      <section className="py-8 sm:py-12 lg:py-16 px-3 sm:px-4 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-6 sm:mb-8 lg:mb-12">
            <Phone className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-blue-600 mx-auto mb-2 sm:mb-3 lg:mb-4" />
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4 px-2">Contact Our Offices</h3>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600 max-w-2xl mx-auto px-2">
              Need help? Get in touch with your nearest NWSDB office for assistance with your water connection.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            {/* Regional Engineer Office */}
            <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl shadow-lg border-2 border-blue-200 hover:shadow-xl active:scale-[0.98] transition">
              <div className="flex items-start gap-2.5 sm:gap-3 lg:gap-4 mb-2.5 sm:mb-3 lg:mb-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <Droplets size={20} className="text-white sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1 truncate">Regional Engineer Office</h4>
                  <p className="text-xs sm:text-sm text-blue-600 font-medium">Dambulla Regional Office</p>
                </div>
              </div>
              
              <div className="space-y-2 sm:space-y-2.5 lg:space-y-3">
                <div className="flex items-start gap-2 sm:gap-2.5 lg:gap-3">
                  <Phone size={14} className="text-blue-600 flex-shrink-0 mt-0.5 sm:w-[18px] sm:h-[18px]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium mb-0.5">Contact Numbers</p>
                    <a href="tel:0662285600" className="text-sm sm:text-base text-gray-900 font-semibold hover:text-blue-600 active:scale-95 transition block truncate">066-2285600</a>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 sm:gap-2.5 lg:gap-3">
                  <MapPin size={14} className="text-blue-600 flex-shrink-0 mt-0.5 sm:w-[18px] sm:h-[18px]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium mb-0.5">Address</p>
                    <p className="text-sm sm:text-base text-gray-900 break-words">NWSDB, 8 Canal Road, Dambulla</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dambulla Acting Office */}
            <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl active:scale-[0.98] transition">
              <div className="flex items-start gap-2.5 sm:gap-3 lg:gap-4 mb-2.5 sm:mb-3 lg:mb-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <Droplets size={20} className="text-white sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1 truncate">Dambulla Office</h4>
                  <p className="text-xs sm:text-sm text-green-600 font-medium">Acting Officer</p>
                </div>
              </div>
              
              <div className="space-y-2 sm:space-y-2.5 lg:space-y-3">
                <div className="flex items-start gap-2 sm:gap-2.5 lg:gap-3">
                  <Phone size={14} className="text-green-600 flex-shrink-0 mt-0.5 sm:w-[18px] sm:h-[18px]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium mb-0.5">Contact Number</p>
                    <a href="tel:0662285651" className="text-sm sm:text-base text-gray-900 font-semibold hover:text-green-600 active:scale-95 transition block truncate">066-2285651</a>
                    <a href="tel:0662285652" className="text-sm sm:text-base text-gray-900 font-semibold hover:text-green-600 active:scale-95 transition block truncate">066-2285652</a>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 sm:gap-2.5 lg:gap-3">
                  <MapPin size={14} className="text-green-600 flex-shrink-0 mt-0.5 sm:w-[18px] sm:h-[18px]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium mb-0.5">Address</p>
                    <p className="text-sm sm:text-base text-gray-900 break-words">NWSDB, 8 Canal Road, Dambulla</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Abangaga Office */}
            <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl active:scale-[0.98] transition">
              <div className="flex items-start gap-2.5 sm:gap-3 lg:gap-4 mb-2.5 sm:mb-3 lg:mb-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <Droplets size={20} className="text-white sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1 truncate">Abangaga Office</h4>
                  <p className="text-xs sm:text-sm text-purple-600 font-medium">Acting Officer</p>
                </div>
              </div>
              
              <div className="space-y-2 sm:space-y-2.5 lg:space-y-3">
                <div className="flex items-start gap-2 sm:gap-2.5 lg:gap-3">
                  <Phone size={14} className="text-purple-600 flex-shrink-0 mt-0.5 sm:w-[18px] sm:h-[18px]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium mb-0.5">Contact Number</p>
                    <a href="tel:0662055033" className="text-sm sm:text-base text-gray-900 font-semibold hover:text-purple-600 active:scale-95 transition block truncate">066-2055033</a>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 sm:gap-2.5 lg:gap-3">
                  <MapPin size={14} className="text-purple-600 flex-shrink-0 mt-0.5 sm:w-[18px] sm:h-[18px]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium mb-0.5">Address</p>
                    <p className="text-sm sm:text-base text-gray-900 break-words">NWSDB, Madiroda, Madawala, Ulpatha</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Naula Office */}
            <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl active:scale-[0.98] transition">
              <div className="flex items-start gap-2.5 sm:gap-3 lg:gap-4 mb-2.5 sm:mb-3 lg:mb-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <Droplets size={20} className="text-white sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1 truncate">Naula Office</h4>
                  <p className="text-xs sm:text-sm text-orange-600 font-medium">Acting Officer</p>
                </div>
              </div>
              
              <div className="space-y-2 sm:space-y-2.5 lg:space-y-3">
                <div className="flex items-start gap-2 sm:gap-2.5 lg:gap-3">
                  <Phone size={14} className="text-orange-600 flex-shrink-0 mt-0.5 sm:w-[18px] sm:h-[18px]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium mb-0.5">Contact Number</p>
                    <a href="tel:0662246201" className="text-sm sm:text-base text-gray-900 font-semibold hover:text-orange-600 active:scale-95 transition block truncate">066-2246201</a>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 sm:gap-2.5 lg:gap-3">
                  <MapPin size={14} className="text-orange-600 flex-shrink-0 mt-0.5 sm:w-[18px] sm:h-[18px]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium mb-0.5">Address</p>
                    <p className="text-sm sm:text-base text-gray-900 break-words">NWSDB, Naula</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Galewela Office */}
            <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl active:scale-[0.98] transition sm:col-span-2 lg:col-span-1 lg:col-start-1">
              <div className="flex items-start gap-2.5 sm:gap-3 lg:gap-4 mb-2.5 sm:mb-3 lg:mb-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <Droplets size={20} className="text-white sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1 truncate">Galewela Office</h4>
                  <p className="text-xs sm:text-sm text-teal-600 font-medium">Acting Officer</p>
                </div>
              </div>
              
              <div className="space-y-2 sm:space-y-2.5 lg:space-y-3">
                <div className="flex items-start gap-2 sm:gap-2.5 lg:gap-3">
                  <Phone size={14} className="text-teal-600 flex-shrink-0 mt-0.5 sm:w-[18px] sm:h-[18px]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium mb-0.5">Contact Number</p>
                    <a href="tel:0662057111" className="text-sm sm:text-base text-gray-900 font-semibold hover:text-teal-600 active:scale-95 transition block truncate">066-2057111</a>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 sm:gap-2.5 lg:gap-3">
                  <MapPin size={14} className="text-teal-600 flex-shrink-0 mt-0.5 sm:w-[18px] sm:h-[18px]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium mb-0.5">Address</p>
                    <p className="text-sm sm:text-base text-gray-900 break-words">NWSDB, Dambulla Road, Galewela</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="mt-4 sm:mt-6 lg:mt-8 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 text-center">
            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5 sm:mb-2">Emergency Hotline</h4>
            <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 px-2">For water supply emergencies and urgent issues</p>
            <a href="tel:1939" className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 bg-red-600 text-white rounded-lg sm:rounded-xl hover:bg-red-700 active:scale-[0.98] transition font-bold text-base sm:text-lg">
              <Phone size={16} className="sm:w-5 sm:h-5 flex-shrink-0" />
              <span>1939 (24/7)</span>
            </a>
          </div>
        </div>
      </section>

      <Footer />

      {/* Global styles for QR scanner */}
      <style>{`
        #landing-qr-reader {
          position: relative;
          width: 100% !important;
        }
        #landing-qr-reader video {
          width: 100% !important;
          height: auto !important;
          display: block !important;
          border-radius: 0 !important;
        }
        #landing-qr-reader canvas {
          display: none !important;
        }
        #landing-qr-reader__dashboard_section {
          display: none !important;
        }
        #landing-qr-reader__dashboard_section_csr {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default Landing;
