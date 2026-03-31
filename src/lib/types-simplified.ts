import { Timestamp } from 'firebase/firestore';

// ===========================
// GPS & LOCATION TYPES
// ===========================

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number; // in meters
  capturedAt: Timestamp;
  capturedBy: string; // user ID
}

export interface GPSHistory {
  id: string;
  connectionId: string;
  oldCoordinates: {
    latitude: number;
    longitude: number;
  } | null;
  newCoordinates: {
    latitude: number;
    longitude: number;
  };
  changedAt: Timestamp;
  changedBy: string;
  reason?: string;
}

// ===========================
// CATEGORY TYPES
// ===========================

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide React icon name
  color: string; // Hex color code
  description?: string;
  active: boolean;
  order: number;
  createdAt: Timestamp;
  createdBy: string;
  lastUpdated?: Timestamp;
  lastUpdatedBy?: string;
}

export interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
  description?: string;
  active: boolean;
}

// ===========================
// CONNECTION TYPES
// ===========================

// Simplified Connection Status
export type ConnectionStatus = 
  | 'Active'
  | 'Inactive'
  | 'Pending'
  | 'Disconnected'
  | 'Under Construction'
  | 'Maintenance Required';

// Simplified Connection Interface
export interface Connection {
  id: string;
  
  // Identification
  accountNumber: string; // Unique connection identifier
  
  // Customer Information
  customerName: string;
  customerNIC: string;
  customerPhone: string;
  customerEmail?: string;
  address: string;
  
  // GPS Information (REQUIRED)
  gps: GPSCoordinates;
  
  // Categories (multi-select tags)
  categories?: string[];
  
  // Connection Status
  status: ConnectionStatus;
  
  // Optional Connection Details
  installationDate?: Timestamp;
  meterNumber?: string;
  
  // Office & User Tracking
  office: string;
  
  // Notes
  notes?: string;
  
  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  lastUpdated: Timestamp;
  lastUpdatedBy?: string;
}

export interface ConnectionFormData {
  accountNumber: string;
  customerName: string;
  customerNIC: string;
  customerPhone: string;
  customerEmail?: string;
  address: string;
  gps: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  categories?: string[];
  status: ConnectionStatus;
  meterNumber?: string;
  installationDate?: string;
  notes?: string;
  office: string;
}

// ===========================
// USER TYPES
// ===========================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Regional Engineer' | 'Acting Officer' | 'Field Officer';
  office: string;
  isBlocked: boolean;
  createdAt: Timestamp;
  createdBy?: string;
  lastLogin?: Timestamp;
}

// ===========================
// FILTER & SEARCH TYPES
// ===========================

export interface ConnectionFilter {
  search?: string;
  categories?: string[];
  status?: ConnectionStatus[];
  office?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasGPS?: boolean;
  nearLocation?: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
}

// ===========================
// MAP TYPES
// ===========================

export interface MapMarker {
  id: string;
  position: [number, number]; // [latitude, longitude]
  accountNumber: string;
  customerName: string;
  address: string;
  status: ConnectionStatus;
  categories: Category[];
  primaryCategory?: Category;
}

export interface NavigationOptions {
  latitude: number;
  longitude: number;
  label: string;
  preferApp?: boolean;
}

export interface ProximityResult {
  connection: Connection;
  distance: number; // in kilometers
}

// ===========================
// CONSTANTS
// ===========================

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt' | 'createdBy'>[] = [
  {
    name: 'Residential Connection',
    icon: 'Home',
    color: '#3B82F6',
    description: 'Home water connections',
    active: true,
    order: 1
  },
  {
    name: 'Commercial Connection',
    icon: 'Building',
    color: '#8B5CF6',
    description: 'Business and commercial properties',
    active: true,
    order: 2
  },
  {
    name: 'Industrial Connection',
    icon: 'Factory',
    color: '#EF4444',
    description: 'Industrial facilities',
    active: true,
    order: 3
  },
  {
    name: 'Government Institution',
    icon: 'Landmark',
    color: '#10B981',
    description: 'Government buildings and offices',
    active: true,
    order: 4
  },
  {
    name: 'Agricultural Use',
    icon: 'Sprout',
    color: '#84CC16',
    description: 'Farm and agricultural purposes',
    active: true,
    order: 5
  },
  {
    name: 'Meter Issue',
    icon: 'Gauge',
    color: '#F59E0B',
    description: 'Connections with meter problems',
    active: true,
    order: 6
  },
  {
    name: 'Leak Detected',
    icon: 'AlertTriangle',
    color: '#DC2626',
    description: 'Connections with detected leaks',
    active: true,
    order: 7
  },
  {
    name: 'Maintenance Required',
    icon: 'Wrench',
    color: '#F97316',
    description: 'Needs maintenance or repair',
    active: true,
    order: 8
  },
  {
    name: 'New Installation',
    icon: 'Plus',
    color: '#06B6D4',
    description: 'Recently installed connections',
    active: true,
    order: 9
  },
  {
    name: 'Temporary Connection',
    icon: 'Clock',
    color: '#64748B',
    description: 'Short-term or temporary service',
    active: true,
    order: 10
  }
];
