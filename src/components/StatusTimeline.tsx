import { CheckCircle, Circle, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

const STEPS = [
  "Application Received",
  "Documents Verified",
  "Site Inspection",
  "Estimation Sent",
  "Payment Received",
  "Construction",
  "Connected"
];

export const StatusTimeline = ({ currentStatus }: { currentStatus: string }) => {
  const currentIndex = STEPS.indexOf(currentStatus);

  return (
    <div className="w-full py-6 sm:py-8">
      <div className="flex justify-between items-start relative min-w-max sm:min-w-0">
        {/* Background Progress Bar */}
        <div className="absolute top-4 sm:top-5 left-0 w-full h-0.5 sm:h-1 bg-gray-200 rounded-full -z-10"></div>
        
        {/* Active Progress Bar with Gradient */}
        <div 
          className="absolute top-4 sm:top-5 left-0 h-0.5 sm:h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-full -z-10 transition-all duration-700 ease-out shadow-lg" 
          style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
        >
          {/* Animated Glow Effect */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 sm:w-3 sm:h-3 bg-blue-400 rounded-full animate-ping"></div>
        </div>

        {STEPS.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={step} className="flex flex-col items-center group relative z-10 px-1">
              {/* Step Circle */}
              <div className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center",
                "border-2 sm:border-4 bg-white transition-all duration-500",
                "shadow-md",
                isCompleted 
                  ? "border-blue-600 sm:scale-110" 
                  : "border-gray-300",
                isCurrent && "ring-2 sm:ring-4 ring-blue-100 scale-110 sm:scale-125 shadow-lg"
              )}>
                {isCompleted ? (
                  <CheckCircle 
                    size={16} 
                    className={cn(
                      "transition-all duration-300 sm:w-5 sm:h-5",
                      isCurrent ? "text-blue-600 animate-pulse" : "text-blue-600"
                    )} 
                    fill="currentColor"
                  />
                ) : (
                  <Circle size={12} className="text-gray-300 sm:w-4 sm:h-4" />
                )}
              </div>
              
              {/* Step Label */}
              <span className={cn(
                "mt-2 sm:mt-3 text-[10px] sm:text-xs font-semibold w-16 sm:w-20 lg:max-w-[90px] text-center leading-tight",
                "transition-all duration-300",
                isCurrent 
                  ? "text-blue-700 sm:scale-105" 
                  : isCompleted 
                    ? "text-gray-700" 
                    : "text-gray-400"
              )}>
                {step}
              </span>
              
              {/* Status Badge for Current Step */}
              {isCurrent && (
                <div className="absolute -bottom-7 sm:-bottom-8 animate-in fade-in slide-in-from-top duration-500">
                  <span className="text-[10px] sm:text-xs bg-blue-100 text-blue-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-semibold flex items-center gap-1 whitespace-nowrap">
                    <Clock size={10} className="animate-pulse sm:w-3 sm:h-3" /> Active
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};