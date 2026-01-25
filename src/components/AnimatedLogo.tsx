import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
  size?: number;
  className?: string;
}

export const AnimatedLogo = ({ size = 72, className }: AnimatedLogoProps) => {
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center cursor-pointer group",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Outer glow pulsing - BEHIND logo */}
      <div 
        className="absolute rounded-full animate-glow-pulse -z-10"
        style={{
          width: size * 1.5,
          height: size * 1.5,
          background: 'conic-gradient(from 0deg, hsl(217 85% 55% / 0.4), hsl(280 70% 55% / 0.3), hsl(330 75% 55% / 0.3), hsl(0 80% 55% / 0.4), hsl(217 85% 55% / 0.4))',
          filter: 'blur(18px)',
          transformOrigin: 'center',
        }}
      />
      
      {/* Mid glow rotating - BEHIND logo */}
      <div 
        className="absolute rounded-full animate-glow-rotate -z-10"
        style={{
          width: size * 1.35,
          height: size * 1.35,
          background: 'conic-gradient(from 90deg, hsl(210 90% 60% / 0.5), hsl(280 70% 60% / 0.4), hsl(340 75% 60% / 0.4), hsl(0 85% 55% / 0.5), hsl(210 90% 60% / 0.5))',
          filter: 'blur(12px)',
          transformOrigin: 'center',
        }}
      />
      
      {/* Inner glow breathing - BEHIND logo */}
      <div 
        className="absolute rounded-full animate-glow-breathe -z-10"
        style={{
          width: size * 1.2,
          height: size * 1.2,
          background: 'radial-gradient(circle, hsl(217 85% 55% / 0.35) 40%, hsl(330 70% 55% / 0.3) 60%, transparent 75%)',
          filter: 'blur(8px)',
        }}
      />
      
      {/* Logo container with isolation to prevent blend affecting glow */}
      <div 
        className="relative z-10 transition-transform duration-300 group-hover:scale-105"
        style={{
          width: size * 1.15,
          height: size * 1.15,
          isolation: 'isolate',
        }}
      >
        <img 
          src="/animated-logo.png" 
          alt="Logo"
          className="w-full h-full object-contain"
          style={{
            mixBlendMode: 'multiply',
          }}
        />
      </div>
      
      {/* Sparkle effects - ON TOP */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <div 
          className="absolute animate-sparkle-1"
          style={{
            width: 3,
            height: 3,
            background: 'white',
            borderRadius: '50%',
            boxShadow: '0 0 6px 2px white',
            top: '10%',
            left: '5%',
          }}
        />
        <div 
          className="absolute animate-sparkle-2"
          style={{
            width: 2,
            height: 2,
            background: 'white',
            borderRadius: '50%',
            boxShadow: '0 0 4px 1px white',
            top: '80%',
            left: '10%',
          }}
        />
        <div 
          className="absolute animate-sparkle-3"
          style={{
            width: 2,
            height: 2,
            background: 'white',
            borderRadius: '50%',
            boxShadow: '0 0 5px 2px white',
            top: '90%',
            right: '15%',
          }}
        />
        <div 
          className="absolute animate-sparkle-4"
          style={{
            width: 3,
            height: 3,
            background: 'white',
            borderRadius: '50%',
            boxShadow: '0 0 6px 2px white',
            top: '15%',
            right: '10%',
          }}
        />
      </div>
      
      {/* Custom keyframes */}
      <style>{`
        @keyframes glowPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.9;
          }
        }
        
        @keyframes glowRotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes glowBreathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.8;
          }
        }
        
        @keyframes sparkle1 {
          0%, 100% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes sparkle2 {
          0%, 100% {
            opacity: 0;
            transform: scale(0.5);
          }
          60% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
        
        @keyframes sparkle3 {
          0%, 100% {
            opacity: 0;
            transform: scale(0.5);
          }
          40% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes sparkle4 {
          0%, 100% {
            opacity: 0;
            transform: scale(0.5);
          }
          70% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
        
        .animate-glow-pulse {
          animation: glowPulse 4s ease-in-out infinite;
        }
        
        .animate-glow-rotate {
          animation: glowRotate 15s linear infinite;
        }
        
        .animate-glow-breathe {
          animation: glowBreathe 3s ease-in-out infinite;
        }
        
        .animate-sparkle-1 {
          animation: sparkle1 2s ease-in-out infinite;
        }
        
        .animate-sparkle-2 {
          animation: sparkle2 2.5s ease-in-out infinite 0.3s;
        }
        
        .animate-sparkle-3 {
          animation: sparkle3 2.2s ease-in-out infinite 0.6s;
        }
        
        .animate-sparkle-4 {
          animation: sparkle4 2.8s ease-in-out infinite 0.9s;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
