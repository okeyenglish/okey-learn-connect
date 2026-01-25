import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
  size?: number;
  className?: string;
}

export const AnimatedLogo = ({ size = 144, className }: AnimatedLogoProps) => {
  const ringSize = size * 1.4;
  const innerRingSize = size * 1.25;
  
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center cursor-pointer group",
        className
      )}
      style={{ width: ringSize, height: ringSize }}
    >
      {/* Outer soft glow - ambient energy */}
      <div 
        className="absolute rounded-full animate-ambient-pulse"
        style={{
          width: ringSize * 1.2,
          height: ringSize * 1.2,
          background: 'radial-gradient(circle, hsl(217 72% 48% / 0.15) 30%, hsl(0 65% 50% / 0.1) 60%, transparent 80%)',
          filter: 'blur(20px)',
        }}
      />
      
      {/* Main rotating ring - blue to red gradient */}
      <div 
        className="absolute rounded-full animate-ring-rotate"
        style={{
          width: ringSize,
          height: ringSize,
          background: `conic-gradient(
            from 0deg,
            hsl(217 72% 48% / 0.6),
            hsl(217 72% 55% / 0.4),
            hsl(280 50% 50% / 0.3),
            hsl(340 60% 50% / 0.4),
            hsl(0 65% 50% / 0.5),
            hsl(340 60% 50% / 0.4),
            hsl(280 50% 50% / 0.3),
            hsl(217 72% 55% / 0.4),
            hsl(217 72% 48% / 0.6)
          )`,
          filter: 'blur(8px)',
          maskImage: 'radial-gradient(circle, transparent 55%, black 60%, black 70%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(circle, transparent 55%, black 60%, black 70%, transparent 75%)',
        }}
      />
      
      {/* Inner glow ring - softer, counter-rotate */}
      <div 
        className="absolute rounded-full animate-ring-counter-rotate"
        style={{
          width: innerRingSize,
          height: innerRingSize,
          background: `conic-gradient(
            from 180deg,
            hsl(0 65% 50% / 0.3),
            hsl(217 72% 48% / 0.2),
            hsl(0 65% 50% / 0.3),
            hsl(217 72% 48% / 0.2),
            hsl(0 65% 50% / 0.3)
          )`,
          filter: 'blur(6px)',
          maskImage: 'radial-gradient(circle, transparent 60%, black 65%, black 72%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(circle, transparent 60%, black 65%, black 72%, transparent 78%)',
        }}
      />
      
      {/* Light trail particles - moving along the ring */}
      <div className="absolute rounded-full animate-particles-orbit" style={{ width: ringSize, height: ringSize }}>
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: 4,
              height: 4,
              background: i % 2 === 0 ? 'hsl(217 72% 60%)' : 'hsl(0 65% 55%)',
              borderRadius: '50%',
              boxShadow: `0 0 8px 2px ${i % 2 === 0 ? 'hsl(217 72% 60% / 0.6)' : 'hsl(0 65% 55% / 0.6)'}`,
              top: '50%',
              left: '50%',
              transform: `rotate(${angle}deg) translateX(${ringSize / 2 - 4}px) translateY(-50%)`,
              opacity: 0.7,
            }}
          />
        ))}
      </div>
      
      {/* Subtle sparks - for aliveness */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute animate-spark-1"
          style={{
            width: 2,
            height: 2,
            background: 'hsl(217 72% 70%)',
            borderRadius: '50%',
            boxShadow: '0 0 6px 2px hsl(217 72% 60% / 0.5)',
            top: '8%',
            left: '50%',
          }}
        />
        <div 
          className="absolute animate-spark-2"
          style={{
            width: 2,
            height: 2,
            background: 'hsl(0 65% 60%)',
            borderRadius: '50%',
            boxShadow: '0 0 6px 2px hsl(0 65% 55% / 0.5)',
            top: '50%',
            right: '5%',
          }}
        />
        <div 
          className="absolute animate-spark-3"
          style={{
            width: 2,
            height: 2,
            background: 'hsl(280 50% 60%)',
            borderRadius: '50%',
            boxShadow: '0 0 5px 1px hsl(280 50% 55% / 0.4)',
            bottom: '10%',
            left: '25%',
          }}
        />
        <div 
          className="absolute animate-spark-4"
          style={{
            width: 2,
            height: 2,
            background: 'hsl(217 72% 65%)',
            borderRadius: '50%',
            boxShadow: '0 0 5px 1px hsl(217 72% 60% / 0.4)',
            bottom: '20%',
            right: '20%',
          }}
        />
      </div>
      
      {/* Logo image */}
      <img 
        src="/animated-logo.png" 
        alt="AcademyOS Logo"
        className="relative z-10 object-contain transition-transform duration-500 group-hover:scale-105"
        style={{
          width: size,
          height: size,
          mixBlendMode: 'multiply',
        }}
      />
      
      {/* Custom keyframes */}
      <style>{`
        @keyframes ambientPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }
        
        @keyframes ringRotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes ringCounterRotate {
          0% {
            transform: rotate(360deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }
        
        @keyframes particlesOrbit {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes spark1 {
          0%, 100% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            opacity: 0.8;
            transform: scale(1);
          }
        }
        
        @keyframes spark2 {
          0%, 100% {
            opacity: 0;
            transform: scale(0.5);
          }
          40% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
        
        @keyframes spark3 {
          0%, 100% {
            opacity: 0;
            transform: scale(0.5);
          }
          60% {
            opacity: 0.6;
            transform: scale(1);
          }
        }
        
        @keyframes spark4 {
          0%, 100% {
            opacity: 0;
            transform: scale(0.5);
          }
          70% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }
        
        .animate-ambient-pulse {
          animation: ambientPulse 6s ease-in-out infinite;
        }
        
        .animate-ring-rotate {
          animation: ringRotate 20s linear infinite;
        }
        
        .animate-ring-counter-rotate {
          animation: ringCounterRotate 25s linear infinite;
        }
        
        .animate-particles-orbit {
          animation: particlesOrbit 15s linear infinite;
        }
        
        .animate-spark-1 {
          animation: spark1 3s ease-in-out infinite;
        }
        
        .animate-spark-2 {
          animation: spark2 4s ease-in-out infinite 0.5s;
        }
        
        .animate-spark-3 {
          animation: spark3 3.5s ease-in-out infinite 1s;
        }
        
        .animate-spark-4 {
          animation: spark4 4.5s ease-in-out infinite 1.5s;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
