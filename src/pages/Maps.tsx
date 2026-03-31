import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Layout from '../components/Layout';
import { MapPin, Filter, Navigation, Layers, TrendingUp, Search, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, OFFICE_LIST, type Office } from '../lib/offices';
import { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// Fix Leaflet default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

Icon.Default.mergeOptions({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
});

interface Application {
  id: string;
  fileNumber: string;
  applicantName: string;
  customerId: string;
  status: string;
  phone?: string;
  address?: string;
  office: Office;
  submissionDate: any;
  latitude?: string;
  longitude?: string;
  category?: string;
}

// Component to fit map bounds to markers
const FitBounds = ({ applications }: { applications: Application[] }) => {
  const map = useMap();

  useEffect(() => {
    if (applications.length > 0) {
      const bounds = new LatLngBounds(
        applications.map(app => [parseFloat(app.latitude!), parseFloat(app.longitude!)])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else {
      // Default center: Sri Lanka (Dambulla area)
      map.setView([7.8601, 80.6519], 10);
    }
  }, [applications, map]);

  return null;
};

// Custom marker colors based on status
const getMarkerColor = (status: string) => {
  const colors: { [key: string]: string } = {
    'Application Received': '#3b82f6', // blue
    'Documents Verified': '#8b5cf6', // purple
    'Site Inspection': '#f59e0b', // amber
    'Estimation Sent': '#06b6d4', // cyan
    'Payment Received': '#10b981', // green
    'Construction': '#f97316', // orange
    'Connected': '#22c55e', // bright green
    'Rejected': '#ef4444', // red
  };
  return colors[status] || '#6b7280'; // gray default
};

// Create colored marker icon
const createColoredIcon = (color: string) => {
  const svgIcon = `
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 9.375 12.5 28.5 12.5 28.5S25 21.875 25 12.5C25 5.596 19.404 0 12.5 0z" 
            fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="12.5" cy="12.5" r="4" fill="white"/>
    </svg>
  `;
  
  return new Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(svgIcon),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

const Maps = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [officeFilter, setOfficeFilter] = useState<Office | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch applications with GPS coordinates
  useEffect(() => {
    if (!user) return;

    let q;
    
    if (user.role === ROLES.ACTING_OFFICER) {
      // Acting officers see only their office
      q = query(
        collection(db, 'applications'),
        where('office', '==', user.office)
      );
    } else if (user.role === ROLES.REGIONAL_ENGINEER || user.role === ROLES.DEVELOPER) {
      // Regional engineers and developers see all
      q = query(collection(db, 'applications'));
    } else {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Application))
        .filter(app => app.latitude && app.longitude); // Only apps with GPS coordinates
      
      setApplications(apps);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Filter applications
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const searchMatch = !searchQuery || 
        app.fileNumber?.toLowerCase().includes(searchLower) ||
        app.applicantName?.toLowerCase().includes(searchLower) ||
        app.customerId?.toLowerCase().includes(searchLower) ||
        app.phone?.toLowerCase().includes(searchLower) ||
        app.address?.toLowerCase().includes(searchLower);
      
      // Other filters
      const statusMatch = statusFilter === 'All' || app.status === statusFilter;
      const officeMatch = officeFilter === 'All' || app.office === officeFilter;
      const categoryMatch = categoryFilter === 'All' || app.category === categoryFilter;
      
      return searchMatch && statusMatch && officeMatch && categoryMatch;
    });
  }, [applications, searchQuery, statusFilter, officeFilter, categoryFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredApplications.length;
    const byStatus = filteredApplications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    const byOffice = filteredApplications.reduce((acc, app) => {
      acc[app.office] = (acc[app.office] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const byCategory = filteredApplications.reduce((acc, app) => {
      const cat = app.category || 'Unknown';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return { total, byStatus, byOffice, byCategory };
  }, [filteredApplications]);

  // Get unique values for filters
  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(applications.map(app => app.status)));
  }, [applications]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(applications.map(app => app.category || 'Unknown')));
  }, [applications]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Toaster position="top-right" />
      
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <MapPin className="text-blue-600 flex-shrink-0" size={28} />
              <span className="break-words">Application Map View</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Visualize applications with GPS coordinates
            </p>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "px-3 sm:px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition text-sm w-full sm:w-auto",
              "active:scale-[0.98]",
              showFilters 
                ? "bg-blue-600 text-white" 
                : "bg-white text-gray-700 border hover:bg-gray-50"
            )}
          >
            <Filter size={18} className="flex-shrink-0" />
            <span>Filters</span>
            {(statusFilter !== 'All' || officeFilter !== 'All' || categoryFilter !== 'All') && (
              <span className="bg-red-500 text-white text-xs rounded-full w-2 h-2"></span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 flex-shrink-0" size={18} />
            <input
              type="text"
              placeholder="Search by File No, Name, NIC, Phone, or Address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-10 pr-10 py-2.5 sm:py-3 border border-gray-300 rounded-lg",
                "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none",
                "text-sm sm:text-base transition-all"
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 active:scale-90 transition"
              >
                <X size={18} />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs sm:text-sm text-gray-600 mt-2">
              Found {filteredApplications.length} application{filteredApplications.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </p>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                <MapPin className="text-blue-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Total Locations</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                <TrendingUp className="text-green-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Connected</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.byStatus['Connected'] || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-amber-100 rounded-lg">
                <Navigation className="text-amber-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">In Progress</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {stats.total - (stats.byStatus['Connected'] || 0) - (stats.byStatus['Rejected'] || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
                <Layers className="text-purple-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Offices</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{Object.keys(stats.byOffice).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border space-y-4 animate-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h3 className="font-semibold text-base sm:text-lg text-gray-900 flex items-center gap-2">
                <Filter size={18} className="flex-shrink-0" />
                <span>Filter Applications</span>
              </h3>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                  setOfficeFilter('All');
                  setCategoryFilter('All');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 active:scale-[0.98] font-medium"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                >
                  <option value="All">All Statuses ({applications.length})</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>
                      {status} ({stats.byStatus[status] || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Office Filter */}
              {(user?.role === ROLES.REGIONAL_ENGINEER || user?.role === ROLES.DEVELOPER) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Office
                  </label>
                  <select
                    value={officeFilter}
                    onChange={(e) => setOfficeFilter(e.target.value as Office | 'All')}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  >
                    <option value="All">All Offices ({applications.length})</option>
                    {OFFICE_LIST.map(office => (
                      <option key={office.value} value={office.value}>
                        {office.label} ({stats.byOffice[office.value] || 0})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                >
                  <option value="All">All Categories ({applications.length})</option>
                  {uniqueCategories.map(category => (
                    <option key={category} value={category}>
                      {category} ({stats.byCategory[category] || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {filteredApplications.length === 0 ? (
            <div className="h-64 sm:h-96 flex items-center justify-center p-4">
              <div className="text-center">
                <MapPin className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-600 text-base sm:text-lg font-medium">No applications with GPS coordinates</p>
                <p className="text-gray-500 text-xs sm:text-sm mt-2">
                  GPS coordinates are captured during Site Inspection
                </p>
              </div>
            </div>
          ) : (
            <div className="h-[400px] sm:h-[500px] lg:h-[600px] relative isolate z-0">
              <MapContainer
                center={[7.8601, 80.6519]} // Dambulla, Sri Lanka
                zoom={10}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <FitBounds applications={filteredApplications} />

                {filteredApplications.map((app) => {
                  const lat = parseFloat(app.latitude!);
                  const lng = parseFloat(app.longitude!);
                  
                  if (isNaN(lat) || isNaN(lng)) return null;

                  return (
                    <Marker
                      key={app.id}
                      position={[lat, lng]}
                      icon={createColoredIcon(getMarkerColor(app.status))}
                    >
                      <Popup maxWidth={300}>
                        <div className="p-2">
                          <h3 className="font-bold text-lg mb-2 text-gray-900">
                            {app.fileNumber}
                          </h3>
                          
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Name:</span>
                              <span className="font-medium">{app.applicantName}</span>
                            </div>
                            
                            <div className="flex justify-between">
                              <span className="text-gray-600">Status:</span>
                              <span 
                                className="font-medium px-2 py-0.5 rounded text-xs"
                                style={{ 
                                  backgroundColor: getMarkerColor(app.status) + '20',
                                  color: getMarkerColor(app.status)
                                }}
                              >
                                {app.status}
                              </span>
                            </div>
                            
                            {app.category && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Category:</span>
                                <span className="font-medium">{app.category}</span>
                              </div>
                            )}
                            
                            <div className="flex justify-between">
                              <span className="text-gray-600">Office:</span>
                              <span className="font-medium text-xs">
                                {OFFICE_LIST.find(o => o.value === app.office)?.label}
                              </span>
                            </div>
                            
                            {app.phone && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Phone:</span>
                                <span className="font-medium">{app.phone}</span>
                              </div>
                            )}
                            
                            <div className="flex justify-between text-xs text-gray-500 border-t pt-1 mt-2">
                              <span>Coordinates:</span>
                              <span className="font-mono">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => navigate(`/application/${app.id}`)}
                            className="w-full mt-3 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition text-sm font-medium"
                          >
                            View Details
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* Legend */}
              <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 bg-white p-2 sm:p-4 rounded-lg shadow-lg z-[1000] max-w-[180px] sm:max-w-xs">
                <h4 className="font-semibold text-xs sm:text-sm mb-2">Status Legend</h4>
                <div className="grid grid-cols-1 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                  {Object.entries({
                    'Application Received': '#3b82f6',
                    'Documents Verified': '#8b5cf6',
                    'Site Inspection': '#f59e0b',
                    'Estimation Sent': '#06b6d4',
                    'Payment Received': '#10b981',
                    'Construction': '#f97316',
                    'Connected': '#22c55e',
                    'Rejected': '#ef4444',
                  }).map(([status, color]) => (
                    <div key={status} className="flex items-center gap-1.5 sm:gap-2">
                      <div 
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-gray-700 truncate leading-tight">{status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Area-wise Density */}
        {stats.total > 0 && (
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
            <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
              <Layers className="text-blue-600 flex-shrink-0" size={18} />
              <span>Area-wise Distribution</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {Object.entries(stats.byOffice)
                .sort((a, b) => b[1] - a[1])
                .map(([office, count]) => {
                  const officeName = OFFICE_LIST.find(o => o.value === office)?.label || office;
                  const percentage = ((count / stats.total) * 100).toFixed(1);
                  
                  return (
                    <div key={office} className="border rounded-lg p-3 sm:p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm sm:text-base text-gray-900 break-words flex-1 min-w-0 pr-2">{officeName}</h4>
                        <span className="text-xl sm:text-2xl font-bold text-blue-600 flex-shrink-0">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mb-2">
                        <div
                          className="bg-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-[10px] sm:text-xs text-gray-600">{percentage}% of total applications</p>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Maps;
