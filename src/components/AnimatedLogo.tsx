import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
  size?: number;
  className?: string;
}

export const AnimatedLogo = ({ size = 144, className }: AnimatedLogoProps) => {
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
        className="absolute animate-siri-blob-1"
        style={{
          width: size * 0.9,
          height: size * 0.9,
          background: 'radial-gradient(ellipse at 30% 40%, hsl(217 80% 55% / 0.6) 0%, hsl(217 80% 55% / 0.2) 50%, transparent 70%)',
          filter: 'blur(8px)',
          borderRadius: '60% 40% 50% 50% / 50% 60% 40% 50%',
        }}
      />
      
      {/* Cyan/Teal blob */}
      <div 
        className="absolute animate-siri-blob-2"
        style={{
          width: size * 0.85,
          height: size * 0.85,
          background: 'radial-gradient(ellipse at 60% 30%, hsl(190 70% 50% / 0.5) 0%, hsl(190 70% 50% / 0.15) 50%, transparent 70%)',
          filter: 'blur(10px)',
          borderRadius: '50% 60% 40% 50% / 40% 50% 60% 50%',
        }}
      />
      
      {/* Purple/Magenta blob */}
      <div 
        className="absolute animate-siri-blob-3"
        style={{
          width: size * 0.8,
          height: size * 0.8,
          background: 'radial-gradient(ellipse at 70% 60%, hsl(280 60% 55% / 0.5) 0%, hsl(280 60% 55% / 0.15) 50%, transparent 70%)',
          filter: 'blur(10px)',
          borderRadius: '40% 60% 50% 50% / 60% 40% 50% 50%',
        }}
      />
      
      {/* Pink/Red blob */}
      <div 
        className="absolute animate-siri-blob-4"
        style={{
          width: size * 0.75,
          height: size * 0.75,
          background: 'radial-gradient(ellipse at 40% 70%, hsl(340 65% 55% / 0.5) 0%, hsl(0 65% 50% / 0.2) 50%, transparent 70%)',
          filter: 'blur(8px)',
          borderRadius: '50% 40% 60% 50% / 50% 50% 40% 60%',
        }}
      />
      
      {/* Center glow */}
      <div 
        className="absolute animate-siri-center-pulse"
        style={{
          width: size * 0.4,
          height: size * 0.4,
          background: 'radial-gradient(circle, hsl(0 0% 100% / 0.4) 0%, hsl(200 80% 70% / 0.2) 40%, transparent 70%)',
          filter: 'blur(6px)',
          borderRadius: '50%',
        }}
      />
      
      {/* Logo image */}
      <img 
        src="/animated-logo.png" 
        alt="AcademyOS Logo"
        className="relative z-10 object-contain transition-transform duration-500 group-hover:scale-105"
        style={{
          width: size,
          height: size,
        }}
      />
      
      {/* Siri-style keyframes */}
      <style>{`
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
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
