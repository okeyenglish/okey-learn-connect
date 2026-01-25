import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
  size?: number;
  className?: string;
}

export const AnimatedLogo = ({ size = 72, className }: AnimatedLogoProps) => {
  const center = size / 2;
  const innerRadius = size * 0.32;
  const outerRadius = size * 0.48;
  
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center cursor-pointer group",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Outer glow */}
      <div 
        className="absolute inset-[-6px] rounded-full animate-core-glow"
        style={{
          background: 'conic-gradient(from 0deg, hsl(217 85% 50% / 0.4), hsl(0 80% 55% / 0.3), hsl(217 85% 50% / 0.4))',
          filter: 'blur(10px)',
        }}
      />
      
      {/* SVG with ribbon shapes like the logo */}
      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Blue gradient */}
          <linearGradient id="blueRibbonGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(217 90% 35%)" />
            <stop offset="30%" stopColor="hsl(217 85% 50%)" />
            <stop offset="60%" stopColor="hsl(210 80% 55%)" />
            <stop offset="100%" stopColor="hsl(200 75% 60%)" />
          </linearGradient>
          
          {/* Red gradient */}
          <linearGradient id="redRibbonGrad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(0 90% 40%)" />
            <stop offset="30%" stopColor="hsl(0 85% 50%)" />
            <stop offset="60%" stopColor="hsl(10 80% 55%)" />
            <stop offset="100%" stopColor="hsl(20 75% 60%)" />
          </linearGradient>
        </defs>
        
        {/* Blue ribbon - curved like logo, rotating */}
        <g className="animate-ribbon-blue" style={{ transformOrigin: `${center}px ${center}px` }}>
          <path
            d={`
              M ${center - outerRadius * 0.7} ${center + outerRadius * 0.85}
              Q ${center - outerRadius * 1.1} ${center + outerRadius * 0.3},
                ${center - outerRadius * 0.95} ${center - outerRadius * 0.2}
              Q ${center - outerRadius * 0.75} ${center - outerRadius * 0.7},
                ${center - outerRadius * 0.2} ${center - outerRadius * 0.9}
              Q ${center + outerRadius * 0.1} ${center - outerRadius * 0.95},
                ${center + outerRadius * 0.4} ${center - outerRadius * 0.75}
              L ${center + outerRadius * 0.25} ${center - outerRadius * 0.55}
              Q ${center} ${center - outerRadius * 0.65},
                ${center - outerRadius * 0.25} ${center - outerRadius * 0.6}
              Q ${center - outerRadius * 0.5} ${center - outerRadius * 0.45},
                ${center - outerRadius * 0.65} ${center - outerRadius * 0.1}
              Q ${center - outerRadius * 0.8} ${center + outerRadius * 0.35},
                ${center - outerRadius * 0.45} ${center + outerRadius * 0.7}
              Z
            `}
            fill="url(#blueRibbonGrad)"
            style={{ filter: 'drop-shadow(2px 2px 4px rgba(59, 130, 246, 0.5))' }}
          />
        </g>
        
        {/* Red ribbon - curved like logo, rotating opposite */}
        <g className="animate-ribbon-red" style={{ transformOrigin: `${center}px ${center}px` }}>
          <path
            d={`
              M ${center + outerRadius * 0.7} ${center - outerRadius * 0.85}
              Q ${center + outerRadius * 1.1} ${center - outerRadius * 0.3},
                ${center + outerRadius * 0.95} ${center + outerRadius * 0.2}
              Q ${center + outerRadius * 0.75} ${center + outerRadius * 0.7},
                ${center + outerRadius * 0.2} ${center + outerRadius * 0.9}
              Q ${center - outerRadius * 0.1} ${center + outerRadius * 0.95},
                ${center - outerRadius * 0.4} ${center + outerRadius * 0.75}
              L ${center - outerRadius * 0.25} ${center + outerRadius * 0.55}
              Q ${center} ${center + outerRadius * 0.65},
                ${center + outerRadius * 0.25} ${center + outerRadius * 0.6}
              Q ${center + outerRadius * 0.5} ${center + outerRadius * 0.45},
                ${center + outerRadius * 0.65} ${center + outerRadius * 0.1}
              Q ${center + outerRadius * 0.8} ${center - outerRadius * 0.35},
                ${center + outerRadius * 0.45} ${center - outerRadius * 0.7}
              Z
            `}
            fill="url(#redRibbonGrad)"
            style={{ filter: 'drop-shadow(-2px -2px 4px rgba(239, 68, 68, 0.5))' }}
          />
        </g>
        
        {/* White center circle */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="white"
          style={{ filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15))' }}
        />
        
        {/* OS text */}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fill="hsl(0 75% 45%)"
          fontWeight="bold"
          fontSize={innerRadius * 0.85}
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
        
        @keyframes coreGlow {
          0%, 100% {
            transform: rotate(0deg) scale(1);
            opacity: 0.5;
          }
          50% {
            transform: rotate(180deg) scale(1.1);
            opacity: 0.8;
          }
        }
        
        .animate-ribbon-blue {
          animation: ribbonBlue 10s linear infinite;
        }
        
        .animate-ribbon-red {
          animation: ribbonRed 12s linear infinite;
        }
        
        .animate-core-glow {
          animation: coreGlow 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
