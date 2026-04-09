import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, Timestamp, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { logDataExport } from '../lib/systemLogger';
import { Plus, Search, Users, Activity, Filter, X, AlertCircle, Building2, Loader2, FileDown, ChevronDown, FileSpreadsheet, User, Mail, Shield, ChevronUp, MapPin, Navigation, Eye, Image as ImageIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast, { Toaster } from 'react-hot-toast';
import Layout from '../components/Layout';
import { cn, formatDate, formatAccountNumber } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, OFFICE_LIST, hasOfficeAccess, type Office } from '../lib/offices';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import GPSCapture from '../components/GPSCapture';
import ImageCaptureUpload from '../components/ImageCaptureUpload';
import { uploadBase64ImageToImgbb } from '../lib/imgbbUpload';
import CategorySelector, { CategoryBadge } from '../components/CategorySelector';
import { calculateDistance, formatDistance, hasValidGPS, navigateToLocation } from '../lib/gpsUtils';
import { getActiveCategories } from '../lib/categoryService';
import type { Category } from '../lib/types';

// Stats Card Component
const StatCard = ({ label, value, icon: Icon, color }: any) => (
  <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 sm:gap-4 transition-transform active:scale-[0.98]">
    <div className={`p-2 sm:p-2.5 lg:p-3 rounded-lg ${color} text-white flex-shrink-0`}>
      <Icon size={20} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs sm:text-sm text-gray-500 truncate">{label}</p>
      <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">{value}</h3>
    </div>
  </div>
);

