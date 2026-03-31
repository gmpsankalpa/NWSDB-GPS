import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Layout from '../components/Layout';
import GPSCapture from '../components/GPSCapture';
import CategorySelector, { CategoryBadge } from '../components/CategorySelector';
import NavigationButton from '../components/NavigationButton';
import { ArrowLeft, Save, Trash2, Loader2, MapPin, Calendar, FileText } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { formatDate, cn, formatAccountNumber } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { hasOfficeAccess } from '../lib/offices';
import { getCategoriesByIds } from '../lib/categoryService';
import { hasValidGPS } from '../lib/gpsUtils';
import type { Category } from '../lib/types';

const ApplicationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [data, setData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [autoAddressLoading, setAutoAddressLoading] = useState(false);

  const [accountNumber, setAccountNumber] = useState('');
  const [note, setNote] = useState('');
  const [address, setAddress] = useState('');
  const [gpsData, setGpsData] = useState<{ latitude: number; longitude: number; accuracy?: number } | undefined>();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryObjects, setCategoryObjects] = useState<Category[]>([]);
  const [captureDateTime, setCaptureDateTime] = useState('');

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!id || !user) return;

    const unsub = onSnapshot(
      doc(db, 'applications', id),
      async (snap) => {
        if (!snap.exists()) {
          toast.error('Capture not found');
          navigate('/dashboard');
          return;
        }

        const appData = snap.data();
        if (!hasOfficeAccess(user.office, user.role, appData.office)) {
          toast.error("You don't have access to this record");
          navigate('/dashboard');
          return;
        }

        setData(appData);
        setAccountNumber(formatAccountNumber(appData.accountNumber || ''));
        setNote(appData.note || '');
        setAddress(appData.address || '');
        setSelectedCategories(appData.categories || []);
        setGpsData(
          appData.gps
            ? {
                latitude: appData.gps.latitude,
                longitude: appData.gps.longitude,
                accuracy: appData.gps.accuracy,
              }
            : undefined
        );
        setCaptureDateTime(
          appData.captureDateTime?.toDate?.()?.toLocaleString() ||
            appData.lastUpdated?.toDate?.()?.toLocaleString() ||
            ''
        );

        const cats = await getCategoriesByIds(appData.categories || []);
        setCategoryObjects(cats);
      },
      () => {
        toast.error('Error loading capture details');
      }
    );

    return () => unsub();
  }, [id, user, navigate]);

  useEffect(() => {
    const fetchAddress = async () => {
      if (!gpsData) return;
      setAutoAddressLoading(true);
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${gpsData.latitude}&lon=${gpsData.longitude}`
        );
        const json = await resp.json();
        if (json?.display_name) setAddress(json.display_name);
        setCaptureDateTime(new Date().toLocaleString());
      } catch {
        // keep manual address if reverse geocode fails
      } finally {
        setAutoAddressLoading(false);
      }
    };
    fetchAddress();
  }, [gpsData]);

  const handleSave = async () => {
    if (!id) return;
    if (!accountNumber.trim()) {
      toast.error('Account number is required');
      return;
    }
    if (!gpsData) {
      toast.error('GPS location is required');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'applications', id), {
        accountNumber: formatAccountNumber(accountNumber),
        note: note.trim(),
        address: address.trim(),
        categories: selectedCategories,
        gps: {
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
          capturedAt: Timestamp.now(),
          capturedBy: user?.email || 'unknown',
          ...(typeof gpsData.accuracy === 'number' ? { accuracy: gpsData.accuracy } : {}),
        },
        captureDateTime: Timestamp.now(),
        lastUpdated: Timestamp.now(),
      });
      toast.success('Capture updated successfully');
    } catch {
      toast.error('Failed to update capture');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Delete this captured location?')) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'applications', id));
      toast.success('Capture deleted');
      navigate('/dashboard');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96 text-gray-600">Loading capture details...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Toaster position="top-right" />

      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={18} /> Back
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 inline-flex items-center gap-2"
              >
                <Trash2 size={16} /> Delete
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Captured Location Details</h1>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Account Number</label>
                <input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(formatAccountNumber(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="42/08/310/042/17"
                />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 resize-none"
              placeholder="Add note about this connection"
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Categories</label>
            <CategorySelector selectedCategories={selectedCategories} onChange={setSelectedCategories} />
            {categoryObjects.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {categoryObjects.map((cat) => (
                  <CategoryBadge key={cat.id} category={cat} size="sm" />
                ))}
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Capture GPS Location</label>
            <GPSCapture value={gpsData} onChange={setGpsData} required showMap={false} />
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Address (Auto from GPS)</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className={cn('w-full border rounded-lg px-3 py-2 resize-none', autoAddressLoading && 'bg-gray-50')}
              placeholder={autoAddressLoading ? 'Fetching address from map...' : 'Address'}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="text-sm text-gray-600 inline-flex items-center gap-2">
                <Calendar size={16} />
                Capture Date & Time
              </div>
              <div className="font-medium text-gray-900 mt-1">{captureDateTime || '-'}</div>
            </div>

            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="text-sm text-gray-600 inline-flex items-center gap-2">
                <MapPin size={16} />
                GPS Coordinates
              </div>
              <div className="font-medium text-gray-900 mt-1">
                {hasValidGPS(gpsData as any)
                  ? `${gpsData?.latitude?.toFixed(6)}, ${gpsData?.longitude?.toFixed(6)}`
                  : 'Not captured'}
              </div>
            </div>
          </div>

          {hasValidGPS(gpsData as any) && (
            <div className="mt-4">
              <NavigationButton
                latitude={gpsData!.latitude}
                longitude={gpsData!.longitude}
                label={accountNumber || 'Connection'}
                variant="primary"
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2 inline-flex items-center gap-2">
            <FileText size={18} />
            Record Info
          </h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <strong>Office:</strong> {data.office || 'N/A'}
            </p>
            <p>
              <strong>Created by:</strong> {data.createdBy || 'N/A'}
            </p>
            <p>
              <strong>Last updated:</strong> {formatDate(data.lastUpdated)}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ApplicationDetails;

