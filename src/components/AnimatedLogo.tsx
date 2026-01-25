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
          width: size * (isActive ? 1.15 : 0.9),
          height: size * (isActive ? 1.15 : 0.9),
          background: `radial-gradient(ellipse at 30% 40%, hsl(217 85% 55% / ${isActive ? 0.95 : 0.6}) 0%, hsl(217 85% 55% / ${isActive ? 0.45 : 0.2}) 50%, transparent 70%)`,
          filter: `blur(${isActive ? 4 : 8}px)`,
          borderRadius: '60% 40% 50% 50% / 50% 60% 40% 50%',
          transition: 'all 0.2s ease-out',
        }}
      />
      
      {/* Cyan/Teal blob */}
      <div 
        className={cn("absolute", isActive ? "animate-siri-blob-2-active" : "animate-siri-blob-2")}
        style={{
          width: size * (isActive ? 1.1 : 0.85),
          height: size * (isActive ? 1.1 : 0.85),
          background: `radial-gradient(ellipse at 60% 30%, hsl(190 80% 50% / ${isActive ? 0.9 : 0.5}) 0%, hsl(190 80% 50% / ${isActive ? 0.4 : 0.15}) 50%, transparent 70%)`,
          filter: `blur(${isActive ? 5 : 10}px)`,
          borderRadius: '50% 60% 40% 50% / 40% 50% 60% 50%',
          transition: 'all 0.2s ease-out',
        }}
      />
      
      {/* Purple/Magenta blob */}
      <div 
        className={cn("absolute", isActive ? "animate-siri-blob-3-active" : "animate-siri-blob-3")}
        style={{
          width: size * (isActive ? 1.05 : 0.8),
          height: size * (isActive ? 1.05 : 0.8),
          background: `radial-gradient(ellipse at 70% 60%, hsl(280 70% 55% / ${isActive ? 0.9 : 0.5}) 0%, hsl(280 70% 55% / ${isActive ? 0.4 : 0.15}) 50%, transparent 70%)`,
          filter: `blur(${isActive ? 5 : 10}px)`,
          borderRadius: '40% 60% 50% 50% / 60% 40% 50% 50%',
          transition: 'all 0.2s ease-out',
        }}
      />
      
      {/* Pink/Red blob */}
      <div 
        className={cn("absolute", isActive ? "animate-siri-blob-4-active" : "animate-siri-blob-4")}
        style={{
          width: size * (isActive ? 1.0 : 0.75),
          height: size * (isActive ? 1.0 : 0.75),
          background: `radial-gradient(ellipse at 40% 70%, hsl(340 75% 55% / ${isActive ? 0.9 : 0.5}) 0%, hsl(0 75% 50% / ${isActive ? 0.45 : 0.2}) 50%, transparent 70%)`,
          filter: `blur(${isActive ? 4 : 8}px)`,
          borderRadius: '50% 40% 60% 50% / 50% 50% 40% 60%',
          transition: 'all 0.2s ease-out',
        }}
      />
      
      {/* Center glow - pulses stronger when active */}
      <div 
        className={cn("absolute", isActive ? "animate-siri-center-pulse-active" : "animate-siri-center-pulse")}
        style={{
          width: size * (isActive ? 0.6 : 0.4),
          height: size * (isActive ? 0.6 : 0.4),
          background: `radial-gradient(circle, hsl(0 0% 100% / ${isActive ? 0.85 : 0.4}) 0%, hsl(200 90% 70% / ${isActive ? 0.5 : 0.2}) 40%, transparent 70%)`,
          filter: `blur(${isActive ? 2 : 6}px)`,
          borderRadius: '50%',
          transition: 'all 0.2s ease-out',
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
        
        /* Active state animations - INTENSE and dynamic */
        @keyframes siriBlob1Active {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
          }
          10% {
            transform: translate(18%, -20%) scale(1.3) rotate(15deg);
            border-radius: 40% 70% 30% 70% / 70% 30% 70% 30%;
          }
          25% {
            transform: translate(-15%, 18%) scale(0.8) rotate(-12deg);
            border-radius: 30% 50% 70% 40% / 50% 70% 40% 30%;
          }
          40% {
            transform: translate(20%, 10%) scale(1.25) rotate(10deg);
            border-radius: 60% 30% 60% 40% / 40% 60% 30% 60%;
          }
          55% {
            transform: translate(-12%, -15%) scale(0.85) rotate(-8deg);
            border-radius: 45% 55% 45% 55% / 55% 45% 55% 45%;
          }
          70% {
            transform: translate(15%, -10%) scale(1.2) rotate(12deg);
            border-radius: 55% 45% 55% 45% / 45% 55% 45% 55%;
          }
          85% {
            transform: translate(-8%, 12%) scale(0.9) rotate(-6deg);
            border-radius: 50% 50% 50% 50% / 50% 50% 50% 50%;
          }
        }
        
        @keyframes siriBlob2Active {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            border-radius: 50% 60% 40% 50% / 40% 50% 60% 50%;
          }
          12% {
            transform: translate(-20%, 15%) scale(1.25) rotate(-15deg);
            border-radius: 70% 30% 60% 40% / 40% 70% 30% 60%;
          }
          28% {
            transform: translate(15%, -18%) scale(0.75) rotate(18deg);
            border-radius: 35% 65% 65% 35% / 65% 35% 65% 35%;
          }
          42% {
            transform: translate(-10%, -12%) scale(1.2) rotate(-10deg);
            border-radius: 60% 40% 40% 60% / 40% 60% 60% 40%;
          }
          58% {
            transform: translate(18%, 8%) scale(0.8) rotate(12deg);
            border-radius: 45% 55% 55% 45% / 55% 45% 45% 55%;
          }
          72% {
            transform: translate(-15%, -8%) scale(1.15) rotate(-8deg);
            border-radius: 55% 45% 45% 55% / 45% 55% 55% 45%;
          }
          88% {
            transform: translate(10%, 15%) scale(0.9) rotate(6deg);
            border-radius: 48% 52% 52% 48% / 52% 48% 48% 52%;
          }
        }
        
        @keyframes siriBlob3Active {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            border-radius: 40% 60% 50% 50% / 60% 40% 50% 50%;
          }
          15% {
            transform: translate(18%, 20%) scale(0.75) rotate(18deg);
            border-radius: 65% 35% 40% 60% / 40% 65% 35% 60%;
          }
          32% {
            transform: translate(-18%, -15%) scale(1.3) rotate(-15deg);
            border-radius: 40% 60% 35% 65% / 65% 40% 60% 35%;
          }
          48% {
            transform: translate(12%, -18%) scale(0.8) rotate(12deg);
            border-radius: 55% 45% 60% 40% / 45% 40% 60% 55%;
          }
          65% {
            transform: translate(-15%, 12%) scale(1.2) rotate(-10deg);
            border-radius: 45% 55% 45% 55% / 55% 45% 55% 45%;
          }
          82% {
            transform: translate(10%, -8%) scale(0.85) rotate(8deg);
            border-radius: 52% 48% 58% 42% / 48% 42% 58% 52%;
          }
        }
        
        @keyframes siriBlob4Active {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            border-radius: 50% 40% 60% 50% / 50% 50% 40% 60%;
          }
          14% {
            transform: translate(-18%, -18%) scale(1.28) rotate(-18deg);
            border-radius: 38% 62% 38% 62% / 62% 38% 62% 38%;
          }
          30% {
            transform: translate(20%, 12%) scale(0.72) rotate(15deg);
            border-radius: 62% 38% 62% 38% / 38% 62% 38% 62%;
          }
          45% {
            transform: translate(-12%, 18%) scale(1.22) rotate(-12deg);
            border-radius: 45% 55% 45% 55% / 55% 45% 55% 45%;
          }
          60% {
            transform: translate(15%, -15%) scale(0.78) rotate(10deg);
            border-radius: 55% 45% 55% 45% / 45% 55% 45% 55%;
          }
          75% {
            transform: translate(-10%, -10%) scale(1.15) rotate(-8deg);
            border-radius: 50% 50% 50% 50% / 50% 50% 50% 50%;
          }
          90% {
            transform: translate(12%, 8%) scale(0.88) rotate(6deg);
            border-radius: 54% 46% 54% 46% / 46% 54% 46% 54%;
          }
        }
        
        @keyframes siriCenterPulseActive {
          0%, 100% {
            transform: scale(1);
            opacity: 0.9;
          }
          15% {
            transform: scale(1.4);
            opacity: 1;
          }
          30% {
            transform: scale(1.1);
            opacity: 0.85;
          }
          45% {
            transform: scale(1.5);
            opacity: 1;
          }
          60% {
            transform: scale(1.15);
            opacity: 0.9;
          }
          75% {
            transform: scale(1.45);
            opacity: 1;
          }
          90% {
            transform: scale(1.2);
            opacity: 0.95;
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
        
        /* Active animations - MUCH faster and more intense */
        .animate-siri-blob-1-active {
          animation: siriBlob1Active 1.8s ease-in-out infinite;
        }
        
        .animate-siri-blob-2-active {
          animation: siriBlob2Active 2.1s ease-in-out infinite;
        }
        
        .animate-siri-blob-3-active {
          animation: siriBlob3Active 1.9s ease-in-out infinite;
        }
        
        .animate-siri-blob-4-active {
          animation: siriBlob4Active 2.3s ease-in-out infinite;
        }
        
        .animate-siri-center-pulse-active {
          animation: siriCenterPulseActive 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
