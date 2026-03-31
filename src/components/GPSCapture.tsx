import { useState, useEffect } from 'react';
import { MapPin, Crosshair, Loader2, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { 
  captureCurrentLocation, 
  isGPSAvailable, 
  getAccuracyQuality,
  isValidLatitude,
  isValidLongitude,
  copyCoordinatesToClipboard,
  formatCoordinates
} from '../lib/gpsUtils';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface GPSCaptureProps {
  value?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  onChange: (gps: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  }) => void;
  required?: boolean;
  disabled?: boolean;
  showMap?: boolean;
}

const GPSCapture = ({ value, onChange, required = false, disabled = false, showMap = true }: GPSCaptureProps) => {
  const [latitude, setLatitude] = useState<string>(value?.latitude?.toString() || '');
  const [longitude, setLongitude] = useState<string>(value?.longitude?.toString() || '');
  const [accuracy, setAccuracy] = useState<number | undefined>(value?.accuracy);
  const [capturing, setCapturing] = useState(false);
  const [gpsAvailable, setGpsAvailable] = useState(true);

  useEffect(() => {
    setGpsAvailable(isGPSAvailable());
  }, []);

  useEffect(() => {
    if (value) {
      setLatitude(value.latitude.toString());
      setLongitude(value.longitude.toString());
      setAccuracy(value.accuracy);
    }
  }, [value]);

  const handleCaptureLocation = async () => {
    setCapturing(true);
    try {
      const result = await captureCurrentLocation();
      const newLat = result.latitude;
      const newLng = result.longitude;
      const newAcc = result.accuracy;

      setLatitude(newLat.toString());
      setLongitude(newLng.toString());
      setAccuracy(newAcc);

      onChange({
        latitude: newLat,
        longitude: newLng,
        accuracy: newAcc
      });

      const quality = getAccuracyQuality(newAcc);
      toast.success(`Location captured! Accuracy: ${Math.round(newAcc)}m (${quality.label})`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to capture location');
    } finally {
      setCapturing(false);
    }
  };

  const handleLatitudeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLatitude(val);
    
    const numVal = parseFloat(val);
    if (val && !isNaN(numVal) && longitude && !isNaN(parseFloat(longitude))) {
      const lng = parseFloat(longitude);
      if (isValidLatitude(numVal) && isValidLongitude(lng)) {
        onChange({
          latitude: numVal,
          longitude: lng,
          accuracy
        });
      }
    }
  };

  const handleLongitudeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLongitude(val);
    
    const numVal = parseFloat(val);
    if (val && !isNaN(numVal) && latitude && !isNaN(parseFloat(latitude))) {
      const lat = parseFloat(latitude);
      if (isValidLatitude(lat) && isValidLongitude(numVal)) {
        onChange({
          latitude: lat,
          longitude: numVal,
          accuracy
        });
      }
    }
  };

  const handleCopyCoordinates = async () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isValidLatitude(lat) && isValidLongitude(lng)) {
      const success = await copyCoordinatesToClipboard(lat, lng);
      if (success) {
        toast.success('Coordinates copied to clipboard!');
      } else {
        toast.error('Failed to copy coordinates');
      }
    } else {
      toast.error('Invalid coordinates');
    }
  };

  const hasValidCoordinates = () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    return !isNaN(lat) && !isNaN(lng) && isValidLatitude(lat) && isValidLongitude(lng);
  };

  const accuracyQuality = accuracy ? getAccuracyQuality(accuracy) : null;

  return (
    <div className="space-y-4">
      {/* Capture Button */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCaptureLocation}
          disabled={disabled || capturing || !gpsAvailable}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all",
            "bg-blue-600 text-white hover:bg-blue-700 active:scale-95",
            "disabled:bg-gray-300 disabled:cursor-not-allowed disabled:active:scale-100"
          )}
        >
          {capturing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Capturing Location...</span>
            </>
          ) : (
            <>
              <Crosshair className="w-5 h-5" />
              <span>Capture Current Location</span>
            </>
          )}
        </button>

        {hasValidCoordinates() && (
          <button
            type="button"
            onClick={handleCopyCoordinates}
            className="px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 active:scale-95 transition-all"
            title="Copy coordinates"
          >
            <Copy className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>

      {!gpsAvailable && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            GPS is not available on this device. Please enter coordinates manually.
          </p>
        </div>
      )}

      {/* Manual Input */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Or Enter Manually:</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Latitude */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Latitude {required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              step="any"
              placeholder="e.g., 7.8731"
              value={latitude}
              onChange={handleLatitudeChange}
              disabled={disabled}
              className={cn(
                "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                "disabled:bg-gray-100 disabled:cursor-not-allowed",
                latitude && !isValidLatitude(parseFloat(latitude)) && "border-red-500"
              )}
            />
            {latitude && !isValidLatitude(parseFloat(latitude)) && (
              <p className="text-xs text-red-500 mt-1">Must be between -90 and 90</p>
            )}
          </div>

          {/* Longitude */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Longitude {required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              step="any"
              placeholder="e.g., 80.7718"
              value={longitude}
              onChange={handleLongitudeChange}
              disabled={disabled}
              className={cn(
                "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                "disabled:bg-gray-100 disabled:cursor-not-allowed",
                longitude && !isValidLongitude(parseFloat(longitude)) && "border-red-500"
              )}
            />
            {longitude && !isValidLongitude(parseFloat(longitude)) && (
              <p className="text-xs text-red-500 mt-1">Must be between -180 and 180</p>
            )}
          </div>
        </div>
      </div>

      {/* Validation Status */}
      {hasValidCoordinates() && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Valid Coordinates</p>
            <p className="text-xs text-green-700 mt-1 font-mono">
              {formatCoordinates(parseFloat(latitude), parseFloat(longitude))}
            </p>
            {accuracyQuality && (
              <p className="text-xs text-green-700 mt-1">
                Accuracy: {Math.round(accuracy!)}m 
                <span 
                  className="ml-1 font-medium" 
                  style={{ color: accuracyQuality.color }}
                >
                  ({accuracyQuality.label})
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Map Preview */}
      {showMap && hasValidCoordinates() && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Location Preview</span>
          </div>
          <div className="aspect-video bg-gray-100 relative">
            <iframe
              title="Location Preview"
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              src={`https://www.google.com/maps/embed/v1/place?key=&q=${latitude},${longitude}&zoom=15`}
              allowFullScreen
              className="absolute inset-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500">
        <strong>Tip:</strong> For best accuracy, ensure GPS/Location services are enabled on your device 
        and you have a clear view of the sky.
      </p>
    </div>
  );
};

export default GPSCapture;
