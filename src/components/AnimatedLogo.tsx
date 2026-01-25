import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
  size?: number;
  className?: string;
}

export const AnimatedLogo = ({ size = 56, className }: AnimatedLogoProps) => {
  const borderWidth = 3;
  const ringRadius = (size / 2) - (borderWidth / 2);
  
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center cursor-pointer group",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* SVG animated border rings */}
      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          {/* Siri-like gradient */}
          <linearGradient id="siriGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(217, 72%, 48%)" stopOpacity="0.9" />
            <stop offset="25%" stopColor="hsl(180, 60%, 50%)" stopOpacity="0.8" />
            <stop offset="50%" stopColor="hsl(260, 60%, 55%)" stopOpacity="0.7" />
            <stop offset="75%" stopColor="hsl(330, 70%, 60%)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(217, 72%, 48%)" stopOpacity="0.9" />
          </linearGradient>
          
          <linearGradient id="siriGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(190, 70%, 50%)" stopOpacity="0.6" />
            <stop offset="50%" stopColor="hsl(280, 60%, 55%)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(217, 72%, 48%)" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        
        {/* Main rotating ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={ringRadius}
          fill="none"
          stroke="url(#siriGradient1)"
          strokeWidth={borderWidth}
          className="animate-siri-ring"
          style={{ transformOrigin: 'center' }}
        />
        
        {/* Secondary counter-rotating ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={ringRadius - 4}
          fill="none"
          stroke="url(#siriGradient2)"
          strokeWidth={2}
          strokeDasharray="40 60"
          className="animate-siri-ring-reverse"
          style={{ transformOrigin: 'center', opacity: 0.7 }}
        />
      </svg>
      
      {/* Pulsing glow behind */}
      <div 
        className="absolute inset-[-4px] rounded-full animate-siri-glow -z-10"
        style={{
          background: 'conic-gradient(from 90deg, hsl(217 72% 48% / 0.3), hsl(180 60% 50% / 0.2), hsl(260 60% 55% / 0.2), hsl(330 70% 60% / 0.15), hsl(217 72% 48% / 0.3))',
          filter: 'blur(8px)',
        }}
      />
      
      {/* Static logo */}
      <img 
        src="/favicon.png" 
        alt="Logo"
        className="relative z-10 rounded-full object-contain transition-transform duration-300 group-hover:scale-105"
        style={{
          width: size * 0.7,
          height: size * 0.7,
          filter: 'drop-shadow(0 0 6px hsl(217 72% 48% / 0.3))',
        }}
      />
      
      {/* Custom keyframes */}
      <style>{`
        @keyframes siriRing {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes siriRingReverse {
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
            opacity: 0.5;
          }
          50% {
            transform: rotate(180deg) scale(1.05);
            opacity: 0.7;
          }
        }
        
        .animate-siri-ring {
          animation: siriRing 4s linear infinite;
        }
        
        .animate-siri-ring-reverse {
          animation: siriRingReverse 6s linear infinite;
        }
        
        .animate-siri-glow {
          animation: siriGlow 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
