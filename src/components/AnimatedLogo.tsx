import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
  size?: number;
  className?: string;
}

export const AnimatedLogo = ({ size = 72, className }: AnimatedLogoProps) => {
  const strokeWidth = 4;
  const radius = (size / 2) - (strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center cursor-pointer group",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Siri-like glow behind the ring */}
      <div 
        className="absolute inset-[-4px] rounded-full animate-siri-glow"
        style={{
          background: 'conic-gradient(from 0deg, hsl(217 72% 50% / 0.5), hsl(0 80% 55% / 0.4), hsl(217 72% 50% / 0.5))',
          filter: 'blur(8px)',
        }}
      />
      
      {/* SVG animated ring border */}
      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          {/* Animated gradient */}
          <linearGradient id="siriRingGradient" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3b82f6">
              <animate attributeName="stop-color" values="#3b82f6;#ef4444;#3b82f6" dur="4s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="#ef4444">
              <animate attributeName="stop-color" values="#ef4444;#3b82f6;#ef4444" dur="4s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#3b82f6">
              <animate attributeName="stop-color" values="#3b82f6;#ef4444;#3b82f6" dur="4s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          
          {/* Second gradient for layered effect */}
          <linearGradient id="siriRingGradient2" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        
        {/* Main rotating ring segment */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#siriRingGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.6} ${circumference * 0.4}`}
          className="animate-siri-ring-main"
          style={{ transformOrigin: 'center' }}
        />
        
        {/* Secondary counter-rotating segment */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#siriRingGradient2)"
          strokeWidth={strokeWidth - 1}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.3} ${circumference * 0.7}`}
          className="animate-siri-ring-secondary"
          style={{ transformOrigin: 'center', opacity: 0.7 }}
        />
      </svg>
      
      {/* Static center logo - smaller to fit inside ring */}
      <img 
        src="/favicon.png" 
        alt="Logo"
        className="relative z-10 rounded-full object-contain transition-transform duration-300 group-hover:scale-105"
        style={{
          width: size * 0.75,
          height: size * 0.75,
        }}
      />
      
      {/* Custom keyframes */}
      <style>{`
        @keyframes siriRingMain {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes siriRingSecondary {
          0% {
            transform: rotate(360deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }
        
        @keyframes siriGlow {
          0%, 100% {
            transform: rotate(0deg) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: rotate(180deg) scale(1.05);
            opacity: 0.9;
          }
        }
        
        .animate-siri-ring-main {
          animation: siriRingMain 4s linear infinite;
        }
        
        .animate-siri-ring-secondary {
          animation: siriRingSecondary 6s linear infinite;
        }
        
        .animate-siri-glow {
          animation: siriGlow 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
