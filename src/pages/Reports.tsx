import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Download, Building2, Calendar, MapPin, Tags, Clock, Filter, BarChart3 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Layout from '../components/Layout';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { OFFICE_LIST, ROLES, hasOfficeAccess, type Office } from '../lib/offices';
import { cn, formatDate } from '../lib/utils';
import { hasValidGPS } from '../lib/gpsUtils';
import { getActiveCategories } from '../lib/categoryService';
import type { Category } from '../lib/types';

interface ReportConnection {
  id: string;
  accountNumber?: string;
  note?: string;
  address?: string;
  office?: Office;
  categories?: string[];
  gps?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  captureDateTime?: any;
  lastUpdated?: any;
}

const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ReportConnection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [officeFilter, setOfficeFilter] = useState<Office | 'All'>('All');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  useEffect(() => {
    getActiveCategories().then(setCategories).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'applications'), orderBy('lastUpdated', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setConnections(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ReportConnection)));
        setLoading(false);
      },
      () => {
        toast.error('Failed to load report data');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const filtered = useMemo(() => {
    if (!user) return [];

    const now = new Date();
    const from = new Date();
    if (dateRange === 'today') from.setHours(0, 0, 0, 0);
    if (dateRange === 'week') from.setDate(now.getDate() - 7);
    if (dateRange === 'month') from.setMonth(now.getMonth() - 1);
    if (dateRange === 'year') from.setFullYear(now.getFullYear() - 1);

    return connections.filter((conn) => {
      if (!conn.office) return false;
      if (!hasOfficeAccess(user.office, user.role, conn.office)) return false;
      if (officeFilter !== 'All' && conn.office !== officeFilter) return false;

      if (categoryFilter !== 'All') {
        if (!(conn.categories || []).includes(categoryFilter)) return false;
      }

      const dt = conn.captureDateTime?.toDate?.() || conn.lastUpdated?.toDate?.() || null;
      if (!dt) return false;

      // Exact date range overrides quick range buttons
      if (fromDate || toDate) {
        if (fromDate) {
          const fromExact = new Date(fromDate);
          fromExact.setHours(0, 0, 0, 0);
          if (dt < fromExact) return false;
        }
        if (toDate) {
          const toExact = new Date(toDate);
          toExact.setHours(23, 59, 59, 999);
          if (dt > toExact) return false;
        }
        return true;
      }

      if (dateRange === 'all') return true;
      return dt >= from;
    });
  }, [connections, user, officeFilter, dateRange, fromDate, toDate, categoryFilter]);

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  const stats = useMemo(() => {
    const withGps = filtered.filter((c) => hasValidGPS(c.gps)).length;
    const withoutGps = filtered.length - withGps;
    const withCategories = filtered.filter((c) => (c.categories || []).length > 0).length;

    const officeCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    filtered.forEach((c) => {
      officeCounts[c.office || 'Unknown'] = (officeCounts[c.office || 'Unknown'] || 0) + 1;
      (c.categories || []).forEach((catId) => {
        const name = categoryNameById.get(catId) || catId;
        categoryCounts[name] = (categoryCounts[name] || 0) + 1;
      });
    });

    return { total: filtered.length, withGps, withoutGps, withCategories, officeCounts, categoryCounts };
  }, [filtered, categoryNameById]);

  const exportCsv = () => {
    const headers = [
      'Account Number',
      'Office',
      'Note',
      'Address',
      'Categories',
      'GPS Captured',
      'Capture Date Time',
    ];

    const rows = filtered.map((c) => [
      c.accountNumber || 'N/A',
      c.office || 'N/A',
      (c.note || '').replace(/,/g, ';'),
      (c.address || '').replace(/,/g, ';'),
      (c.categories || []).map((id) => categoryNameById.get(id) || id).join('|'),
      hasValidGPS(c.gps) ? 'Yes' : 'No',
      formatDate(c.captureDateTime || c.lastUpdated),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const selectedCategoryName = categories.find((c) => c.id === categoryFilter)?.name || categoryFilter;
    const officePart = officeFilter === 'All' ? 'all-offices' : String(officeFilter).replace(/\s+/g, '-');
    const datePart = fromDate || toDate ? `${fromDate || 'start'}_to_${toDate || 'end'}` : dateRange;
    const categoryPart = categoryFilter === 'All' ? 'all-categories' : selectedCategoryName.replace(/\s+/g, '-');
    link.download = `NWSDB_GPS_Report_${officePart}_${datePart}_${categoryPart}.csv`;
    link.click();
    toast.success('CSV exported');
  };

  if (!user) return null;
  if (loading) {
    return (
      <Layout>
        <div className="h-72 flex items-center justify-center">
          <BarChart3 className="w-10 h-10 text-blue-600 animate-pulse" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Toaster position="top-right" />
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">GPS Connection Reports</h1>
              <p className="text-blue-100 text-sm mt-1">Account capture, category, and location analytics</p>
            </div>
            <button
              onClick={exportCsv}
              className="px-4 py-2.5 bg-white text-blue-700 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2 font-medium"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-3 sm:p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Time Period</label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'today', 'week', 'month', 'year'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setDateRange(r)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium',
                      dateRange === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {r === 'all' ? 'All' : r[0].toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {user.role === ROLES.REGIONAL_ENGINEER && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Office</label>
                <select
                  value={officeFilter}
                  onChange={(e) => setOfficeFilter(e.target.value as Office | 'All')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                >
                  <option value="All">All Offices</option>
                  {OFFICE_LIST.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
              >
                <option value="All">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Exact Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  title="From date"
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  title="To date"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard icon={Filter} label="Total Records" value={stats.total} color="bg-blue-600" />
          <MetricCard icon={MapPin} label="GPS Captured" value={stats.withGps} color="bg-green-600" />
          <MetricCard icon={Clock} label="Without GPS" value={stats.withoutGps} color="bg-orange-500" />
          <MetricCard icon={Tags} label="Categorized" value={stats.withCategories} color="bg-purple-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BreakdownCard title="By Office" icon={Building2} data={stats.officeCounts} total={stats.total} />
          <BreakdownCard title="By Category" icon={Tags} data={stats.categoryCounts} total={stats.total} />
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-bold text-gray-900">Recent Captures</h2>
            <p className="text-xs text-gray-600 mt-1">Showing {filtered.length} records</p>
          </div>
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Account</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Office</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Categories</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">GPS</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Captured</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.slice(0, 12).map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-mono text-blue-700 font-semibold">{c.accountNumber || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-700">{c.office || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      {(c.categories || []).map((id) => categoryNameById.get(id) || id).slice(0, 2).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {hasValidGPS(c.gps) ? 'Captured' : 'Not Captured'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{formatDate(c.captureDateTime || c.lastUpdated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y">
            {filtered.slice(0, 12).map((c) => (
              <div key={c.id} className="p-4">
                <p className="font-mono text-sm font-semibold text-blue-700">{c.accountNumber || 'N/A'}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div>
                    <p className="text-gray-500">Office</p>
                    <p className="text-gray-800">{c.office || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">GPS</p>
                    <p className={hasValidGPS(c.gps) ? 'text-green-700' : 'text-orange-700'}>
                      {hasValidGPS(c.gps) ? 'Captured' : 'Not Captured'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Categories</p>
                    <p className="text-gray-800">
                      {(c.categories || []).map((id) => categoryNameById.get(id) || id).join(', ') || '-'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Captured</p>
                    <p className="text-gray-700">{formatDate(c.captureDateTime || c.lastUpdated)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

const MetricCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white rounded-xl border p-3 sm:p-4">
    <div className="flex items-center justify-between mb-2">
      <div className={cn('p-2 rounded-lg text-white', color)}>
        <Icon size={16} />
      </div>
      <span className="text-lg sm:text-2xl font-bold text-gray-900">{value}</span>
    </div>
    <p className="text-xs sm:text-sm text-gray-600">{label}</p>
  </div>
);

const BreakdownCard = ({ title, icon: Icon, data, total }: any) => (
  <div className="bg-white rounded-xl border p-4">
    <div className="flex items-center gap-2 mb-4">
      <Icon size={18} className="text-blue-600" />
      <h3 className="font-semibold text-gray-900">{title}</h3>
    </div>
    <div className="space-y-2">
      {Object.entries(data)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]: any) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-700 truncate pr-2">{name}</span>
                <span className="text-gray-900 font-medium">{count} ({pct}%)</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      {Object.keys(data).length === 0 && <p className="text-sm text-gray-500">No data available</p>}
    </div>
  </div>
);

export default Reports;
