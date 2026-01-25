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
      {/* Siri-like animated border ring */}
      <div 
        className="absolute inset-0 rounded-full animate-siri-border"
        style={{
          background: 'conic-gradient(from 0deg, hsl(217 72% 48% / 0.9), hsl(180 60% 50% / 0.8), hsl(260 60% 55% / 0.7), hsl(330 70% 60% / 0.6), hsl(217 72% 48% / 0.9))',
          padding: '3px',
        }}
      >
        <div 
          className="w-full h-full rounded-full"
          style={{ background: 'hsl(var(--background))' }}
        />
      </div>
      
      {/* Second layer - counter rotating for dynamic effect */}
      <div 
        className="absolute inset-0 rounded-full animate-siri-border-reverse"
        style={{
          background: 'conic-gradient(from 180deg, hsl(190 70% 50% / 0.6), transparent 30%, hsl(280 60% 55% / 0.5), transparent 60%, hsl(217 72% 48% / 0.6), transparent 90%)',
          padding: '3px',
          mixBlendMode: 'screen',
        }}
      >
        <div 
          className="w-full h-full rounded-full"
          style={{ background: 'hsl(var(--background))' }}
        />
      </div>
      
      {/* Pulsing glow behind border */}
      <div 
        className="absolute inset-[-4px] rounded-full animate-siri-glow"
        style={{
          background: 'conic-gradient(from 90deg, hsl(217 72% 48% / 0.4), hsl(180 60% 50% / 0.3), hsl(260 60% 55% / 0.3), hsl(330 70% 60% / 0.2), hsl(217 72% 48% / 0.4))',
          filter: 'blur(6px)',
        }}
      />
      
      {/* Inner breathing glow */}
      <div 
        className="absolute rounded-full animate-siri-breathe"
        style={{
          width: size * 0.8,
          height: size * 0.8,
          background: 'radial-gradient(circle, hsl(217 72% 48% / 0.1) 0%, transparent 70%)',
        }}
      />
      
      {/* Static logo */}
      <img 
        src="/favicon.png" 
        alt="Logo"
        className="relative z-10 rounded-full object-contain transition-transform duration-300 group-hover:scale-105"
        style={{
          width: size * 0.75,
          height: size * 0.75,
          filter: 'drop-shadow(0 0 6px hsl(217 72% 48% / 0.3))',
        }}
      />
      
      {/* Custom Siri-like keyframes */}
      <style>{`
        @keyframes siriBorder {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes siriBorderReverse {
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
            transform: rotate(180deg) scale(1.08);
            opacity: 0.8;
          }
        }
        
        @keyframes siriBreathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.6;
          }
        }
        
        .animate-siri-border {
          animation: siriBorder 4s linear infinite;
        }
        
        .animate-siri-border-reverse {
          animation: siriBorderReverse 6s linear infinite;
        }
        
        .animate-siri-glow {
          animation: siriGlow 8s ease-in-out infinite;
        }
        
        .animate-siri-breathe {
          animation: siriBreathe 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
