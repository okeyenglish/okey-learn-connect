import { ReactNode, useRef } from 'react';
import { cn } from '@/lib/utils';

interface RippleEffectProps {
  children: ReactNode;
  className?: string;
  rippleColor?: string;
}

export default function RippleEffect({ children, className, rippleColor = 'rgba(99, 102, 241, 0.4)' }: RippleEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const createRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.backgroundColor = rippleColor;
    ripple.style.transform = 'scale(0)';
    ripple.style.animation = 'ripple 600ms ease-out';
    ripple.style.pointerEvents = 'none';

    container.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  return (
    <div
      ref={containerRef}
      onClick={createRipple}
      className={cn("relative overflow-hidden", className)}
    >
      {children}
    </div>
  );
}
