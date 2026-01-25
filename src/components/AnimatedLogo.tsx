import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
  size?: number;
  className?: string;
}

export const AnimatedLogo = ({ size = 56, className }: AnimatedLogoProps) => {
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center cursor-pointer group",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Outer pulsing glow */}
      <div 
        className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 to-red-500/30 blur-md"
        style={{
          animation: 'glowPulse 2s ease-in-out infinite',
        }}
      />
      
      {/* Shadow for depth */}
      <div 
        className="absolute rounded-full bg-black/20 blur-lg"
        style={{
          width: size * 0.9,
          height: size * 0.3,
          bottom: -size * 0.1,
          animation: 'shadowPulse 2s ease-in-out infinite',
        }}
      />
      
      {/* Logo image with rotation and breathing animation */}
      <img 
        src="/favicon.png" 
        alt="Logo"
        className="relative z-10 rounded-full object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-110"
        style={{
          width: size,
          height: size,
          animation: 'logoSpin 12s linear infinite, logoBreath 2s ease-in-out infinite',
        }}
      />
      
      {/* Custom keyframes */}
      <style>{`
        @keyframes logoSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes logoBreath {
          0%, 100% {
            filter: brightness(1) drop-shadow(0 0 8px rgba(59, 130, 246, 0.5));
          }
          50% {
            filter: brightness(1.15) drop-shadow(0 0 16px rgba(239, 68, 68, 0.6));
          }
        }
        
        @keyframes glowPulse {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }
        
        @keyframes shadowPulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
