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
      {/* Animated snake border */}
      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <defs>
          {/* Gradient for the snake effect */}
          <linearGradient id="snakeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="30%" stopColor="#3b82f6" stopOpacity="1" />
            <stop offset="70%" stopColor="#ef4444" stopOpacity="1" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Background circle (subtle) */}
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="rgba(59, 130, 246, 0.1)"
          strokeWidth="3"
        />
        
        {/* Animated snake path */}
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="url(#snakeGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="70 220"
          className="animate-snake"
        />
        
        {/* Second snake for more dynamic effect */}
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="url(#snakeGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="40 250"
          className="animate-snake-reverse"
          style={{ opacity: 0.6 }}
        />
      </svg>
      
      {/* Glow effect behind logo */}
      <div 
        className="absolute rounded-full bg-gradient-to-r from-blue-500/20 to-red-500/20 blur-md animate-pulse"
        style={{
          width: size * 0.7,
          height: size * 0.7,
        }}
      />
      
      {/* Static logo */}
      <img 
        src="/favicon.png" 
        alt="Logo"
        className="relative z-10 rounded-full object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
        style={{
          width: size * 0.75,
          height: size * 0.75,
        }}
      />
      
      {/* Custom keyframes */}
      <style>{`
        @keyframes snakeMove {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -290;
          }
        }
        
        @keyframes snakeMoveReverse {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 290;
          }
        }
        
        .animate-snake {
          animation: snakeMove 3s linear infinite;
        }
        
        .animate-snake-reverse {
          animation: snakeMoveReverse 4s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
