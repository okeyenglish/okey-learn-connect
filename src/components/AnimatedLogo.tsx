import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
  size?: number;
  className?: string;
}

export const AnimatedLogo = ({ size = 144, className }: AnimatedLogoProps) => {
  const ringSize = size * 1.15; // Tighter ring around logo
  
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center cursor-pointer group",
        className
      )}
      style={{ 
        width: ringSize, 
        height: ringSize,
        background: 'transparent',
      }}
    >
      {/* Main rotating ring - blue to red gradient, tight around logo edge */}
      <div 
        className="absolute rounded-full animate-ring-rotate"
        style={{
          width: ringSize,
          height: ringSize,
          background: `conic-gradient(
            from 0deg,
            hsl(217 72% 50% / 0.8),
            hsl(217 72% 55% / 0.6),
            hsl(260 50% 50% / 0.5),
            hsl(320 55% 50% / 0.6),
            hsl(0 65% 50% / 0.7),
            hsl(320 55% 50% / 0.6),
            hsl(260 50% 50% / 0.5),
            hsl(217 72% 55% / 0.6),
            hsl(217 72% 50% / 0.8)
          )`,
          filter: 'blur(5px)',
          maskImage: `radial-gradient(circle, transparent ${size / 2 - 6}px, black ${size / 2 - 4}px, black ${ringSize / 2 - 2}px, transparent ${ringSize / 2}px)`,
          WebkitMaskImage: `radial-gradient(circle, transparent ${size / 2 - 6}px, black ${size / 2 - 4}px, black ${ringSize / 2 - 2}px, transparent ${ringSize / 2}px)`,
        }}
      />
      
      {/* Inner glow ring - softer, counter-rotate, hugging logo */}
      <div 
        className="absolute rounded-full animate-ring-counter-rotate"
        style={{
          width: size * 1.08,
          height: size * 1.08,
          background: `conic-gradient(
            from 180deg,
            hsl(0 60% 50% / 0.5),
            hsl(217 70% 50% / 0.4),
            hsl(0 60% 50% / 0.5),
            hsl(217 70% 50% / 0.4),
            hsl(0 60% 50% / 0.5)
          )`,
          filter: 'blur(3px)',
          maskImage: `radial-gradient(circle, transparent ${size / 2 - 8}px, black ${size / 2 - 6}px, black ${size / 2 + 2}px, transparent ${size / 2 + 6}px)`,
          WebkitMaskImage: `radial-gradient(circle, transparent ${size / 2 - 8}px, black ${size / 2 - 6}px, black ${size / 2 + 2}px, transparent ${size / 2 + 6}px)`,
        }}
      />
      
      {/* Orbiting light particles - at logo edge */}
      <div 
        className="absolute rounded-full animate-particles-orbit pointer-events-none" 
        style={{ width: size, height: size }}
      >
        {[0, 120, 240].map((angle, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: 3,
              height: 3,
              background: i === 0 ? 'hsl(217 80% 65%)' : i === 1 ? 'hsl(0 70% 60%)' : 'hsl(260 60% 60%)',
              borderRadius: '50%',
              boxShadow: `0 0 5px 2px ${i === 0 ? 'hsl(217 80% 60% / 0.7)' : i === 1 ? 'hsl(0 70% 55% / 0.7)' : 'hsl(260 60% 55% / 0.6)'}`,
              top: '50%',
              left: '50%',
              transform: `rotate(${angle}deg) translateX(${size / 2 - 2}px) translateY(-50%)`,
            }}
          />
        ))}
      </div>
      
      {/* Subtle sparks */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute animate-spark-1"
          style={{
            width: 2,
            height: 2,
            background: 'hsl(217 80% 70%)',
            borderRadius: '50%',
            boxShadow: '0 0 4px 1px hsl(217 80% 65% / 0.6)',
            top: '5%',
            left: '50%',
          }}
        />
        <div 
          className="absolute animate-spark-2"
          style={{
            width: 2,
            height: 2,
            background: 'hsl(0 70% 60%)',
            borderRadius: '50%',
            boxShadow: '0 0 4px 1px hsl(0 70% 55% / 0.6)',
            top: '50%',
            right: '3%',
          }}
        />
        <div 
          className="absolute animate-spark-3"
          style={{
            width: 2,
            height: 2,
            background: 'hsl(260 60% 65%)',
            borderRadius: '50%',
            boxShadow: '0 0 4px 1px hsl(260 60% 60% / 0.5)',
            bottom: '8%',
            left: '30%',
          }}
        />
      </div>
      
      {/* Logo image - centered, clean, no background manipulation */}
      <img 
        src="/animated-logo.png" 
        alt="AcademyOS Logo"
        className="relative z-10 object-contain transition-transform duration-500 group-hover:scale-105"
        style={{
          width: size,
          height: size,
        }}
      />
      
      {/* Keyframes */}
      <style>{`
        @keyframes ringRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes ringCounterRotate {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        
        @keyframes particlesOrbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes spark1 {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 0.8; transform: scale(1); }
        }
        
        @keyframes spark2 {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          45% { opacity: 0.7; transform: scale(1.1); }
        }
        
        @keyframes spark3 {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          55% { opacity: 0.6; transform: scale(1); }
        }
        
        .animate-ring-rotate {
          animation: ringRotate 18s linear infinite;
        }
        
        .animate-ring-counter-rotate {
          animation: ringCounterRotate 22s linear infinite;
        }
        
        .animate-particles-orbit {
          animation: particlesOrbit 12s linear infinite;
        }
        
        .animate-spark-1 {
          animation: spark1 3s ease-in-out infinite;
        }
        
        .animate-spark-2 {
          animation: spark2 3.5s ease-in-out infinite 0.5s;
        }
        
        .animate-spark-3 {
          animation: spark3 4s ease-in-out infinite 1s;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
