import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { GPSCoordinates, GPSHistory, NavigationOptions } from './types';

// ===========================
// GPS VALIDATION
// ===========================

/**
 * Validate latitude value (-90 to 90)
 */
export const isValidLatitude = (lat: number): boolean => {
  return !isNaN(lat) && lat >= -90 && lat <= 90;
};

/**
 * Validate longitude value (-180 to 180)
 */
export const isValidLongitude = (lng: number): boolean => {
  return !isNaN(lng) && lng >= -180 && lng <= 180;
};

/**
 * Validate GPS coordinates
 */
export const isValidCoordinates = (lat: number, lng: number): boolean => {
  return isValidLatitude(lat) && isValidLongitude(lng);
};

/**
 * Format coordinates for display
 */
export const formatCoordinates = (lat: number, lng: number, precision: number = 6): string => {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
};

/**
 * Parse coordinates from string
 * Supports formats: "lat, lng" or "lat,lng"
 */
export const parseCoordinates = (coordString: string): { latitude: number; longitude: number } | null => {
  try {
    const parts = coordString.split(',').map(s => s.trim());
    if (parts.length !== 2) return null;
    
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    
    if (isValidCoordinates(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }
    return null;
  } catch {
    return null;
  }
};

// ===========================
// GPS CAPTURE
// ===========================

export interface GPSCaptureResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export interface GPSError {
  code: number;
  message: string;
}

/**
 * Capture current GPS location using browser Geolocation API
 */
export const captureCurrentLocation = (): Promise<GPSCaptureResult> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 0,
        message: 'Geolocation is not supported by your browser'
      } as GPSError);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 30000, // 30 seconds
      maximumAge: 0 // Don't use cached position
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp)
        });
      },
      (error) => {
        let message = 'Unable to retrieve your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable. Please check your device settings.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Please try again.';
            break;
        }
        reject({
          code: error.code,
          message
        } as GPSError);
      },
      options
    );
  });
};

/**
 * Check if GPS is available
 */
export const isGPSAvailable = (): boolean => {
  return 'geolocation' in navigator;
};

/**
 * Get accuracy quality indicator
 */
export const getAccuracyQuality = (accuracy: number): {
  level: 'excellent' | 'good' | 'fair' | 'poor';
  color: string;
  label: string;
} => {
  if (accuracy <= 10) {
    return { level: 'excellent', color: '#10B981', label: 'Excellent' };
  } else if (accuracy <= 30) {
    return { level: 'good', color: '#3B82F6', label: 'Good' };
  } else if (accuracy <= 50) {
    return { level: 'fair', color: '#F59E0B', label: 'Fair' };
  } else {
    return { level: 'poor', color: '#EF4444', label: 'Poor' };
  }
};

// ===========================
// GPS HISTORY
// ===========================

/**
 * Log GPS coordinate change to history
 */
export const logGPSChange = async (
  connectionId: string,
  oldCoordinates: { latitude: number; longitude: number } | null,
  newCoordinates: { latitude: number; longitude: number },
  userId: string,
  reason?: string
): Promise<void> => {
  try {
    const historyEntry: Omit<GPSHistory, 'id'> = {
      connectionId,
      oldCoordinates,
      newCoordinates,
      changedAt: Timestamp.now(),
      changedBy: userId,
      reason
    };

    await addDoc(collection(db, 'gpsHistory'), historyEntry);
  } catch (error) {
    console.error('Error logging GPS change:', error);
    // Don't throw - history logging should not block the main operation
  }
};

// ===========================
// DISTANCE CALCULATIONS
// ===========================

/**
 * Calculate distance between two GPS points using Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Format distance for display
 */
export const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(2)}km`;
};

// ===========================
// NAVIGATION
// ===========================

/**
 * Open Google Maps with coordinates
 * Mobile: Opens Google Maps app if installed, otherwise web
 * Desktop: Opens Google Maps website
 */
export const navigateToLocation = (options: NavigationOptions): void => {
  const { latitude, longitude, label } = options;
  
  // Validate coordinates
  if (!isValidCoordinates(latitude, longitude)) {
    console.error('Invalid coordinates provided for navigation');
    return;
  }

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const encodedLabel = encodeURIComponent(label);
  
  if (isMobile) {
    // Try to open native Google Maps app on mobile
    // Format: geo:lat,lon?q=lat,lon(label)
    const geoUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`;
    window.open(geoUrl, '_blank');
  } else {
    // Open Google Maps website on desktop
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    window.open(mapsUrl, '_blank');
  }
};

/**
 * Get Google Maps URL (without opening)
 */
export const getGoogleMapsUrl = (latitude: number, longitude: number): string => {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
};

/**
 * Copy coordinates to clipboard
 */
export const copyCoordinatesToClipboard = async (
  latitude: number,
  longitude: number
): Promise<boolean> => {
  try {
    const coordString = formatCoordinates(latitude, longitude);
    await navigator.clipboard.writeText(coordString);
    return true;
  } catch (error) {
    console.error('Failed to copy coordinates:', error);
    return false;
  }
};

/**
 * Get direction text (N, S, E, W, NE, NW, SE, SW)
 */
export const getCardinalDirection = (lat: number, lng: number): string => {
  const directions: string[] = [];
  
  if (lat > 0) directions.push('N');
  if (lat < 0) directions.push('S');
  if (lng > 0) directions.push('E');
  if (lng < 0) directions.push('W');
  
  return directions.join('') || 'Equator/Prime Meridian';
};

// ===========================
// GPS DATA HELPERS
// ===========================

/**
 * Check if connection has valid GPS data
 */
export const hasValidGPS = (
  gps?: Pick<GPSCoordinates, 'latitude' | 'longitude'> | GPSCoordinates | null
): boolean => {
  if (!gps) return false;
  return isValidCoordinates(gps.latitude, gps.longitude);
};

/**
 * Get GPS age (time since capture)
 */
export const getGPSAge = (capturedAt: Timestamp): string => {
  const now = new Date();
  const captured = capturedAt.toDate();
  const diffMs = now.getTime() - captured.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};
