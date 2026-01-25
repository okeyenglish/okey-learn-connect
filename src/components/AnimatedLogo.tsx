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
        
        .animate-logo-ring {
          animation: logoRing 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
