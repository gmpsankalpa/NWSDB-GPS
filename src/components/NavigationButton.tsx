import { Navigation, ExternalLink } from 'lucide-react';
import { navigateToLocation } from '../lib/gpsUtils';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface NavigationButtonProps {
  latitude: number;
  longitude: number;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  showIcon?: boolean;
  className?: string;
}

const NavigationButton = ({
  latitude,
  longitude,
  label,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  showIcon = true,
  className
}: NavigationButtonProps) => {
  
  const handleNavigate = () => {
    try {
      navigateToLocation({ latitude, longitude, label });
      toast.success('Opening Google Maps...', {
        duration: 2000,
        icon: '🗺️'
      });
    } catch (error) {
      toast.error('Failed to open navigation');
      console.error('Navigation error:', error);
    }
  };

  const baseClasses = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all active:scale-95";
  
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    secondary: "bg-white text-blue-600 border border-blue-600 hover:bg-blue-50",
    ghost: "bg-gray-100 text-gray-700 hover:bg-gray-200"
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20
  };

  return (
    <button
      type="button"
      onClick={handleNavigate}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
    >
      {showIcon && <Navigation size={iconSizes[size]} />}
      <span>Navigate</span>
      <ExternalLink size={iconSizes[size] - 2} />
    </button>
  );
};

export default NavigationButton;
