import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
  size?: number;
  className?: string;
}

export const AnimatedLogo = ({ size = 72, className }: AnimatedLogoProps) => {
  const center = size / 2;
  const innerRadius = size * 0.35;
  const outerRadius = size * 0.45;
  
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center cursor-pointer group",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Siri-like glow */}
      <div 
        className="absolute inset-[-6px] rounded-full animate-siri-glow"
        style={{
          background: 'conic-gradient(from 0deg, hsl(217 72% 50% / 0.4), hsl(0 80% 55% / 0.3), hsl(217 72% 50% / 0.4))',
          filter: 'blur(10px)',
        }}
      />
      
      {/* SVG with animated ribbons */}
      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          {/* Blue gradient */}
          <linearGradient id="blueRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(217 85% 45%)" />
            <stop offset="50%" stopColor="hsl(217 72% 55%)" />
            <stop offset="100%" stopColor="hsl(200 80% 50%)" />
          </linearGradient>
          
          {/* Red gradient */}
          <linearGradient id="redRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(0 85% 50%)" />
            <stop offset="50%" stopColor="hsl(0 80% 55%)" />
            <stop offset="100%" stopColor="hsl(15 85% 55%)" />
          </linearGradient>
        </defs>
        
        {/* Blue ribbon arc - rotating */}
        <g className="animate-ribbon-blue" style={{ transformOrigin: 'center' }}>
          <path
            d={`
              M ${center + outerRadius * Math.cos(-2.5)} ${center + outerRadius * Math.sin(-2.5)}
              A ${outerRadius} ${outerRadius} 0 0 1 ${center + outerRadius * Math.cos(0.3)} ${center + outerRadius * Math.sin(0.3)}
              L ${center + innerRadius * Math.cos(0.5)} ${center + innerRadius * Math.sin(0.5)}
              A ${innerRadius} ${innerRadius} 0 0 0 ${center + innerRadius * Math.cos(-2.3)} ${center + innerRadius * Math.sin(-2.3)}
              Z
            `}
            fill="url(#blueRibbon)"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.4))' }}
          />
        </g>
        
        {/* Red ribbon arc - rotating opposite */}
        <g className="animate-ribbon-red" style={{ transformOrigin: 'center' }}>
          <path
            d={`
              M ${center + outerRadius * Math.cos(0.8)} ${center + outerRadius * Math.sin(0.8)}
              A ${outerRadius} ${outerRadius} 0 0 1 ${center + outerRadius * Math.cos(3.5)} ${center + outerRadius * Math.sin(3.5)}
              L ${center + innerRadius * Math.cos(3.3)} ${center + innerRadius * Math.sin(3.3)}
              A ${innerRadius} ${innerRadius} 0 0 0 ${center + innerRadius * Math.cos(1)} ${center + innerRadius * Math.sin(1)}
              Z
            `}
            fill="url(#redRibbon)"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(239, 68, 68, 0.4))' }}
          />
        </g>
        
        {/* White center circle */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius - 2}
          fill="white"
          style={{ filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.1))' }}
        />
        
        {/* OS text */}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fill="hsl(0 80% 45%)"
          fontWeight="bold"
          fontSize={size * 0.28}
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          OS
        </text>
      </svg>
      
      {/* Custom keyframes */}
      <style>{`
        @keyframes ribbonBlue {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes ribbonRed {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(-360deg);
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
        
        .animate-ribbon-blue {
          animation: ribbonBlue 8s linear infinite;
        }
        
        .animate-ribbon-red {
          animation: ribbonRed 10s linear infinite;
        }
        
        .animate-siri-glow {
          animation: siriGlow 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
