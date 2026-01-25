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
      {/* Neural wave layer 1 - outer soft glow */}
      <div 
        className="absolute rounded-full animate-neural-wave-1"
        style={{
          width: size * 1.4,
          height: size * 1.4,
          background: 'conic-gradient(from 0deg, hsl(217 80% 55% / 0.4), hsl(260 70% 60% / 0.3), hsl(320 70% 55% / 0.25), hsl(217 80% 55% / 0.4))',
          filter: 'blur(15px)',
          transformOrigin: 'center',
        }}
      />
      
      {/* Neural wave layer 2 - medium glow */}
      <div 
        className="absolute rounded-full animate-neural-wave-2"
        style={{
          width: size * 1.25,
          height: size * 1.25,
          background: 'conic-gradient(from 120deg, hsl(200 75% 50% / 0.5), hsl(280 65% 55% / 0.4), hsl(340 65% 55% / 0.3), hsl(200 75% 50% / 0.5))',
          filter: 'blur(10px)',
          transformOrigin: 'center',
        }}
      />
      
      {/* Neural wave layer 3 - inner vibrant */}
      <div 
        className="absolute rounded-full animate-neural-wave-3"
        style={{
          width: size * 1.1,
          height: size * 1.1,
          background: 'conic-gradient(from 240deg, hsl(217 85% 50% / 0.6), hsl(0 75% 55% / 0.5), hsl(260 70% 55% / 0.4), hsl(217 85% 50% / 0.6))',
          filter: 'blur(6px)',
          transformOrigin: 'center',
        }}
      />
      
      {/* Pulsing aura */}
      <div 
        className="absolute rounded-full animate-neural-pulse"
        style={{
          width: size,
          height: size,
          background: 'radial-gradient(circle, hsl(217 80% 55% / 0.2) 30%, hsl(280 60% 55% / 0.15) 60%, transparent 70%)',
          filter: 'blur(4px)',
        }}
      />
      
      {/* Logo image */}
      <img 
        src="/favicon.png" 
        alt="Logo"
        className="relative z-10 rounded-full object-contain transition-transform duration-300 group-hover:scale-105"
        style={{
          width: size * 0.85,
          height: size * 0.85,
          filter: 'drop-shadow(0 0 8px hsl(217 80% 55% / 0.3))',
        }}
      />
      
      {/* Custom keyframes */}
      <style>{`
        @keyframes neuralWave1 {
          0% {
            transform: rotate(0deg) scale(1);
            opacity: 0.6;
          }
          33% {
            transform: rotate(120deg) scale(1.05);
            opacity: 0.8;
          }
          66% {
            transform: rotate(240deg) scale(0.98);
            opacity: 0.7;
          }
          100% {
            transform: rotate(360deg) scale(1);
            opacity: 0.6;
          }
        }
        
        @keyframes neuralWave2 {
          0% {
            transform: rotate(360deg) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: rotate(180deg) scale(1.03);
            opacity: 0.85;
          }
          100% {
            transform: rotate(0deg) scale(1);
            opacity: 0.7;
          }
        }
        
        @keyframes neuralWave3 {
          0% {
            transform: rotate(0deg) scale(1);
            opacity: 0.8;
          }
          25% {
            transform: rotate(90deg) scale(1.02);
            opacity: 0.9;
          }
          50% {
            transform: rotate(180deg) scale(0.98);
            opacity: 0.75;
          }
          75% {
            transform: rotate(270deg) scale(1.04);
            opacity: 0.85;
          }
          100% {
            transform: rotate(360deg) scale(1);
            opacity: 0.8;
          }
        }
        
        @keyframes neuralPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.75;
          }
        }
        
        .animate-neural-wave-1 {
          animation: neuralWave1 12s ease-in-out infinite;
        }
        
        .animate-neural-wave-2 {
          animation: neuralWave2 8s ease-in-out infinite;
        }
        
        .animate-neural-wave-3 {
          animation: neuralWave3 6s ease-in-out infinite;
        }
        
        .animate-neural-pulse {
          animation: neuralPulse 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
