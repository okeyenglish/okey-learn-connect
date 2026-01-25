import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
  size?: number;
  className?: string;
}

export const AnimatedLogo = ({ size = 72, className }: AnimatedLogoProps) => {
  const innerRadius = size * 0.35;
  
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
          width: size * 1.3,
          height: size * 1.3,
          background: 'conic-gradient(from 0deg, hsl(217 85% 50% / 0.5), hsl(0 80% 55% / 0.4), hsl(217 85% 50% / 0.5), hsl(0 80% 55% / 0.4))',
          filter: 'blur(14px)',
          transformOrigin: 'center',
        }}
      />
      
      {/* Neural wave layer 2 - medium */}
      <div 
        className="absolute rounded-full animate-neural-wave-2"
        style={{
          width: size * 1.15,
          height: size * 1.15,
          background: 'conic-gradient(from 90deg, hsl(0 80% 55% / 0.6), hsl(217 85% 50% / 0.5), hsl(0 80% 55% / 0.6), hsl(217 85% 50% / 0.5))',
          filter: 'blur(10px)',
          transformOrigin: 'center',
        }}
      />
      
      {/* Neural wave layer 3 - inner vibrant */}
      <div 
        className="absolute rounded-full animate-neural-wave-3"
        style={{
          width: size,
          height: size,
          background: 'conic-gradient(from 180deg, hsl(217 90% 50% / 0.7), hsl(0 85% 50% / 0.6), hsl(217 90% 50% / 0.7), hsl(0 85% 50% / 0.6))',
          filter: 'blur(6px)',
          transformOrigin: 'center',
        }}
      />
      
      {/* Pulsing aura */}
      <div 
        className="absolute rounded-full animate-neural-pulse"
        style={{
          width: size * 0.9,
          height: size * 0.9,
          background: 'radial-gradient(circle, hsl(217 85% 50% / 0.3) 40%, hsl(0 80% 55% / 0.2) 60%, transparent 75%)',
          filter: 'blur(4px)',
        }}
      />
      
      {/* White center circle with OS */}
      <svg 
        className="relative z-10"
        width={innerRadius * 2.2}
        height={innerRadius * 2.2}
        viewBox={`0 0 ${innerRadius * 2.2} ${innerRadius * 2.2}`}
      >
        {/* White circle */}
        <circle
          cx={innerRadius * 1.1}
          cy={innerRadius * 1.1}
          r={innerRadius}
          fill="white"
          style={{ filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15))' }}
        />
        
        {/* OS text */}
        <text
          x={innerRadius * 1.1}
          y={innerRadius * 1.1}
          textAnchor="middle"
          dominantBaseline="central"
          fill="hsl(0 75% 45%)"
          fontWeight="bold"
          fontSize={innerRadius * 0.8}
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          OS
        </text>
      </svg>
      
      {/* Custom keyframes */}
      <style>{`
        @keyframes neuralWave1 {
          0% {
            transform: rotate(0deg) scale(1);
            opacity: 0.6;
          }
          33% {
            transform: rotate(120deg) scale(1.04);
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
            transform: rotate(180deg) scale(1.02);
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
            transform: rotate(90deg) scale(1.01);
            opacity: 0.9;
          }
          50% {
            transform: rotate(180deg) scale(0.99);
            opacity: 0.75;
          }
          75% {
            transform: rotate(270deg) scale(1.02);
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
            transform: scale(1.06);
            opacity: 0.7;
          }
        }
        
        .animate-neural-wave-1 {
          animation: neuralWave1 12s ease-in-out infinite;
        }
        
        .animate-neural-wave-2 {
          animation: neuralWave2 8s ease-in-out infinite;
        }
        
        .animate-neural-wave-3 {
          animation: neuralWave3 5s ease-in-out infinite;
        }
        
        .animate-neural-pulse {
          animation: neuralPulse 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