const Dashboard = () => {
  const OFFLINE_CAPTURE_QUEUE_KEY = 'dashboard_offline_capture_queue_v1';
  const [apps, setApps] = useState<any[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [officeFilter, setOfficeFilter] = useState<Office | 'All'>('All');
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [imageFilter, setImageFilter] = useState<'all' | 'with' | 'without'>('all');
  const [nearbyFilter, setNearbyFilter] = useState<'all' | 'nearby'>('all');
  const [nearbyLocation, setNearbyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingNearbyLocation, setGettingNearbyLocation] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCategoryFilterMenu, setShowCategoryFilterMenu] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncingQueue, setSyncingQueue] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const categoryFilterRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const { user, loading } = useAuth();
  
  // New state for GPS and categories
  const [gpsData, setGpsData] = useState<{ latitude: number; longitude: number; accuracy?: number } | undefined>();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [captureDateTime, setCaptureDateTime] = useState('');
  const [autoAddressLoading, setAutoAddressLoading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [lastTapTime, setLastTapTime] = useState(0);
  const [connectionImage, setConnectionImage] = useState<{
    imageUrl: string;
    displayUrl: string;
    thumbnailUrl?: string;
    deleteUrl?: string;
    offlineDataUrl?: string;
    offlineFileName?: string;
  } | undefined>();
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef(1);
  const dragStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartOffsetRef = useRef({ x: 0, y: 0 });

  type OfflineCapturePayload = {
    accountNumber: string;
    note: string;
    address: string;
    office: string;
    createdBy: string;
    categories: string[];
    connectionImage: {
      imageUrl?: string;
      displayUrl?: string;
      thumbnailUrl?: string;
      deleteUrl?: string;
      offlineDataUrl?: string;
      offlineFileName?: string;
    } | null;
    gps: {
      latitude: number;
      longitude: number;
      capturedBy: string;
      capturedAtMs: number;
      accuracy?: number;
    };
  };

  type OfflineQueueItem = {
    id: string;
    queuedAtMs: number;
    payload: OfflineCapturePayload;
  };

  const readOfflineQueue = useCallback((): OfflineQueueItem[] => {
    try {
      const raw = localStorage.getItem(OFFLINE_CAPTURE_QUEUE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [OFFLINE_CAPTURE_QUEUE_KEY]);

  const writeOfflineQueue = useCallback((items: OfflineQueueItem[]) => {
    localStorage.setItem(OFFLINE_CAPTURE_QUEUE_KEY, JSON.stringify(items));
    setPendingSyncCount(items.length);
  }, [OFFLINE_CAPTURE_QUEUE_KEY]);

  const enqueueOfflineCapture = useCallback((payload: OfflineCapturePayload) => {
    const currentQueue = readOfflineQueue();
    const nextQueue: OfflineQueueItem[] = [
      ...currentQueue,
      {
        id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        queuedAtMs: Date.now(),
        payload,
      },
    ];
    writeOfflineQueue(nextQueue);
  }, [readOfflineQueue, writeOfflineQueue]);

  const saveCaptureToFirestore = useCallback(async (payload: OfflineCapturePayload) => {
    const accountNumberQuery = query(
      collection(db, 'applications'),
      where('accountNumber', '==', payload.accountNumber)
    );
    const existingDocs = await getDocs(accountNumberQuery);
    if (!existingDocs.empty) {
      return { status: 'duplicate' as const };
    }

    const capturedAt = Timestamp.fromMillis(payload.gps.capturedAtMs || Date.now());
    const now = Timestamp.now();
    let uploadedConnectionImage = payload.connectionImage;
    if (uploadedConnectionImage?.offlineDataUrl) {
      const uploaded = await uploadBase64ImageToImgbb(
        uploadedConnectionImage.offlineDataUrl,
        uploadedConnectionImage.offlineFileName || `${payload.accountNumber || 'offline-capture'}.jpg`
      );
      uploadedConnectionImage = {
        imageUrl: uploaded.imageUrl,
        displayUrl: uploaded.displayUrl,
        thumbnailUrl: uploaded.thumbnailUrl,
        deleteUrl: uploaded.deleteUrl,
      };
    }

    await addDoc(collection(db, 'applications'), {
      accountNumber: payload.accountNumber,
      note: payload.note,
      address: payload.address,
      office: payload.office,
      createdBy: payload.createdBy,
      submissionDate: now,
      lastUpdated: now,
      captureDateTime: capturedAt,
      gps: {
        latitude: payload.gps.latitude,
        longitude: payload.gps.longitude,
        capturedAt,
        capturedBy: payload.gps.capturedBy,
        ...(typeof payload.gps.accuracy === 'number' ? { accuracy: payload.gps.accuracy } : {}),
      },
      categories: payload.categories,
      connectionImage: uploadedConnectionImage || null,
    });

    return { status: 'created' as const };
  }, []);

  const syncOfflineQueue = useCallback(async () => {
    if (!user || syncingQueue || !navigator.onLine) return;
    const queueItems = readOfflineQueue();
    if (queueItems.length === 0) return;

    setSyncingQueue(true);
    const remaining: OfflineQueueItem[] = [];
    let syncedCount = 0;

    for (const item of queueItems) {
      try {
        const result = await saveCaptureToFirestore(item.payload);
        if (result.status === 'created') {
          syncedCount += 1;
        }
      } catch (error) {
        remaining.push(item);
      }
    }

    writeOfflineQueue(remaining);
    setSyncingQueue(false);

    if (syncedCount > 0) {
      toast.success(`Synced ${syncedCount} offline capture${syncedCount > 1 ? 's' : ''}`);
    }
    if (remaining.length > 0) {
      toast.error(`${remaining.length} capture${remaining.length > 1 ? 's are' : ' is'} still pending sync`);
    }
  }, [readOfflineQueue, saveCaptureToFirestore, syncingQueue, user, writeOfflineQueue]);

  const closeModalAndReset = () => {
    setShowModal(false);
    reset();
    setGpsData(undefined);
    setSelectedCategories([]);
    setCaptureDateTime('');
    setConnectionImage(undefined);
  };

  const getImageThumbUrl = (app: any) =>
    app?.connectionImage?.thumbnailUrl || app?.connectionImage?.displayUrl || app?.connectionImage?.imageUrl || '';

  const getImageFullUrl = (app: any) =>
    app?.connectionImage?.displayUrl || app?.connectionImage?.imageUrl || app?.connectionImage?.thumbnailUrl || '';

  const resetPreviewView = () => {
    setPreviewImageUrl(null);
    setImageZoom(1);
    setImageOffset({ x: 0, y: 0 });
    pinchStartDistanceRef.current = null;
    dragStartPointRef.current = null;
  };

  const clampZoom = (zoom: number) => Math.max(1, Math.min(4, zoom));

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handlePreviewTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      pinchStartDistanceRef.current = getTouchDistance(e.touches);
      pinchStartZoomRef.current = imageZoom;
      dragStartPointRef.current = null;
      return;
    }

    if (e.touches.length === 1 && imageZoom > 1) {
      dragStartPointRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      dragStartOffsetRef.current = imageOffset;
    }
  };

  const handlePreviewTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistanceRef.current) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      if (!currentDistance) return;
      const scaleRatio = currentDistance / pinchStartDistanceRef.current;
      setImageZoom(clampZoom(pinchStartZoomRef.current * scaleRatio));
      return;
    }

    if (e.touches.length === 1 && dragStartPointRef.current && imageZoom > 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - dragStartPointRef.current.x;
      const dy = e.touches[0].clientY - dragStartPointRef.current.y;
      setImageOffset({
        x: dragStartOffsetRef.current.x + dx,
        y: dragStartOffsetRef.current.y + dy,
      });
    }
  };

  const handlePreviewTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      pinchStartDistanceRef.current = null;
    }
    if (e.touches.length === 0) {
      dragStartPointRef.current = null;
    }
  };

  const handlePreviewDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapTime < 280) {
      if (imageZoom > 1) {
        setImageZoom(1);
        setImageOffset({ x: 0, y: 0 });
      } else {
        setImageZoom(2);
      }
    }
    setLastTapTime(now);
  };

  const normalizeCategoryToken = (value: unknown) => String(value || '').trim().toLowerCase();
  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, normalizeCategoryToken(c.name)])),
    [categories]
  );

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (categoryFilterRef.current && !categoryFilterRef.current.contains(event.target as Node)) {
        setShowCategoryFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Load categories
  useEffect(() => {
    getActiveCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    const fetchAddress = async () => {
      if (!gpsData) {
        setCaptureDateTime('');
        return;
      }

      setCaptureDateTime(new Date().toLocaleString());
      setAutoAddressLoading(true);
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${gpsData.latitude}&lon=${gpsData.longitude}`
        );
        const json = await resp.json();
        if (json?.display_name) {
          setValue('address', json.display_name, { shouldValidate: true });
        }
      } catch (e) {
        console.error('Reverse geocoding failed:', e);
      } finally {
        setAutoAddressLoading(false);
      }
    };

    fetchAddress();
  }, [gpsData, setValue]);

  useEffect(() => {
    setPendingSyncCount(readOfflineQueue().length);
  }, [readOfflineQueue]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineQueue]);

  useEffect(() => {
    if (user && isOnline && pendingSyncCount > 0) {
      void syncOfflineQueue();
    }
  }, [isOnline, pendingSyncCount, syncOfflineQueue, user]);

  useEffect(() => {
    if (nearbyFilter !== 'nearby' || nearbyLocation) return;
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this device');
      setNearbyFilter('all');
      return;
    }

    setGettingNearbyLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNearbyLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGettingNearbyLocation(false);
      },
      () => {
        setGettingNearbyLocation(false);
        setNearbyFilter('all');
        toast.error('Please allow location access to use Nearby filter');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [nearbyFilter, nearbyLocation]);

  // Real-time listener (No manual refresh needed) - MUST be before conditional returns
  useEffect(() => {
    if (!user) return; // Early return in effect is okay
    setAppsLoading(true);
    
    const q = query(collection(db, "applications"), orderBy("lastUpdated", "desc"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const appsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setApps(appsData);
        setAppsLoading(false);
      },
      (error) => {
        console.error("Error fetching applications:", error);
        toast.error("Error loading applications. Please refresh the page.");
        setAppsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  // Filtered and searched applications - MUST be before conditional returns
  const filteredApps = useMemo(() => {
    if (!user) return [];
    
    const baseFiltered = apps.filter(app => {
      // Office-based access control
      const hasAccess = hasOfficeAccess(user.office, user.role, app.office);
      if (!hasAccess) return false;

      // Office filter (for Regional Engineer)
      if (officeFilter !== 'All' && app.office !== officeFilter) return false;

      const hasImage = !!(
        app?.connectionImage?.imageUrl ||
        app?.connectionImage?.displayUrl ||
        app?.connectionImage?.thumbnailUrl
      );
      if (imageFilter === 'with' && !hasImage) return false;
      if (imageFilter === 'without' && hasImage) return false;

      if (nearbyFilter === 'nearby') {
        if (!nearbyLocation || !hasValidGPS(app.gps)) return false;
      }

      // Category filter
      if (categoryFilters.length > 0) {
        const appCategoryValues = new Set<string>();

        (app.categories || []).forEach((categoryValue: any) => {
          if (typeof categoryValue === 'string') {
            appCategoryValues.add(normalizeCategoryToken(categoryValue));
            return;
          }

          if (categoryValue && typeof categoryValue === 'object') {
            if ('id' in categoryValue && categoryValue.id) {
              appCategoryValues.add(normalizeCategoryToken(categoryValue.id));
            }
            if ('name' in categoryValue && categoryValue.name) {
              appCategoryValues.add(normalizeCategoryToken(categoryValue.name));
            }
          }
        });

        (app.categoryObjects || []).forEach((category: Category) => {
          appCategoryValues.add(normalizeCategoryToken(category.id));
          appCategoryValues.add(normalizeCategoryToken(category.name));
        });

        const hasSelectedCategory = categoryFilters.some((categoryId) => {
          const categoryName = categoryNameById.get(categoryId);
          return (
            appCategoryValues.has(normalizeCategoryToken(categoryId)) ||
            (!!categoryName && appCategoryValues.has(categoryName))
          );
        });
        if (!hasSelectedCategory) return false;
      }

      const matchesSearch = 
        app.accountNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.address?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Date filter
      let matchesDate = true;
      if (fromDate || toDate) {
        const capturedDate = app.captureDateTime?.toDate?.() || app.lastUpdated?.toDate?.();
        if (capturedDate) {
          const appDate = new Date(capturedDate.setHours(0, 0, 0, 0));
          
          if (fromDate) {
            const from = new Date(new Date(fromDate).setHours(0, 0, 0, 0));
            if (appDate < from) matchesDate = false;
          }
          
          if (toDate) {
            const to = new Date(new Date(toDate).setHours(23, 59, 59, 999));
            if (appDate > to) matchesDate = false;
          }
        } else {
          matchesDate = false; // Exclude applications without date if filter is active
        }
      }
      
      return matchesSearch && matchesDate;
    });

    if (nearbyFilter === 'nearby' && nearbyLocation) {
      return [...baseFiltered].sort((a, b) => {
        const aDistance = hasValidGPS(a.gps)
          ? calculateDistance(nearbyLocation.latitude, nearbyLocation.longitude, a.gps.latitude, a.gps.longitude)
          : Number.POSITIVE_INFINITY;
        const bDistance = hasValidGPS(b.gps)
          ? calculateDistance(nearbyLocation.latitude, nearbyLocation.longitude, b.gps.latitude, b.gps.longitude)
          : Number.POSITIVE_INFINITY;
        return aDistance - bDistance;
      });
    }

    return baseFiltered;
  }, [apps, searchQuery, officeFilter, categoryFilters, imageFilter, fromDate, toDate, user, categoryNameById, nearbyFilter, nearbyLocation]);

  const stats = useMemo(() => ({
    total: filteredApps.length,
    gpsCaptured: filteredApps.filter((a) => hasValidGPS(a.gps)).length,
    categorized: filteredApps.filter((a) => (a.categories || []).length > 0).length,
    noGps: filteredApps.filter((a) => !hasValidGPS(a.gps)).length,
  }), [filteredApps]);
  const hasActiveFilters = categoryFilters.length > 0 || imageFilter !== 'all' || nearbyFilter !== 'all' || fromDate || toDate || (user?.role === ROLES.REGIONAL_ENGINEER && officeFilter !== 'All');

  // Show loading state while checking auth
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  // Export filtered applications to PDF
  const exportToPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('NWSDB Water Connection Applications', 14, 20);
      
      // Add office and date info
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Office: ${user.office}`, 14, 30);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);
      doc.text(`Officer: ${user.name}`, 14, 42);
      
      // Add filters info if any
      let yPos = 48;
      if (searchQuery) {
        doc.text(`Search: ${searchQuery}`, 14, yPos);
        yPos += 6;
      }
      if (fromDate || toDate) {
        const dateRange = `Date Range: ${fromDate || 'Start'} to ${toDate || 'End'}`;
        doc.text(dateRange, 14, yPos);
        yPos += 6;
      }
      if (categoryFilters.length > 0) {
        const selectedCategoryNames = categories
          .filter(c => categoryFilters.includes(c.id))
          .map(c => c.name)
          .join(', ');
        doc.text(`Categories: ${selectedCategoryNames}`, 14, yPos);
        yPos += 6;
      }
      
      // Add summary statistics
      yPos += 4;
      doc.setFontSize(10);
      doc.text(`Total Captures: ${filteredApps.length}`, 14, yPos);
      doc.text(`With GPS: ${filteredApps.filter(a => hasValidGPS(a.gps)).length}`, 80, yPos);
      doc.text(`Categorized: ${filteredApps.filter(a => (a.categories || []).length > 0).length}`, 130, yPos);
      
      // Prepare table data
      const tableData = filteredApps.map(app => [
        app.accountNumber || 'N/A',
        app.note || 'N/A',
        app.address || 'N/A',
        app.gps ? `${app.gps.latitude?.toFixed?.(6) || app.gps.latitude}, ${app.gps.longitude?.toFixed?.(6) || app.gps.longitude}` : 'N/A',
        app.captureDateTime?.toDate?.()?.toLocaleDateString() || app.lastUpdated?.toDate?.()?.toLocaleDateString() || 'N/A'
      ]);
      
      // Add table
      autoTable(doc, {
        startY: yPos + 8,
        head: [[
          'Account No',
          'Note',
          'Address',
          'GPS',
          'Captured Date'
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [3, 105, 161], // NWSDB Blue
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 8,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 30 },
          2: { cellWidth: 42 },
          3: { cellWidth: 28 },
          4: { cellWidth: 25 }
        },
        margin: { top: 10, left: 14, right: 14 },
        didDrawPage: (_data) => {
          // Add page numbers
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.text(
              `Page ${i} of ${pageCount}`,
              doc.internal.pageSize.width / 2,
              doc.internal.pageSize.height - 10,
              { align: 'center' }
            );
          }
        }
      });
      
      // Save the PDF
      const fileName = `${user.office.replace(/ /g, '_')}_Applications_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      // Log export action
      await logDataExport(user, 'pdf', filteredApps.length);
      
      toast.success(`PDF exported successfully! (${filteredApps.length} applications)`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  };

  // Export filtered applications to Excel
  const exportToExcel = async () => {
    setExporting(true);
    try {
      // Prepare worksheet data
      const worksheetData = [
        // Header with metadata
        ['NWSDB Water Connection Applications'],
        ['Office:', user.office],
        ['Generated:', new Date().toLocaleString()],
        ['Officer:', user.name],
        [],
        // Applied Filters
        ...(searchQuery ? [['Search Query:', searchQuery]] : []),
        ...(officeFilter !== 'All' && user.role === ROLES.REGIONAL_ENGINEER ? [['Office Filter:', officeFilter]] : []),
        ...(categoryFilters.length > 0 ? [['Category Filter:', categories.filter(c => categoryFilters.includes(c.id)).map(c => c.name).join(', ')]] : []),
        ...(fromDate || toDate ? [['Date Range:', `${fromDate || 'Start'} to ${toDate || 'End'}`]] : []),
        [],
        // Statistics
        ['Summary Statistics'],
        ['Total Captures:', filteredApps.length],
        ['With GPS:', filteredApps.filter(a => hasValidGPS(a.gps)).length],
        ['With Categories:', filteredApps.filter(a => (a.categories || []).length > 0).length],
        [],
        // Table Headers
        ['Account Number', 'Note', 'Address', 'GPS Coordinates', 'Captured Date', 'Last Updated'],
        // Table Data
        ...filteredApps.map(app => [
          app.accountNumber || 'N/A',
          app.note || 'N/A',
          app.address || 'N/A',
          app.gps ? `${app.gps.latitude?.toFixed?.(6) || app.gps.latitude}, ${app.gps.longitude?.toFixed?.(6) || app.gps.longitude}` : 'N/A',
          app.captureDateTime?.toDate?.()?.toLocaleDateString() || app.lastUpdated?.toDate?.()?.toLocaleDateString() || 'N/A',
          app.lastUpdated?.toDate?.()?.toLocaleDateString() || 'N/A'
        ])
      ];

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);

      // Set column widths
      ws['!cols'] = [
        { wch: 20 },  // Account Number
        { wch: 28 },  // Note
        { wch: 40 },  // Address
        { wch: 28 },  // GPS
        { wch: 16 },  // Captured Date
        { wch: 16 }   // Last Updated
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Applications');

      // Generate file name
      const fileName = `${user.office.replace(/ /g, '_')}_Applications_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);

      // Log export action
      await logDataExport(user, 'excel', filteredApps.length);

      toast.success(`Excel exported successfully! (${filteredApps.length} applications)`);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Failed to export Excel. Please try again.');
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  };

  const onCreate = async (data: any) => {
    const normalizedAccountNumber = formatAccountNumber(data.accountNumber || '');

    if (!normalizedAccountNumber || !gpsData) {
      toast.error("Account number and captured GPS location are required");
      return;
    }

    const capturePayload: OfflineCapturePayload = {
      accountNumber: normalizedAccountNumber,
      note: data.note || '',
      address: data.address || '',
      office: user.office,
      createdBy: user.email,
      categories: selectedCategories.length > 0 ? selectedCategories : [],
      connectionImage: connectionImage || null,
      gps: {
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        capturedBy: user.email,
        capturedAtMs: Date.now(),
        ...(typeof gpsData.accuracy === 'number' ? { accuracy: gpsData.accuracy } : {}),
      },
    };

    if (!navigator.onLine) {
      enqueueOfflineCapture(capturePayload);
      toast.success('No internet. Capture saved offline and queued for sync.');
      closeModalAndReset();
      return;
    }

    setCreating(true);
    try {
      const result = await saveCaptureToFirestore(capturePayload);
      if (result.status === 'duplicate') {
        toast.error("This account number already exists! Please use a unique account number.");
        setCreating(false);
        return;
      }

      toast.success("Location captured and connection saved successfully!");
      closeModalAndReset();
    } catch (e: any) {
      console.error("Error creating application:", e);
      toast.error(e?.message || "Error saving captured location. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout>
      <Toaster position="top-right" />
      
      {/* Header with User Info */}
      <div className="hidden sm:block mb-4 sm:mb-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Dashboard</h1>
            <div className="flex items-center gap-2 text-blue-100 text-sm sm:text-base">
              <Building2 size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
              <span className="font-medium truncate">{user.office}</span>
              <span className="text-blue-300 flex-shrink-0">•</span>
              <span className="text-xs sm:text-sm truncate">{user.role}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {user.role === ROLES.REGIONAL_ENGINEER && (
              <div className="bg-white/20 px-3 sm:px-4 py-2 rounded-lg backdrop-blur-sm flex-1 sm:flex-initial">
                <p className="text-[10px] sm:text-xs text-blue-100">Access Level</p>
                <p className="text-xs sm:text-sm font-semibold">All Offices</p>
              </div>
            )}
            <button
              onClick={() => setShowProfileDetails(!showProfileDetails)}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-transform active:scale-[0.98] border border-white/30 flex-1 sm:flex-initial"
            >
              <User size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="text-xs sm:text-sm font-medium">Profile</span>
              {showProfileDetails ? <ChevronUp size={14} className="sm:w-4 sm:h-4" /> : <ChevronDown size={14} className="sm:w-4 sm:h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Profile Details */}
        {showProfileDetails && (
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 animate-in slide-in-from-top duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg flex-shrink-0">
                  <User size={18} className="sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs text-blue-100 mb-0.5 sm:mb-1">Full Name</p>
                  <p className="text-xs sm:text-sm font-semibold truncate">{user.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg flex-shrink-0">
                  <Mail size={18} className="sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs text-blue-100 mb-0.5 sm:mb-1">Email Address</p>
                  <p className="text-xs sm:text-sm font-semibold break-all">{user.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg flex-shrink-0">
                  <Building2 size={18} className="sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs text-blue-100 mb-0.5 sm:mb-1">Office Location</p>
                  <p className="text-xs sm:text-sm font-semibold truncate">{user.office}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg flex-shrink-0">
                  <Shield size={18} className="sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs text-blue-100 mb-0.5 sm:mb-1">Role & Permissions</p>
                  <p className="text-xs sm:text-sm font-semibold truncate">{user.role}</p>
                </div>
              </div>

              {user.role === ROLES.REGIONAL_ENGINEER && (
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg flex-shrink-0">
                    <Activity size={18} className="sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs text-blue-100 mb-0.5 sm:mb-1">Access Scope</p>
                    <p className="text-xs sm:text-sm font-semibold">All Offices & Applications</p>
                  </div>
                </div>
              )}

              {user.role === ROLES.ACTING_OFFICER && (
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg flex-shrink-0">
                    <Activity size={18} className="sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs text-blue-100 mb-0.5 sm:mb-1">Access Scope</p>
                    <p className="text-xs sm:text-sm font-semibold">Office Applications Only</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Stats Row */}
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {appsLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={`stats-skeleton-${index}`} className="min-w-[160px] sm:min-w-0 snap-start bg-white p-3 sm:p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 sm:gap-4 animate-pulse">
              <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-lg bg-gray-200 flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-6 sm:h-7 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="min-w-[160px] sm:min-w-0 snap-start">
              <StatCard label="Total Applications" value={stats.total} icon={Users} color="bg-blue-600" />
            </div>
            <div className="min-w-[160px] sm:min-w-0 snap-start">
              <StatCard label="GPS Captured" value={stats.gpsCaptured} icon={MapPin} color="bg-green-600" />
            </div>
            <div className="min-w-[160px] sm:min-w-0 snap-start">
              <StatCard label="Categorized" value={stats.categorized} icon={Activity} color="bg-purple-600" />
            </div>
            <div className="min-w-[160px] sm:min-w-0 snap-start">
              <StatCard label="No GPS" value={stats.noGps} icon={AlertCircle} color="bg-orange-500" />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="sm:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMobileFilters((prev) => !prev)}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg border transition-all duration-200 ease-out active:scale-[0.98]",
              showMobileFilters
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-300 bg-white text-gray-700"
            )}
          >
            <span className="inline-flex items-center justify-center gap-2 text-sm font-semibold">
              <Filter size={16} />
              {showMobileFilters ? 'Hide Filters' : 'Filters'}
            </span>
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setCategoryFilters([]);
                setImageFilter('all');
                setNearbyFilter('all');
                setFromDate('');
                setToDate('');
                if (user.role === ROLES.REGIONAL_ENGINEER) {
                  setOfficeFilter('All');
                }
              }}
              className="px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-600 text-sm font-medium transition-all duration-200 ease-out active:scale-[0.98]"
            >
              Clear
            </button>
          )}
        </div>
        <div
          className={cn(
            "w-full sm:flex-1 sm:min-w-0 sm:overflow-visible transition-all duration-300 ease-out",
            "sm:max-h-none sm:opacity-100 sm:translate-y-0",
            showCategoryFilterMenu ? "overflow-visible" : "overflow-hidden",
            showMobileFilters
              ? "max-h-[720px] opacity-100 translate-y-0"
              : "max-h-0 opacity-0 -translate-y-1 pointer-events-none sm:pointer-events-auto"
          )}
        >
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full flex-wrap">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search Account No, Address..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-10 pr-10 w-full py-2 sm:py-2.5 bg-white border border-gray-300 rounded-lg text-sm",
                "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              )}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Office Filter - Only for Regional Engineer */}
          {user.role === ROLES.REGIONAL_ENGINEER && (
            <div className="relative w-full sm:w-auto">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={officeFilter}
                onChange={(e) => setOfficeFilter(e.target.value as Office | 'All')}
                className={cn(
                  "pl-10 pr-8 py-2 sm:py-2.5 w-full bg-white border border-gray-300 rounded-lg text-sm",
                  "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                )}
              >
                <option value="All">All Offices</option>
                {OFFICE_LIST.map(office => (
                  <option key={office.value} value={office.value}>{office.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Category Multi-Select Filter */}
          <div className="relative w-full sm:w-auto" ref={categoryFilterRef}>
             <button
              type="button"
              onClick={() => setShowCategoryFilterMenu(prev => !prev)}
              className={cn(
                "w-full sm:w-56 pl-10 pr-8 py-2.5 sm:py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-left",
                "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all",
                categoryFilters.length > 0 && "border-blue-400 bg-blue-50/40"
              )}
            >
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              {categoryFilters.length === 0 ? 'All Categories' : `${categoryFilters.length} Categories Selected`}
            </button>

            {showCategoryFilterMenu && (
              <div className="relative z-20 sm:absolute sm:z-50 mt-1 w-full sm:w-72 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg p-2 animate-in fade-in zoom-in-95 duration-150">
                {categories.length === 0 ? (
                  <p className="text-xs text-gray-500 px-2 py-1">No categories available</p>
                ) : (
                  categories.map((category) => (
                    <label key={category.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={categoryFilters.includes(category.id)}
                        onChange={() => {
                          setCategoryFilters((prev) =>
                            prev.includes(category.id)
                              ? prev.filter((id) => id !== category.id)
                              : [...prev, category.id]
                          );
                          setShowCategoryFilterMenu(false);
                        }}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm text-gray-700">{category.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="relative w-full sm:w-auto">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={imageFilter}
              onChange={(e) => setImageFilter(e.target.value as 'all' | 'with' | 'without')}
              className={cn(
                "pl-10 pr-8 py-2 sm:py-2.5 w-full sm:w-48 bg-white border border-gray-300 rounded-lg text-sm",
                "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
              )}
            >
              <option value="all">All Images</option>
              <option value="with">With Image</option>
              <option value="without">No Image</option>
            </select>
          </div>

          <div className="relative w-full sm:w-auto">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={nearbyFilter}
              onChange={(e) => setNearbyFilter(e.target.value as 'all' | 'nearby')}
              className={cn(
                "pl-10 pr-8 py-2 sm:py-2.5 w-full sm:w-44 bg-white border border-gray-300 rounded-lg text-sm",
                "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer",
                nearbyFilter === 'nearby' && "border-emerald-400 bg-emerald-50/40"
              )}
              disabled={gettingNearbyLocation}
            >
              <option value="all">All Locations</option>
              <option value="nearby">Nearby Me</option>
            </select>
          </div>

          {categoryFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 sm:max-w-md sm:order-none order-last">
              {categoryFilters.map((categoryId) => {
                const category = categories.find((c) => c.id === categoryId);
                return (
                  <button
                    key={categoryId}
                    type="button"
                    onClick={() => setCategoryFilters((prev) => prev.filter((id) => id !== categoryId))}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs hover:bg-blue-100"
                    title="Remove category filter"
                  >
                    <span>{category?.name || categoryId}</span>
                    <X size={12} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Date Range Filter */}
          <div className="hidden sm:flex gap-2 w-full sm:w-auto sm:items-center">
            <div className="relative flex-1 sm:w-40">
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="From Date"
                className={cn(
                  "pl-3 pr-3 w-full py-2 sm:py-2.5 bg-white border border-gray-300 rounded-lg text-sm",
                  "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                )}
                title="From Date"
              />
            </div>
            <div className="relative flex-1 sm:w-40">
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="To Date"
                className={cn(
                  "pl-3 pr-3 w-full py-2 sm:py-2.5 bg-white border border-gray-300 rounded-lg text-sm",
                  "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                )}
                title="To Date"
              />
            </div>
            {(fromDate || toDate) && (
              <button 
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Clear date filter"
              >
                <X size={18} />
              </button>
            )}
            {categoryFilters.length > 0 && (
              <button
                onClick={() => setCategoryFilters([])}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Clear category filter"
              >
                <X size={18} />
              </button>
            )}
            {imageFilter !== 'all' && (
              <button
                onClick={() => setImageFilter('all')}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Clear image filter"
              >
                <X size={18} />
              </button>
            )}
            {nearbyFilter !== 'all' && (
              <button
                onClick={() => setNearbyFilter('all')}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Clear nearby filter"
              >
                <X size={18} />
              </button>
            )}
          </div>
          </div>
        </div>

         {/* Mobile-First Action Buttons - Optimized Layout */}
         <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:self-start sm:shrink-0">
          {(pendingSyncCount > 0 || syncingQueue || !isOnline) && (
            <div className="w-full sm:w-auto flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5">
                {syncingQueue ? <Loader2 size={14} className="animate-spin" /> : <AlertCircle size={14} />}
                <span>
                  {syncingQueue
                    ? 'Syncing offline captures...'
                    : pendingSyncCount > 0
                      ? `${pendingSyncCount} pending sync`
                      : 'Offline mode active'}
                </span>
              </div>
              {isOnline && pendingSyncCount > 0 && !syncingQueue && (
                <button
                  type="button"
                  onClick={() => void syncOfflineQueue()}
                  className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 font-medium"
                >
                  Sync now
                </button>
              )}
            </div>
          )}
          {/* Primary Actions Row - Side by Side on Mobile */}
          <div className="flex gap-2 w-full sm:w-auto">
            {/* Export Dropdown - Responsive */}
            <div className="relative flex-1 sm:flex-none min-w-0 sm:self-center" ref={exportMenuRef}>
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={exporting || filteredApps.length === 0}
                className={cn(
                  "w-full min-w-[110px] bg-gradient-to-r from-green-600 to-green-700 text-white",
                  "px-4 sm:px-5 py-3 sm:py-2.5 sm:h-11 sm:py-0 rounded-lg flex items-center justify-center gap-2",
                  "text-sm sm:text-base font-semibold shadow-md",
                  "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-md"
                )}
                title={filteredApps.length === 0 ? 'No data to export' : 'Export data'}
              >
                {exporting ? (
                  <>
                    <Loader2 size={18} className="sm:w-[18px] sm:h-[18px] animate-spin flex-shrink-0" />
                    <span className="hidden sm:inline">Exporting...</span>
                    <span className="sm:hidden truncate">Wait...</span>
                  </>
                ) : (
                  <>
                    <FileDown size={18} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                    <span className="hidden sm:inline">Export</span>
                    <span className="sm:hidden truncate">Export</span>
                    <ChevronDown size={16} className="flex-shrink-0 ml-0.5" />
                  </>
                )}
              </button>

              {/* Dropdown Menu - Mobile Enhanced */}
              {showExportMenu && !exporting && (
                <div className="absolute right-0 left-0 sm:left-auto sm:right-0 mt-2 sm:w-56 bg-white rounded-xl shadow-2xl border-2 border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={exportToPDF}
                    className="w-full px-4 py-3.5 text-left hover:bg-red-50 active:bg-red-100 flex items-center gap-3 transition-colors border-b border-gray-100"
                  >
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                      <FileDown size={20} className="text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">Export as PDF</p>
                      <p className="text-xs text-gray-500 truncate">Download PDF document</p>
                    </div>
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="w-full px-4 py-3.5 text-left hover:bg-green-50 active:bg-green-100 flex items-center gap-3 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet size={20} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">Export as Excel</p>
                      <p className="text-xs text-gray-500 truncate">Download XLSX spreadsheet</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Capture Button - Primary Action */}
             <button 
               onClick={() => {
                 if (!isOnline) {
                  toast('Offline mode: GPS capture works. Images are stored locally and uploaded on sync.');
                 }
                 setShowModal(true);
               }} 
               className={cn(
                 "flex-1 sm:flex-none min-w-[130px] bg-gradient-to-r from-nwsdbBlue to-blue-700 text-white",
                 "px-4 sm:px-5 py-3 sm:py-2.5 sm:h-11 sm:py-0 rounded-lg flex items-center justify-center gap-2",
                "text-sm sm:text-base font-semibold shadow-md",
                "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200",
                "ring-2 ring-blue-400/20"
              )}
            >
              <Plus size={18} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
              <span className="hidden sm:inline">Capture Location</span>
              <span className="sm:hidden truncate">Capture</span>
              {pendingSyncCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 text-[10px] rounded-full bg-white/25 font-bold">
                  {pendingSyncCount}
                </span>
              )}
             </button>
          </div>
        </div>
      </div>

      {/* Modern Table - Desktop View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-hidden">
        {appsLoading ? (
          <div className="p-4 sm:p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`desktop-skeleton-${index}`} className="grid grid-cols-6 gap-4 items-center animate-pulse">
                <div className="h-4 bg-gray-200 rounded col-span-1" />
                <div className="h-10 bg-gray-200 rounded col-span-1" />
                <div className="h-4 bg-gray-200 rounded col-span-1" />
                <div className="h-4 bg-gray-200 rounded col-span-1" />
                <div className="h-4 bg-gray-200 rounded col-span-1" />
                <div className="h-8 bg-gray-200 rounded col-span-1" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 font-semibold uppercase text-xs border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4">Account Number</th>
                  {user.role === ROLES.REGIONAL_ENGINEER && <th className="px-6 py-4">Office</th>}
                  <th className="px-6 py-4">Image</th>
                  <th className="px-6 py-4">Captured At</th>
                  <th className="px-6 py-4">Categories</th>
                  <th className="px-6 py-4">GPS</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApps.length === 0 ? (
                <tr>
                    <td colSpan={user.role === ROLES.REGIONAL_ENGINEER ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="text-gray-300" size={48} />
                      <p className="text-lg font-medium">No captures found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => {
                  const appCategoryIds = Array.isArray(app.categories) ? app.categories : [];
                  const connCategories = categories.filter((cat) => appCategoryIds.includes(cat.id));
                  const nearbyDistanceKm =
                    nearbyFilter === 'nearby' && nearbyLocation && hasValidGPS(app.gps)
                      ? calculateDistance(
                          nearbyLocation.latitude,
                          nearbyLocation.longitude,
                          app.gps.latitude,
                          app.gps.longitude
                        )
                      : null;
                  return (
                  <tr key={app.id} className="hover:bg-blue-50/30 transition-colors duration-150 cursor-pointer" onClick={() => navigate(`/application/${app.id}`)}>
                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                        {app.accountNumber || 'N/A'}
                      </span>
                    </td>
                    {user.role === ROLES.REGIONAL_ENGINEER && (
                      <td className="px-6 py-4">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                          {OFFICE_LIST.find(o => o.value === app.office)?.code || 'N/A'}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      {getImageThumbUrl(app) ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImageUrl(getImageFullUrl(app));
                            setImageZoom(1);
                            setImageOffset({ x: 0, y: 0 });
                          }}
                          className="inline-block rounded-md overflow-hidden border border-gray-200 hover:ring-2 hover:ring-blue-400"
                          title="Open image"
                        >
                          <img
                            src={getImageThumbUrl(app)}
                            alt="Connection"
                            className="w-10 h-10 object-cover bg-gray-100"
                          />
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      <div className="space-y-1">
                        <div>{formatDate(app.captureDateTime || app.lastUpdated)}</div>
                        {nearbyDistanceKm !== null && (
                          <div className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <MapPin size={11} />
                            <span>{formatDistance(nearbyDistanceKm)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {connCategories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {connCategories.slice(0, 2).map(cat => (
                            <CategoryBadge key={cat.id} category={cat} size="sm" />
                          ))}
                          {connCategories.length > 2 && (
                            <span className="text-xs text-gray-500">+{connCategories.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {hasValidGPS(app.gps) ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToLocation({
                                latitude: app.gps.latitude,
                                longitude: app.gps.longitude,
                                label: app.accountNumber || 'Connection'
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium"
                            title="Navigate to location"
                          >
                            <Navigation size={14} />
                            <span>Navigate</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-gray-100 text-gray-400 text-xs font-medium">
                            <MapPin size={14} />
                            <span>Map</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-gray-100 text-gray-400 text-xs font-medium">
                            <Navigation size={14} />
                            <span>Navigate</span>
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/application/${app.id}`);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold whitespace-nowrap"
                      >
                        <Eye size={14} />
                        View →
                      </button>
                    </td>
                  </tr>
                );
                })
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Results Counter */}
        {!appsLoading && filteredApps.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filteredApps.length}</span> of <span className="font-semibold text-gray-900">{apps.length}</span> applications
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {appsLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={`mobile-skeleton-${index}`} className="bg-white rounded-xl shadow-sm border p-4 animate-pulse">
              <div className="flex justify-between items-start mb-3">
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-36 bg-gray-200 rounded" />
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                </div>
                <div className="w-16 h-16 bg-gray-200 rounded-lg" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-8 bg-gray-200 rounded w-full mt-2" />
              </div>
            </div>
          ))
        ) : filteredApps.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <Search className="text-gray-300 mx-auto mb-3" size={48} />
            <p className="text-gray-600 font-medium">No captures found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
             {filteredApps.map((app) => {
               const appCategoryIds = Array.isArray(app.categories) ? app.categories : [];
               const cardCategories = categories.filter((cat) => appCategoryIds.includes(cat.id));
               const nearbyDistanceKm =
                 nearbyFilter === 'nearby' && nearbyLocation && hasValidGPS(app.gps)
                   ? calculateDistance(
                       nearbyLocation.latitude,
                       nearbyLocation.longitude,
                       app.gps.latitude,
                       app.gps.longitude
                     )
                   : null;
               return (
               <div
                 key={app.id}
                onClick={() => navigate(`/application/${app.id}`)}
                className="bg-white rounded-xl shadow-sm border p-4 active:scale-[0.98] transition-transform"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                      {app.accountNumber || 'N/A'}
                    </span>
                    {user.role === ROLES.REGIONAL_ENGINEER && (
                      <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                        {OFFICE_LIST.find(o => o.value === app.office)?.code || 'N/A'}
                      </span>
                    )}
                  </div>
                  {getImageThumbUrl(app) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImageUrl(getImageFullUrl(app));
                        setImageZoom(1);
                        setImageOffset({ x: 0, y: 0 });
                      }}
                      className="ml-2 inline-block rounded-lg overflow-hidden border border-gray-200 shadow-sm"
                      title="Open image"
                    >
                      <img
                        src={getImageThumbUrl(app)}
                        alt="Connection"
                        className="w-16 h-16 object-cover bg-gray-100"
                      />
                    </button>
                  ) : null}
                </div>

                {/* Details */}
                <div className="space-y-2">
                  {!getImageThumbUrl(app) && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs">Image:</span>
                      <span className="text-xs text-gray-400">No image</span>
                    </div>
                  )}
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Account:</span>
                      <span className="font-mono text-gray-700 truncate">{app.accountNumber || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">GPS:</span>
                      <span className={cn(
                        "font-medium",
                        hasValidGPS(app.gps) ? "text-green-700" : "text-orange-700"
                      )}>
                        {hasValidGPS(app.gps) ? 'Captured' : 'Not captured'}
                      </span>
                    </div>
                  </div>

                  {cardCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {cardCategories.slice(0, 2).map((cat) => (
                        <CategoryBadge key={cat.id} category={cat} size="sm" />
                      ))}
                      {cardCategories.length > 2 && (
                        <span className="text-xs text-gray-500">+{cardCategories.length - 2}</span>
                      )}
                    </div>
                  )}

                    <div className="text-xs text-gray-500 pt-2 border-t space-y-2">
                      <span className="block">Captured: {formatDate(app.captureDateTime || app.lastUpdated)}</span>
                      {nearbyDistanceKm !== null && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <MapPin size={11} />
                          <span>{formatDistance(nearbyDistanceKm)}</span>
                        </span>
                      )}
                    <div className="flex items-center justify-between gap-2">
                      {hasValidGPS(app.gps) ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => navigate('/map', { state: { focusConnection: app.id } })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium"
                            title="View on map"
                          >
                            <MapPin size={14} />
                            <span>Map</span>
                          </button>
                          <button
                            onClick={() =>
                              navigateToLocation({
                                latitude: app.gps.latitude,
                                longitude: app.gps.longitude,
                                label: app.accountNumber || 'Connection'
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium"
                            title="Navigate to location"
                          >
                            <Navigation size={14} />
                            <span>Navigate</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-gray-100 text-gray-400 text-xs font-medium">
                            <MapPin size={14} />
                            <span>Map</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-gray-100 text-gray-400 text-xs font-medium">
                            <Navigation size={14} />
                            <span>Navigate</span>
                          </span>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/application/${app.id}`);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold"
                      >
                        <Eye size={14} />
                        View →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
            
            {/* Mobile Results Counter */}
            <div className="bg-white rounded-xl p-3 text-center text-sm text-gray-600 border">
              Showing <span className="font-semibold text-gray-900">{filteredApps.length}</span> of <span className="font-semibold text-gray-900">{apps.length}</span> applications
            </div>
          </>
        )}
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 backdrop-blur-sm p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !creating) {
              closeModalAndReset();
            }
          }}
        >
          <div className="bg-white rounded-t-3xl sm:rounded-xl p-4 sm:p-6 md:p-8 w-full max-w-lg shadow-2xl animate-in fade-in slide-in-from-bottom sm:zoom-in duration-300 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 border-b border-gray-200 sm:border-0">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">Capture Connection Location</h2>
              <button
                type="button"
                onClick={closeModalAndReset}
                className="sm:hidden p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Close"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 -mt-2 mb-3 sm:mb-4">
              Fill required fields and capture GPS before saving.
            </p>

            <form onSubmit={handleSubmit(onCreate)} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("accountNumber", {
                    required: "Account number is required",
                    onChange: (e) => {
                      e.target.value = formatAccountNumber(e.target.value || '');
                    }
                  })}
                  className={cn(
                    "w-full border-2 px-3 py-3 sm:py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base sm:text-sm transition-colors",
                    errors.accountNumber ? "border-red-500 bg-red-50" : "border-gray-300"
                  )}
                  placeholder="e.g. 42/08/310/014/17"
                  inputMode="numeric"
                  autoComplete="off"
                />
                {errors.accountNumber && (
                  <p className="text-red-600 text-xs sm:text-sm mt-1.5 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-red-600"></span>
                    {errors.accountNumber.message as string}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Note
                </label>
                <textarea
                  {...register("note")}
                  className="w-full border-2 border-gray-300 px-3 py-3 sm:py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-base sm:text-sm transition-colors"
                  placeholder="Add location note (optional)"
                  rows={3}
                  maxLength={300}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Select Categories
                </label>
                <CategorySelector
                  selectedCategories={selectedCategories}
                  onChange={setSelectedCategories}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Capture GPS Location <span className="text-red-500">*</span>
                </label>
                <GPSCapture
                  value={gpsData}
                  onChange={setGpsData}
                  required
                  showMap={false}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Connection Image (Optional)
                </label>
                <ImageCaptureUpload
                  value={connectionImage}
                  onChange={setConnectionImage}
                  disabled={creating}
                  showInlinePreview={false}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Capture Date & Time (Auto)
                </label>
                <input
                  value={captureDateTime}
                  readOnly
                  className="w-full border-2 border-gray-200 px-3 py-3 sm:py-2.5 rounded-lg bg-gray-50 text-gray-600 text-base sm:text-sm cursor-not-allowed"
                  placeholder="Auto filled when GPS captured"
                />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span>Address (Auto from GPS)</span>
                  {autoAddressLoading && (
                    <span className="inline-flex items-center gap-1 text-blue-600 text-xs font-medium">
                      <Loader2 size={12} className="animate-spin" />
                      Fetching...
                    </span>
                  )}
                </label>
                <textarea
                  {...register("address")}
                  className={cn(
                    "w-full border-2 border-gray-300 px-3 py-3 sm:py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-base sm:text-sm transition-colors",
                    autoAddressLoading && "bg-gray-50 animate-pulse"
                  )}
                  placeholder={autoAddressLoading ? "Fetching address from map..." : "Address will auto-fill from captured GPS"}
                  rows={3}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4 sticky bottom-0 bg-white sm:static -mx-4 sm:mx-0 px-4 sm:px-0 pb-4 sm:pb-0 border-t sm:border-0 border-gray-200">
                <button
                  type="button"
                  onClick={closeModalAndReset}
                  disabled={creating}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 sm:py-2.5 rounded-lg hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50 font-semibold text-base sm:text-sm transition-all active:scale-[0.98] order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className={cn(
                    "flex-1 bg-gradient-to-r from-nwsdbBlue to-blue-700 text-white py-3 sm:py-2.5 rounded-lg hover:shadow-lg font-semibold text-base sm:text-sm",
                    "flex items-center justify-center gap-2",
                    "disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]",
                    "order-1 sm:order-2"
                  )}
                >
                  {creating ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Creating...</span>
                    </>
                  ) : (
                    "Save Captured Location"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewImageUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center"
          onClick={resetPreviewView}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden touch-none"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handlePreviewTouchStart}
            onTouchMove={handlePreviewTouchMove}
            onTouchEnd={handlePreviewTouchEnd}
          >
            <button
              type="button"
              onClick={resetPreviewView}
              className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Close image preview"
            >
              <X size={20} />
            </button>
            <button
              type="button"
              onClick={() => {
                setImageZoom(1);
                setImageOffset({ x: 0, y: 0 });
              }}
              className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 px-2.5 py-1.5 rounded-full bg-black/60 text-white text-xs hover:bg-black/80"
            >
              Reset Zoom
            </button>
            <img
              src={previewImageUrl}
              alt="Connection preview"
              onDoubleClick={handlePreviewDoubleTap}
              className="w-full h-auto max-h-[90vh] object-contain rounded-xl bg-black select-none"
              style={{
                transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${imageZoom})`,
                transition: 'transform 120ms ease-out',
                transformOrigin: 'center center',
              }}
            />
            <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
              Pinch or double-tap to zoom
            </p>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;
