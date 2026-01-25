import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
  size?: number;
  className?: string;
}

export const AnimatedLogo = ({ size = 32, className }: AnimatedLogoProps) => {
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Outer glow ring */}
      <div 
        className="absolute inset-0 rounded-full animate-ping opacity-20 bg-white"
        style={{ animationDuration: '2s' }}
      />
      
      {/* Rotating outer ring */}
      <div 
        className="absolute inset-0 rounded-full border-2 border-white/30"
        style={{
          animation: 'spin 8s linear infinite',
        }}
      />
      
      {/* Pulsing middle ring */}
      <div 
        className="absolute rounded-full border border-white/40"
        style={{
          width: size * 0.85,
          height: size * 0.85,
          animation: 'pulse 2s ease-in-out infinite',
        }}
      />
      
      {/* Logo image with subtle scale animation */}
      <img 
        src="/favicon.png" 
        alt="Logo"
        className="relative z-10 rounded-full object-contain"
        style={{
          width: size * 0.75,
          height: size * 0.75,
          animation: 'logoBreath 3s ease-in-out infinite',
        }}
      />
      
      {/* Add custom keyframes via style tag */}
      <style>{`
        @keyframes logoBreath {
          0%, 100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.05);
            filter: brightness(1.1);
          }
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
