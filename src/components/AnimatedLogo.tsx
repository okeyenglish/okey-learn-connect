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
      {/* Siri-like glow directly on the ring */}
      <div 
        className="absolute inset-0 animate-siri-glow-outer"
        style={{
          background: 'conic-gradient(from 0deg, hsl(217 72% 48% / 0.6), hsl(180 60% 50% / 0.5), hsl(260 60% 55% / 0.5), hsl(330 70% 60% / 0.4), hsl(217 72% 48% / 0.6))',
          borderRadius: '50%',
          filter: 'blur(6px)',
          transformOrigin: 'center',
        }}
      />
      
      {/* Inner glow layer */}
      <div 
        className="absolute inset-0 animate-siri-glow-inner"
        style={{
          background: 'conic-gradient(from 180deg, hsl(190 70% 50% / 0.7), transparent 20%, hsl(280 60% 55% / 0.6), transparent 45%, hsl(217 72% 48% / 0.7), transparent 70%, hsl(330 70% 60% / 0.5))',
          borderRadius: '50%',
          filter: 'blur(4px)',
          transformOrigin: 'center',
        }}
      />
      
      {/* Breathing pulse on ring */}
      <div 
        className="absolute inset-0 animate-siri-breathe"
        style={{
          background: 'radial-gradient(circle, transparent 40%, hsl(217 72% 48% / 0.4) 50%, hsl(260 60% 55% / 0.3) 60%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(3px)',
        }}
      />
      
      {/* Rotating ring from logo */}
      <div 
        className="absolute inset-0 flex items-center justify-center animate-logo-ring"
        style={{ transformOrigin: 'center' }}
      >
        <img 
          src="/favicon.png" 
          alt=""
          className="rounded-full object-contain"
          style={{
            width: size,
            height: size,
            clipPath: 'circle(50% at center)',
            mask: 'radial-gradient(circle, transparent 55%, black 56%, black 100%)',
            WebkitMask: 'radial-gradient(circle, transparent 55%, black 56%, black 100%)',
          }}
        />
      </div>
      
      {/* Static center OS */}
      <img 
        src="/favicon.png" 
        alt="Logo"
        className="relative z-10 rounded-full object-contain transition-transform duration-300 group-hover:scale-105"
        style={{
          width: size,
          height: size,
          clipPath: 'circle(55% at center)',
          mask: 'radial-gradient(circle, black 54%, transparent 55%)',
          WebkitMask: 'radial-gradient(circle, black 54%, transparent 55%)',
        }}
      />
      
      {/* Custom keyframes */}
      <style>{`
        @keyframes logoRing {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes siriGlowOuter {
          0% {
            transform: rotate(0deg) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: rotate(180deg) scale(1.02);
            opacity: 0.9;
          }
          100% {
            transform: rotate(360deg) scale(1);
            opacity: 0.7;
          }
        }
        
        @keyframes siriGlowInner {
          0% {
            transform: rotate(360deg);
            opacity: 0.8;
          }
          100% {
            transform: rotate(0deg);
            opacity: 0.8;
          }
        }
        
        @keyframes siriBreathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.03);
            opacity: 0.8;
          }
        }
        
        .animate-logo-ring {
          animation: logoRing 8s linear infinite;
        }
        
        .animate-siri-glow-outer {
          animation: siriGlowOuter 10s ease-in-out infinite;
        }
        
        .animate-siri-glow-inner {
          animation: siriGlowInner 6s linear infinite;
        }
        
        .animate-siri-breathe {
          animation: siriBreathe 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
