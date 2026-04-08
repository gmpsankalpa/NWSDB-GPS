import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Filter, X, Search, Loader2, Eye, Crosshair, Layers, ListFilter } from 'lucide-react';
import Layout from '../components/Layout';
import NavigationButton from '../components/NavigationButton';
import { CategoryBadge, CategoryIcon } from '../components/CategorySelector';
import { useAuth } from '../contexts/AuthContext';
import { hasOfficeAccess, type Office } from '../lib/offices';
import { getActiveCategories } from '../lib/categoryService';
import type { Connection, Category } from '../lib/types';
import { hasValidGPS, formatCoordinates, calculateDistance, formatDistance } from '../lib/gpsUtils';
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

// Component to handle map center/auto-focus updates
const MapController = ({
  center,
  points,
  autoFocusPoints,
}: {
  center: [number, number];
  points: [number, number][];
  autoFocusPoints: boolean;
}) => {
  const map = useMap();
  useEffect(() => {
    if (autoFocusPoints && points.length > 0) {
      if (points.length === 1) {
        map.setView(points[0], 16);
        return;
      }

      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      return;
    }

    map.setView(center, map.getZoom());
  }, [autoFocusPoints, points, center, map]);
  return null;
};

// Custom marker icon (category color preferred)
const getMarkerIcon = (color?: string, highlighted: boolean = false) => {
  const markerColor = color || '#3B82F6';
  const size = highlighted ? 38 : 30;
  const border = highlighted ? 4 : 3;
  const shadow = highlighted ? '0 0 0 4px rgba(16, 185, 129, 0.35), 0 4px 12px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.3)';
  
  return L.divIcon({
    html: `<div style="background-color: ${markerColor}; width: ${size}px; height: ${size}px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: ${border}px solid white; box-shadow: ${shadow};"></div>`,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [Math.floor(size / 2), size],
    popupAnchor: [0, -size]
  });
};

const MapViewPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([7.8731, 80.7718]); // Sri Lanka center
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mapStyle, setMapStyle] = useState<'standard' | 'light'>('standard');
  const [showNearby, setShowNearby] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [highlightedConnectionId, setHighlightedConnectionId] = useState<string | null>(null);
  const [pendingPopupConnectionId, setPendingPopupConnectionId] = useState<string | null>(null);
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const focusConnectionId = (location.state as { focusConnection?: string } | null)?.focusConnection;

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
      if (!conn.office) return false;
      if (!hasOfficeAccess(user.office, user.role, conn.office as Office)) return false;

      // Must have valid GPS
      if (!hasValidGPS(conn.gps)) return false;

      // Focus mode (opened from dashboard map button)
      if (focusConnectionId && conn.id !== focusConnectionId) return false;

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
  }, [connections, user, searchQuery, selectedCategories, focusConnectionId]);

  const markerPositions = useMemo<[number, number][]>(
    () =>
      filteredConnections
        .filter((conn) => conn.gps && hasValidGPS(conn.gps))
        .map((conn) => [conn.gps!.latitude, conn.gps!.longitude] as [number, number]),
    [filteredConnections]
  );

  const shouldAutoFocusPoints = !searchQuery.trim() && !userLocation;

  useEffect(() => {
    if (!focusConnectionId) return;
    const focusedConnection = filteredConnections.find((conn) => conn.id === focusConnectionId);
    if (!focusedConnection?.gps || !hasValidGPS(focusedConnection.gps)) return;

    setMapCenter([focusedConnection.gps.latitude, focusedConnection.gps.longitude]);
    setHighlightedConnectionId(focusedConnection.id);
    setPendingPopupConnectionId(focusedConnection.id);
  }, [focusConnectionId, filteredConnections]);

  useEffect(() => {
    if (!pendingPopupConnectionId) return;

    const marker = markerRefs.current[pendingPopupConnectionId];
    if (marker) {
      marker.openPopup();
      setShowNearby(false);
      setPendingPopupConnectionId(null);
      return;
    }

    const retryTimer = window.setTimeout(() => {
      const retryMarker = markerRefs.current[pendingPopupConnectionId];
      if (retryMarker) {
        retryMarker.openPopup();
        setShowNearby(false);
      }
      setPendingPopupConnectionId(null);
    }, 220);

    return () => window.clearTimeout(retryTimer);
  }, [pendingPopupConnectionId, showNearby, filteredConnections]);

  const nearbyConnections = useMemo(() => {
    if (!userLocation) return [];

    return filteredConnections
      .map((conn) => {
        if (!conn.gps || !hasValidGPS(conn.gps)) return null;
        const distanceKm = calculateDistance(
          userLocation[0],
          userLocation[1],
          conn.gps.latitude,
          conn.gps.longitude
        );
        return { conn, distanceKm };
      })
      .filter((item): item is { conn: Connection; distanceKm: number } => !!item)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 20);
  }, [filteredConnections, userLocation]);

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

  const requestUserLocation = (): Promise<[number, number] | null> =>
    new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve([position.coords.latitude, position.coords.longitude]),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });

  const handleCenterOnUser = async () => {
    setGettingLocation(true);
    const userPos = await requestUserLocation();
    setGettingLocation(false);

    if (!userPos) {
      toast.error('Unable to get your location');
      return;
    }

    setUserLocation(userPos);
    setMapCenter(userPos);
    toast.success('Centered on your location');
  };

  const handleNearbyMe = async () => {
    setShowNearby(true);
    if (userLocation) return;

    setLoadingNearby(true);
    const userPos = await requestUserLocation();
    setLoadingNearby(false);

    if (!userPos) {
      toast.error('Please allow location access to use Nearby Me');
      return;
    }

    setUserLocation(userPos);
    setMapCenter(userPos);
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
      <div className="map-scope relative isolate z-0 overflow-hidden rounded-none sm:rounded-none border-0 h-[calc(100vh-68px)] sm:h-[calc(100vh-76px)] bg-gray-100">
        {/* Search Bar - Floating on top */}
        <div className="absolute top-3 sm:top-4 left-3 right-3 sm:left-4 sm:right-4 z-20 max-w-3xl">
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
                  "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  (selectedCategories.length > 0)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filter</span>
                  {selectedCategories.length > 0 && (
                  <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                    {selectedCategories.length}
                  </span>
                  )}
                </button>
              <button
                onClick={() => setMapStyle((prev) => (prev === 'standard' ? 'light' : 'standard'))}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                title="Toggle map style"
              >
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">{mapStyle === 'standard' ? 'Light' : 'Standard'}</span>
              </button>
            </div>

            {/* Results count */}
            <div className="px-3 sm:px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600 gap-2">
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
            {(selectedCategories.length > 0 || searchQuery) && (
              <div className="px-3 sm:px-4 py-2 border-t border-gray-100 bg-blue-50/50 flex flex-wrap items-center gap-1.5">
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-white border border-blue-200 text-blue-700">
                    <Search className="w-3 h-3" />
                    Search: {searchQuery}
                  </span>
                )}
                {selectedCategories.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-white border border-blue-200 text-blue-700">
                    <ListFilter className="w-3 h-3" />
                    {selectedCategories.length} categories
                  </span>
                )}
              </div>
            )}
            {showNearby && userLocation && (
              <div className="px-3 sm:px-4 py-2 border-t border-gray-100 bg-green-50/60 text-xs text-green-800 flex items-center justify-between gap-2">
                <span className="truncate">
                  Nearby: {nearbyConnections.length} nearest location{nearbyConnections.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => setShowNearby(false)}
                  className="text-green-700 hover:text-green-900 font-medium"
                >
                  Hide
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="absolute top-24 sm:top-32 left-3 right-3 sm:left-4 sm:right-auto z-30 w-auto sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 max-h-[calc(100%-120px)] sm:max-h-[calc(100%-140px)] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold">Filters</h3>
              <div className="flex items-center gap-2">
                {selectedCategories.length > 0 && (
                  <button
                    onClick={() => setSelectedCategories([])}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
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
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
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

        {/* Nearby Panel */}
        {showNearby && (
          <div className="absolute top-[112px] sm:top-[130px] right-3 sm:right-4 z-30 w-[min(90vw,320px)] bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Nearby Me</h3>
              <button onClick={() => setShowNearby(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-60 overflow-auto">
              {!userLocation ? (
                <div className="px-3 py-4 space-y-2">
                  <p className="text-xs text-gray-600">Allow location access to find nearby captured locations.</p>
                  <button
                    onClick={handleCenterOnUser}
                    disabled={gettingLocation || loadingNearby}
                    className="w-full px-3 py-2 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
                  >
                    {gettingLocation || loadingNearby ? 'Getting location...' : 'Use my location'}
                  </button>
                </div>
              ) : nearbyConnections.length === 0 ? (
                <p className="px-3 py-4 text-xs text-gray-500">No nearby captured locations found.</p>
              ) : (
                nearbyConnections.map(({ conn, distanceKm }) => (
                  <button
                    key={`nearby-${conn.id}`}
                    onClick={() => {
                      if (conn.gps && hasValidGPS(conn.gps)) {
                        setMapCenter([conn.gps.latitude, conn.gps.longitude]);
                        setHighlightedConnectionId(conn.id);
                        setPendingPopupConnectionId(conn.id);
                      }
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0",
                      highlightedConnectionId === conn.id && "bg-green-50 border-l-4 border-l-green-500"
                    )}
                  >
                    <p className="text-sm font-medium text-gray-800 truncate">{conn.accountNumber || conn.fileNumber || 'N/A'}</p>
                    <p className="text-xs text-gray-500 truncate">{conn.address || '-'}</p>
                    <p className="text-xs text-green-700 font-medium mt-0.5">{formatDistance(distanceKm)}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Map Quick Actions */}
        <div className="absolute bottom-24 sm:bottom-4 right-3 sm:right-4 z-20 flex flex-col gap-2">
          <button
            onClick={handleCenterOnUser}
            disabled={gettingLocation}
            className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 disabled:bg-gray-100"
            title="Center on my location"
          >
            {gettingLocation ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <Crosshair className="w-5 h-5 text-gray-700" />
            )}
          </button>
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={cn(
              "bg-white p-3 rounded-lg shadow-lg border hover:bg-gray-50",
              showFilters ? "border-blue-400 text-blue-700" : "border-gray-200 text-gray-700"
            )}
            title="Toggle filters"
          >
            <Filter className="w-5 h-5" />
          </button>
          <button
            onClick={handleNearbyMe}
            disabled={loadingNearby}
            className={cn(
              "bg-white p-3 rounded-lg shadow-lg border hover:bg-gray-50 disabled:opacity-70",
              showNearby ? "border-green-400 text-green-700" : "border-gray-200 text-gray-700"
            )}
            title="Nearby me"
          >
            {loadingNearby ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
          </button>
        </div>

        {/* Map */}
        <MapContainer
          center={mapCenter}
          zoom={13}
          className="w-full h-full"
          zoomControl={true}
        >
          <MapController center={mapCenter} points={markerPositions} autoFocusPoints={shouldAutoFocusPoints} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={
              mapStyle === 'standard'
                ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            }
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
                icon={getMarkerIcon(primaryCategory?.color, highlightedConnectionId === conn.id)}
                ref={(ref) => {
                  markerRefs.current[conn.id] = ref;
                }}
              >
                <Popup maxWidth={260}>
                  <div className="p-1.5 sm:p-2">
                    <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                      <div>
                        <h3 className="font-bold text-sm sm:text-base leading-tight">
                          {conn.accountNumber || conn.fileNumber || 'N/A'}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 leading-tight">{conn.customerName || conn.applicantName}</p>
                      </div>
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                    </div>

                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                      <p className="text-gray-700 leading-snug break-words">{conn.address}</p>
                      
                      {/* Categories */}
                      {connCategories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {connCategories.map(cat => (
                            <CategoryBadge key={cat.id} category={cat} size="sm" />
                          ))}
                        </div>
                      )}

                      {/* GPS Info */}
                      <p className="text-[11px] sm:text-xs text-gray-500 font-mono">
                        {formatCoordinates(conn.gps.latitude, conn.gps.longitude)}
                      </p>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 border-t">
                        <button
                          onClick={() => navigate(`/application/${conn.id}`)}
                          className="flex-1 flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-[11px] sm:text-xs font-medium"
                        >
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
