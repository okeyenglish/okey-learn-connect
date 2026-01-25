import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import { getNotificationSettings } from '@/hooks/useNotificationSettings';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  threshold?: number;
  className?: string;
}

type PullState = 'idle' | 'pulling' | 'ready' | 'refreshing';

export const PullToRefresh = ({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
  className = '',
}: PullToRefreshProps) => {
  const [pullState, setPullState] = useState<PullState>('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || pullState === 'refreshing') return;
    
    const scrollElement = containerRef.current?.querySelector('[data-scroll-container]');
    const scrollTop = scrollElement?.scrollTop ?? 0;
    
    // Only start pull if at the top of the list
    if (scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  }, [disabled, pullState]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current || disabled || pullState === 'refreshing') return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    
    if (diff > 0) {
      // Apply resistance to make pull feel natural
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, threshold * 1.5);
      setPullDistance(distance);
      
      if (distance >= threshold && pullState !== 'ready') {
        setPullState('ready');
        // Haptic feedback when reaching threshold (if enabled)
        const settings = getNotificationSettings();
        if (settings.vibrationEnabled && navigator.vibrate) {
          navigator.vibrate(10);
        }
      } else if (distance < threshold) {
        setPullState('pulling');
      }
      
      // Prevent default scrolling while pulling
      e.preventDefault();
    }
  }, [disabled, pullState, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current || disabled) return;
    
    isPullingRef.current = false;
    
    if (pullState === 'ready') {
      setPullState('refreshing');
      setPullDistance(threshold * 0.6); // Keep indicator visible during refresh
      
      // Haptic feedback on refresh start (if enabled)
      const settings = getNotificationSettings();
      if (settings.vibrationEnabled && navigator.vibrate) {
        navigator.vibrate([15, 50, 15]);
      }
      
      try {
        await onRefresh();
      } finally {
        setPullState('idle');
        setPullDistance(0);
      }
    } else {
      setPullState('idle');
      setPullDistance(0);
    }
  }, [disabled, pullState, threshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const getIndicatorIcon = () => {
    if (pullState === 'refreshing') {
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    }
    
    const rotation = pullState === 'ready' ? 'rotate-180' : 'rotate-0';
    return (
      <ArrowDown 
        className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${rotation}`} 
      />
    );
  };

  const getIndicatorText = () => {
    switch (pullState) {
      case 'pulling':
        return 'Потяните для обновления';
      case 'ready':
        return 'Отпустите для обновления';
      case 'refreshing':
        return 'Обновление...';
      default:
        return '';
    }
  };

  return (
    <div ref={containerRef} className={`relative flex flex-col min-h-0 ${className}`}>
      {/* Pull indicator */}
      <div 
        className="absolute left-0 right-0 flex flex-col items-center justify-end overflow-hidden transition-all duration-200 ease-out z-10"
        style={{ 
          height: `${pullDistance}px`,
          opacity: pullDistance > 10 ? 1 : 0,
        }}
      >
        <div className="flex items-center gap-2 pb-2">
          {getIndicatorIcon()}
          <span className="text-sm text-muted-foreground">
            {getIndicatorText()}
          </span>
        </div>
      </div>
      
      {/* Content with transform */}
      <div 
        className="flex flex-col flex-1 min-h-0 transition-transform duration-200 ease-out"
        style={{ 
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};
