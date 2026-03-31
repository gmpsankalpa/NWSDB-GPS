import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { MapPin, Filter, X, Search, Loader2, Eye, Crosshair } from 'lucide-react';
import Layout from '../components/Layout';
import NavigationButton from '../components/NavigationButton';
import { CategoryBadge, CategoryIcon } from '../components/CategorySelector';
import { useAuth } from '../contexts/AuthContext';
import { hasOfficeAccess } from '../lib/offices';
import { getActiveCategories } from '../lib/categoryService';
import type { Connection, Category } from '../lib/types';
import { hasValidGPS, formatCoordinates } from '../lib/gpsUtils';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to handle map center updates
const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

// Custom marker icon (category color preferred)
const getMarkerIcon = (color?: string) => {
  const markerColor = color || '#3B82F6';
  
  return L.divIcon({
    html: `<div style="background-color: ${markerColor}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
};

const MapViewPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([7.8731, 80.7718]); // Sri Lanka center
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const normalizeSearchText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    connections.forEach((conn) => {
      if (!hasValidGPS(conn.gps)) return;
      (conn.categories || []).forEach((id) => {
        counts.set(id, (counts.get(id) || 0) + 1);
      });
    });
    return counts;
  }, [connections]);

  // Load connections and categories
  useEffect(() => {
    if (!user) return;

    // Load categories
    getActiveCategories().then(setCategories).catch(console.error);

    // Load connections
    const q = query(collection(db, 'applications'), orderBy('lastUpdated', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const conns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Connection[];
      setConnections(conns);
      setLoading(false);
    }, (error) => {
      console.error('Error loading connections:', error);
      toast.error('Failed to load connections');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Filter connections
  const filteredConnections = useMemo(() => {
    if (!user) return [];

    return connections.filter(conn => {
      // Office access control
      if (!hasOfficeAccess(user.office, user.role, conn.office)) return false;

      // Must have valid GPS
      if (!hasValidGPS(conn.gps)) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches = 
          conn.accountNumber?.toLowerCase().includes(query) ||
          conn.fileNumber?.toLowerCase().includes(query) ||
          conn.customerName?.toLowerCase().includes(query) ||
          conn.applicantName?.toLowerCase().includes(query) ||
          conn.customerId?.toLowerCase().includes(query) ||
          conn.address?.toLowerCase().includes(query);
        if (!matches) return false;
      }

      // Category filter
      if (selectedCategories.length > 0) {
        if (!conn.categories || conn.categories.length === 0) return false;
        const hasCategory = conn.categories.some(cat => selectedCategories.includes(cat));
        if (!hasCategory) return false;
      }

      return true;
    });
  }, [connections, user, searchQuery, selectedCategories]);

  // Auto-center map when account number is searched
  useEffect(() => {
    const queryText = searchQuery.trim();
    if (!queryText) return;

    const normalizedQuery = normalizeSearchText(queryText);
    if (!normalizedQuery) return;

    const accountMatches = filteredConnections.filter(conn =>
      normalizeSearchText(conn.accountNumber || '').includes(normalizedQuery)
    );
    if (accountMatches.length === 0) return;

    const bestMatch =
      accountMatches.find(conn => normalizeSearchText(conn.accountNumber || '') === normalizedQuery) ||
      accountMatches[0];

    if (bestMatch.gps && hasValidGPS(bestMatch.gps)) {
      setMapCenter([bestMatch.gps.latitude, bestMatch.gps.longitude]);
    }
  }, [searchQuery, filteredConnections]);

  const handleCenterOnUser = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userPos: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(userPos);
        setMapCenter(userPos);
        setGettingLocation(false);
        toast.success('Centered on your location');
      },
      (error) => {
        setGettingLocation(false);
        toast.error('Unable to get your location');
      }
    );
  };

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="map-scope relative isolate z-0 overflow-hidden rounded-xl border border-gray-200 h-[calc(100vh-180px)] sm:h-[calc(100vh-160px)] md:h-[calc(100vh-140px)] min-h-[520px]">
        {/* Search Bar - Floating on top */}
        <div className="absolute top-3 sm:top-4 left-3 right-3 sm:left-4 sm:right-4 z-20 max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3">
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search by account, name, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 outline-none text-sm min-w-0"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  (selectedCategories.length > 0)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                <Filter className="w-4 h-4" />
                Filter
                {selectedCategories.length > 0 && (
                  <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                    {selectedCategories.length}
                  </span>
                )}
              </button>
            </div>

            {/* Results count */}
            <div className="px-3 sm:px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
              <span className="truncate pr-2">{filteredConnections.length} connection{filteredConnections.length !== 1 ? 's' : ''} on map</span>
              {(selectedCategories.length > 0 || searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="absolute top-28 sm:top-32 left-3 right-3 sm:left-4 sm:right-auto z-30 w-auto sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 max-h-[calc(100%-130px)] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Categories */}
              {categories.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Categories</h4>
                  <div className="space-y-2">
                    {categories.map(category => (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => handleToggleCategory(category.id)}
                          className="rounded text-blue-600"
                        />
                        <CategoryIcon icon={category.icon} color={category.color} size={16} />
                        <span className="text-sm flex-1">{category.name}</span>
                        <span className="text-xs text-gray-500">
                          ({categoryCounts.get(category.id) || 0})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Location Button */}
        <button
          onClick={handleCenterOnUser}
          disabled={gettingLocation}
          className="absolute bottom-4 right-3 sm:bottom-auto sm:top-4 sm:right-4 z-20 bg-white p-3 rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 disabled:bg-gray-100"
          title="Center on my location"
        >
          {gettingLocation ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          ) : (
            <Crosshair className="w-5 h-5 text-gray-700" />
          )}
        </button>

        {/* Map */}
        <MapContainer
          center={mapCenter}
          zoom={13}
          className="w-full h-full"
          zoomControl={true}
        >
          <MapController center={mapCenter} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Connection Markers */}
          {filteredConnections.map(conn => {
            if (!conn.gps) return null;
            
            const position: [number, number] = [conn.gps.latitude, conn.gps.longitude];
            const connCategories = (conn.categories || [])
              .map((id) => categoryById.get(id))
              .filter(Boolean) as Category[];
            const primaryCategory = connCategories[0];

            return (
              <Marker
                key={conn.id}
                position={position}
                icon={getMarkerIcon(primaryCategory?.color)}
              >
                <Popup maxWidth={300}>
                  <div className="p-2">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-bold text-base">
                          {conn.accountNumber || conn.fileNumber || 'N/A'}
                        </h3>
                        <p className="text-sm text-gray-600">{conn.customerName || conn.applicantName}</p>
                      </div>
                      <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700">{conn.address}</p>
                      
                      {/* Categories */}
                      {connCategories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {connCategories.map(cat => (
                            <CategoryBadge key={cat.id} category={cat} size="sm" />
                          ))}
                        </div>
                      )}

                      {/* GPS Info */}
                      <p className="text-xs text-gray-500 font-mono">
                        {formatCoordinates(conn.gps.latitude, conn.gps.longitude)}
                      </p>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <button
                          onClick={() => navigate(`/application/${conn.id}`)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                        <NavigationButton
                          latitude={conn.gps.latitude}
                          longitude={conn.gps.longitude}
                          label={conn.accountNumber || conn.fileNumber || conn.customerName || 'Connection'}
                          variant="primary"
                          size="sm"
                          showIcon={false}
                        />
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* User Location Marker */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={L.divIcon({
                html: '<div style="background-color: #3B82F6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>',
                className: 'user-location-marker',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
              })}
            >
              <Popup>
                <div className="text-center text-sm font-medium">
                  Your Location
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* No results message */}
        {filteredConnections.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[999]">
            <div className="bg-white px-6 py-4 rounded-lg shadow-lg border border-gray-200 pointer-events-auto">
              <p className="text-gray-600 text-center">
                No connections found with GPS coordinates
                {(searchQuery || selectedCategories.length > 0) && ' matching your filters'}
              </p>
              {(searchQuery || selectedCategories.length > 0) && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MapViewPage;
