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
      {/* Siri-like animated orbs container */}
      <div 
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{ filter: 'blur(3px)' }}
      >
        {/* Primary blue orb - rotating clockwise */}
        <div 
          className="absolute rounded-full animate-siri-orb-1"
          style={{
            width: size * 0.6,
            height: size * 0.6,
            background: 'radial-gradient(circle, hsl(217 72% 58% / 0.8) 0%, hsl(217 72% 48% / 0.4) 50%, transparent 70%)',
            top: '10%',
            left: '10%',
          }}
        />
        
        {/* Secondary teal orb - rotating counter-clockwise */}
        <div 
          className="absolute rounded-full animate-siri-orb-2"
          style={{
            width: size * 0.5,
            height: size * 0.5,
            background: 'radial-gradient(circle, hsl(180 60% 50% / 0.7) 0%, hsl(190 70% 45% / 0.3) 50%, transparent 70%)',
            bottom: '5%',
            right: '5%',
          }}
        />
        
        {/* Accent violet orb */}
        <div 
          className="absolute rounded-full animate-siri-orb-3"
          style={{
            width: size * 0.45,
            height: size * 0.45,
            background: 'radial-gradient(circle, hsl(260 60% 55% / 0.6) 0%, hsl(280 50% 50% / 0.3) 50%, transparent 70%)',
            top: '30%',
            right: '0%',
          }}
        />
        
        {/* Soft pink accent orb */}
        <div 
          className="absolute rounded-full animate-siri-orb-4"
          style={{
            width: size * 0.4,
            height: size * 0.4,
            background: 'radial-gradient(circle, hsl(330 70% 60% / 0.5) 0%, hsl(350 60% 55% / 0.2) 50%, transparent 70%)',
            bottom: '20%',
            left: '5%',
          }}
        />
      </div>
      
      {/* Outer glow ring */}
      <div 
        className="absolute inset-0 rounded-full animate-siri-glow"
        style={{
          background: 'conic-gradient(from 0deg, hsl(217 72% 48% / 0.3), hsl(180 60% 50% / 0.3), hsl(260 60% 55% / 0.3), hsl(330 70% 60% / 0.2), hsl(217 72% 48% / 0.3))',
          filter: 'blur(6px)',
        }}
      />
      
      {/* Inner breathing glow */}
      <div 
        className="absolute rounded-full animate-siri-breathe"
        style={{
          width: size * 0.85,
          height: size * 0.85,
          background: 'radial-gradient(circle, hsl(217 72% 48% / 0.15) 0%, transparent 70%)',
        }}
      />
      
      {/* Static logo */}
      <img 
        src="/favicon.png" 
        alt="Logo"
        className="relative z-10 rounded-full object-contain transition-transform duration-300 group-hover:scale-105"
        style={{
          width: size * 0.7,
          height: size * 0.7,
          filter: 'drop-shadow(0 0 8px hsl(217 72% 48% / 0.4))',
        }}
      />
      
      {/* Custom Siri-like keyframes */}
      <style>{`
        @keyframes siriOrb1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.8;
          }
          25% {
            transform: translate(15%, 20%) scale(1.1);
            opacity: 0.6;
          }
          50% {
            transform: translate(25%, 5%) scale(0.9);
            opacity: 0.9;
          }
          75% {
            transform: translate(10%, -10%) scale(1.05);
            opacity: 0.7;
          }
        }
        
        @keyframes siriOrb2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.7;
          }
          25% {
            transform: translate(-20%, -15%) scale(1.15);
            opacity: 0.5;
          }
          50% {
            transform: translate(-10%, -25%) scale(0.95);
            opacity: 0.8;
          }
          75% {
            transform: translate(-5%, 10%) scale(1.1);
            opacity: 0.6;
          }
        }
        
        @keyframes siriOrb3 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.6;
          }
          33% {
            transform: translate(-15%, 15%) scale(1.2);
            opacity: 0.8;
          }
          66% {
            transform: translate(-25%, -5%) scale(0.85);
            opacity: 0.5;
          }
        }
        
        @keyframes siriOrb4 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.5;
          }
          33% {
            transform: translate(20%, -20%) scale(1.1);
            opacity: 0.7;
          }
          66% {
            transform: translate(10%, 15%) scale(0.9);
            opacity: 0.4;
          }
        }
        
        @keyframes siriGlow {
          0% {
            transform: rotate(0deg) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: rotate(180deg) scale(1.05);
            opacity: 0.8;
          }
          100% {
            transform: rotate(360deg) scale(1);
            opacity: 0.6;
          }
        }
        
        @keyframes siriBreathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.7;
          }
        }
        
        .animate-siri-orb-1 {
          animation: siriOrb1 6s ease-in-out infinite;
        }
        
        .animate-siri-orb-2 {
          animation: siriOrb2 7s ease-in-out infinite;
        }
        
        .animate-siri-orb-3 {
          animation: siriOrb3 5s ease-in-out infinite;
        }
        
        .animate-siri-orb-4 {
          animation: siriOrb4 8s ease-in-out infinite;
        }
        
        .animate-siri-glow {
          animation: siriGlow 10s linear infinite;
        }
        
        .animate-siri-breathe {
          animation: siriBreathe 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
