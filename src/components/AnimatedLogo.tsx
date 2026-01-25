import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
  size?: number;
  className?: string;
  isActive?: boolean; // Voice assistant is active
}

export const AnimatedLogo = ({ size = 144, className, isActive = false }: AnimatedLogoProps) => {
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center cursor-pointer group",
        className
      )}
      style={{ 
        width: size * 1.1, 
        height: size * 1.1,
        background: 'transparent',
      }}
    >
      {/* Siri-style morphing blobs */}
      
      {/* Blue blob - primary */}
      <div 
        className={cn("absolute", isActive ? "animate-siri-blob-1-active" : "animate-siri-blob-1")}
        style={{
          width: size * (isActive ? 1.0 : 0.9),
          height: size * (isActive ? 1.0 : 0.9),
          background: `radial-gradient(ellipse at 30% 40%, hsl(217 80% 55% / ${isActive ? 0.8 : 0.6}) 0%, hsl(217 80% 55% / ${isActive ? 0.3 : 0.2}) 50%, transparent 70%)`,
          filter: `blur(${isActive ? 6 : 8}px)`,
          borderRadius: '60% 40% 50% 50% / 50% 60% 40% 50%',
          transition: 'all 0.3s ease-out',
        }}
      />
      
      {/* Cyan/Teal blob */}
      <div 
        className={cn("absolute", isActive ? "animate-siri-blob-2-active" : "animate-siri-blob-2")}
        style={{
          width: size * (isActive ? 0.95 : 0.85),
          height: size * (isActive ? 0.95 : 0.85),
          background: `radial-gradient(ellipse at 60% 30%, hsl(190 70% 50% / ${isActive ? 0.7 : 0.5}) 0%, hsl(190 70% 50% / ${isActive ? 0.25 : 0.15}) 50%, transparent 70%)`,
          filter: `blur(${isActive ? 8 : 10}px)`,
          borderRadius: '50% 60% 40% 50% / 40% 50% 60% 50%',
          transition: 'all 0.3s ease-out',
        }}
      />
      
      {/* Purple/Magenta blob */}
      <div 
        className={cn("absolute", isActive ? "animate-siri-blob-3-active" : "animate-siri-blob-3")}
        style={{
          width: size * (isActive ? 0.9 : 0.8),
          height: size * (isActive ? 0.9 : 0.8),
          background: `radial-gradient(ellipse at 70% 60%, hsl(280 60% 55% / ${isActive ? 0.7 : 0.5}) 0%, hsl(280 60% 55% / ${isActive ? 0.25 : 0.15}) 50%, transparent 70%)`,
          filter: `blur(${isActive ? 8 : 10}px)`,
          borderRadius: '40% 60% 50% 50% / 60% 40% 50% 50%',
          transition: 'all 0.3s ease-out',
        }}
      />
      
      {/* Pink/Red blob */}
      <div 
        className={cn("absolute", isActive ? "animate-siri-blob-4-active" : "animate-siri-blob-4")}
        style={{
          width: size * (isActive ? 0.85 : 0.75),
          height: size * (isActive ? 0.85 : 0.75),
          background: `radial-gradient(ellipse at 40% 70%, hsl(340 65% 55% / ${isActive ? 0.7 : 0.5}) 0%, hsl(0 65% 50% / ${isActive ? 0.3 : 0.2}) 50%, transparent 70%)`,
          filter: `blur(${isActive ? 6 : 8}px)`,
          borderRadius: '50% 40% 60% 50% / 50% 50% 40% 60%',
          transition: 'all 0.3s ease-out',
        }}
      />
      
      {/* Center glow - pulses stronger when active */}
      <div 
        className={cn("absolute", isActive ? "animate-siri-center-pulse-active" : "animate-siri-center-pulse")}
        style={{
          width: size * (isActive ? 0.5 : 0.4),
          height: size * (isActive ? 0.5 : 0.4),
          background: `radial-gradient(circle, hsl(0 0% 100% / ${isActive ? 0.6 : 0.4}) 0%, hsl(200 80% 70% / ${isActive ? 0.35 : 0.2}) 40%, transparent 70%)`,
          filter: `blur(${isActive ? 4 : 6}px)`,
          borderRadius: '50%',
          transition: 'all 0.3s ease-out',
        }}
      />
      
      {/* Logo image */}
      <img 
        src="/animated-logo.png" 
        alt="AcademyOS Logo"
        className={cn(
          "relative z-10 object-contain transition-transform duration-300",
          isActive ? "scale-105" : "group-hover:scale-105"
        )}
        style={{
          width: size,
          height: size,
        }}
      />
      
      {/* Siri-style keyframes */}
      <style>{`
        /* Idle state animations - slow and subtle */
        @keyframes siriBlob1 {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
          }
          25% {
            transform: translate(5%, -8%) scale(1.05) rotate(5deg);
            border-radius: 50% 60% 40% 60% / 60% 40% 60% 40%;
          }
          50% {
            transform: translate(-3%, 5%) scale(0.95) rotate(-3deg);
            border-radius: 40% 50% 60% 50% / 50% 60% 50% 40%;
          }
          75% {
            transform: translate(4%, 3%) scale(1.02) rotate(2deg);
            border-radius: 55% 45% 55% 45% / 45% 55% 45% 55%;
          }
        }
        
        @keyframes siriBlob2 {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            border-radius: 50% 60% 40% 50% / 40% 50% 60% 50%;
          }
          20% {
            transform: translate(-6%, 4%) scale(1.03) rotate(-4deg);
            border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
          }
          45% {
            transform: translate(4%, -5%) scale(0.97) rotate(5deg);
            border-radius: 45% 55% 55% 45% / 55% 45% 55% 45%;
          }
          70% {
            transform: translate(-2%, -2%) scale(1.04) rotate(-2deg);
            border-radius: 55% 45% 45% 55% / 45% 55% 55% 45%;
          }
        }
        
        @keyframes siriBlob3 {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            border-radius: 40% 60% 50% 50% / 60% 40% 50% 50%;
          }
          30% {
            transform: translate(5%, 6%) scale(0.96) rotate(6deg);
            border-radius: 55% 45% 50% 50% / 50% 55% 45% 50%;
          }
          60% {
            transform: translate(-4%, -4%) scale(1.05) rotate(-4deg);
            border-radius: 50% 50% 45% 55% / 55% 50% 50% 45%;
          }
          85% {
            transform: translate(2%, -3%) scale(0.98) rotate(2deg);
            border-radius: 45% 55% 55% 45% / 50% 45% 55% 50%;
          }
        }
        
        @keyframes siriBlob4 {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            border-radius: 50% 40% 60% 50% / 50% 50% 40% 60%;
          }
          35% {
            transform: translate(-5%, -5%) scale(1.04) rotate(-5deg);
            border-radius: 45% 55% 45% 55% / 55% 45% 55% 45%;
          }
          55% {
            transform: translate(6%, 3%) scale(0.95) rotate(4deg);
            border-radius: 55% 45% 55% 45% / 45% 55% 45% 55%;
          }
          80% {
            transform: translate(-3%, 4%) scale(1.02) rotate(-2deg);
            border-radius: 50% 50% 50% 50% / 50% 50% 50% 50%;
          }
        }
        
        @keyframes siriCenterPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.9;
          }
        }
        
        /* Active state animations - faster and more dynamic */
        @keyframes siriBlob1Active {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
          }
          15% {
            transform: translate(10%, -12%) scale(1.15) rotate(10deg);
            border-radius: 45% 65% 35% 65% / 65% 35% 65% 35%;
          }
          35% {
            transform: translate(-8%, 10%) scale(0.9) rotate(-8deg);
            border-radius: 35% 55% 65% 45% / 55% 65% 45% 35%;
          }
          55% {
            transform: translate(12%, 5%) scale(1.1) rotate(6deg);
            border-radius: 55% 35% 55% 45% / 45% 55% 35% 55%;
          }
          75% {
            transform: translate(-5%, -8%) scale(0.95) rotate(-4deg);
            border-radius: 50% 50% 50% 50% / 50% 50% 50% 50%;
          }
        }
        
        @keyframes siriBlob2Active {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            border-radius: 50% 60% 40% 50% / 40% 50% 60% 50%;
          }
          20% {
            transform: translate(-12%, 8%) scale(1.12) rotate(-10deg);
            border-radius: 65% 35% 55% 45% / 45% 65% 35% 55%;
          }
          40% {
            transform: translate(8%, -10%) scale(0.88) rotate(12deg);
            border-radius: 40% 60% 60% 40% / 60% 40% 60% 40%;
          }
          60% {
            transform: translate(-6%, -6%) scale(1.08) rotate(-6deg);
            border-radius: 55% 45% 45% 55% / 45% 55% 55% 45%;
          }
          80% {
            transform: translate(10%, 4%) scale(0.95) rotate(4deg);
            border-radius: 48% 52% 52% 48% / 52% 48% 48% 52%;
          }
        }
        
        @keyframes siriBlob3Active {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            border-radius: 40% 60% 50% 50% / 60% 40% 50% 50%;
          }
          25% {
            transform: translate(10%, 12%) scale(0.88) rotate(12deg);
            border-radius: 60% 40% 45% 55% / 45% 60% 40% 55%;
          }
          50% {
            transform: translate(-10%, -8%) scale(1.15) rotate(-10deg);
            border-radius: 45% 55% 40% 60% / 60% 45% 55% 40%;
          }
          75% {
            transform: translate(6%, -10%) scale(0.92) rotate(6deg);
            border-radius: 52% 48% 58% 42% / 48% 42% 58% 52%;
          }
        }
        
        @keyframes siriBlob4Active {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            border-radius: 50% 40% 60% 50% / 50% 50% 40% 60%;
          }
          18% {
            transform: translate(-10%, -10%) scale(1.14) rotate(-12deg);
            border-radius: 42% 58% 42% 58% / 58% 42% 58% 42%;
          }
          38% {
            transform: translate(12%, 6%) scale(0.86) rotate(10deg);
            border-radius: 58% 42% 58% 42% / 42% 58% 42% 58%;
          }
          58% {
            transform: translate(-6%, 10%) scale(1.1) rotate(-6deg);
            border-radius: 48% 52% 48% 52% / 52% 48% 52% 48%;
          }
          78% {
            transform: translate(8%, -6%) scale(0.94) rotate(4deg);
            border-radius: 54% 46% 54% 46% / 46% 54% 46% 54%;
          }
        }
        
        @keyframes siriCenterPulseActive {
          0%, 100% {
            transform: scale(1);
            opacity: 0.85;
          }
          25% {
            transform: scale(1.25);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.9;
          }
          75% {
            transform: scale(1.3);
            opacity: 1;
          }
        }
        
        /* Idle animations */
        .animate-siri-blob-1 {
          animation: siriBlob1 8s ease-in-out infinite;
        }
        
        .animate-siri-blob-2 {
          animation: siriBlob2 10s ease-in-out infinite;
        }
        
        .animate-siri-blob-3 {
          animation: siriBlob3 9s ease-in-out infinite;
        }
        
        .animate-siri-blob-4 {
          animation: siriBlob4 11s ease-in-out infinite;
        }
        
        .animate-siri-center-pulse {
          animation: siriCenterPulse 3s ease-in-out infinite;
        }
        
        /* Active animations - faster */
        .animate-siri-blob-1-active {
          animation: siriBlob1Active 3s ease-in-out infinite;
        }
        
        .animate-siri-blob-2-active {
          animation: siriBlob2Active 3.5s ease-in-out infinite;
        }
        
        .animate-siri-blob-3-active {
          animation: siriBlob3Active 3.2s ease-in-out infinite;
        }
        
        .animate-siri-blob-4-active {
          animation: siriBlob4Active 3.8s ease-in-out infinite;
        }
        
        .animate-siri-center-pulse-active {
          animation: siriCenterPulseActive 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
