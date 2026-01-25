import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
  size?: number;
  className?: string;
}

export const AnimatedLogo = ({ size = 72, className }: AnimatedLogoProps) => {
  const center = size / 2;
  const innerRadius = size * 0.38;
  
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center cursor-pointer group",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Outer glow layer */}
      <div 
        className="absolute inset-[-8px] rounded-full animate-core-glow"
        style={{
          background: 'conic-gradient(from 0deg, hsl(217 85% 50% / 0.5), hsl(0 80% 55% / 0.4), hsl(217 85% 50% / 0.5), hsl(0 80% 55% / 0.4))',
          filter: 'blur(12px)',
        }}
      />
      
      {/* Main AI core ring - thick areas */}
      <div 
        className="absolute inset-0 rounded-full animate-core-ring-1"
        style={{
          background: `conic-gradient(
            from 0deg,
            hsl(217 85% 50%) 0deg,
            hsl(217 85% 55%) 40deg,
            hsl(240 70% 55%) 80deg,
            hsl(0 80% 55%) 120deg,
            hsl(0 85% 50%) 160deg,
            hsl(15 85% 55%) 200deg,
            hsl(217 85% 50%) 240deg,
            hsl(200 80% 55%) 280deg,
            hsl(0 75% 55%) 320deg,
            hsl(217 85% 50%) 360deg
          )`,
          padding: '6px',
          transformOrigin: 'center',
        }}
      >
        <div className="w-full h-full rounded-full bg-white" />
      </div>
      
      {/* Secondary pulsing ring - variable thickness */}
      <div 
        className="absolute inset-[2px] rounded-full animate-core-ring-2"
        style={{
          background: `conic-gradient(
            from 180deg,
            transparent 0deg,
            hsl(217 85% 50% / 0.8) 30deg,
            hsl(217 85% 55%) 60deg,
            transparent 90deg,
            transparent 120deg,
            hsl(0 80% 55% / 0.8) 150deg,
            hsl(0 85% 50%) 180deg,
            transparent 210deg,
            transparent 240deg,
            hsl(260 70% 55% / 0.6) 270deg,
            hsl(217 85% 50% / 0.7) 300deg,
            transparent 330deg,
            transparent 360deg
          )`,
          padding: '4px',
          transformOrigin: 'center',
          mixBlendMode: 'multiply',
        }}
      >
        <div className="w-full h-full rounded-full bg-white" />
      </div>
      
      {/* Inner breathing glow */}
      <div 
        className="absolute rounded-full animate-core-breathe"
        style={{
          width: size * 0.85,
          height: size * 0.85,
          background: 'conic-gradient(from 90deg, hsl(217 85% 50% / 0.15), hsl(0 80% 55% / 0.1), hsl(217 85% 50% / 0.15))',
          filter: 'blur(4px)',
        }}
      />
      
      {/* White center with OS text */}
      <svg 
        className="relative z-10"
        width={innerRadius * 2}
        height={innerRadius * 2}
        viewBox={`0 0 ${innerRadius * 2} ${innerRadius * 2}`}
      >
        {/* White circle */}
        <circle
          cx={innerRadius}
          cy={innerRadius}
          r={innerRadius - 1}
          fill="white"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }}
        />
        
        {/* OS text */}
        <text
          x={innerRadius}
          y={innerRadius}
          textAnchor="middle"
          dominantBaseline="central"
          fill="hsl(0 75% 45%)"
          fontWeight="bold"
          fontSize={innerRadius * 0.75}
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          OS
        </text>
      </svg>
      
      {/* Custom keyframes */}
      <style>{`
        @keyframes coreRing1 {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes coreRing2 {
          0% {
            transform: rotate(360deg) scale(1);
          }
          50% {
            transform: rotate(180deg) scale(1.02);
          }
          100% {
            transform: rotate(0deg) scale(1);
          }
        }
        
        @keyframes coreGlow {
          0%, 100% {
            transform: rotate(0deg) scale(1);
            opacity: 0.6;
          }
          33% {
            transform: rotate(120deg) scale(1.1);
            opacity: 0.9;
          }
          66% {
            transform: rotate(240deg) scale(1.05);
            opacity: 0.7;
          }
        }
        
        @keyframes coreBreathe {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.05) rotate(180deg);
            opacity: 0.7;
          }
        }
        
        .animate-core-ring-1 {
          animation: coreRing1 6s linear infinite;
        }
        
        .animate-core-ring-2 {
          animation: coreRing2 8s ease-in-out infinite;
        }
        
        .animate-core-glow {
          animation: coreGlow 10s ease-in-out infinite;
        }
        
        .animate-core-breathe {
          animation: coreBreathe 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
