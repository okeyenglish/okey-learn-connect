import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLazyImage } from '@/hooks/useLazyImage';
import { cn } from '@/lib/utils';

interface LazyAvatarProps {
  /** Avatar image URL */
  src?: string | null;
  /** Alt text for accessibility */
  alt?: string;
  /** Fallback text (usually initials) */
  fallback?: string;
  /** Additional class names */
  className?: string;
  /** Avatar size - maps to standard sizes */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Root margin for lazy loading trigger */
  rootMargin?: string;
  /** Skip lazy loading and load immediately */
  eager?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

/**
 * Lazy-loaded avatar component using IntersectionObserver.
 * Only loads the image when it enters the viewport.
 * 
 * @example
 * ```tsx
 * <LazyAvatar 
 *   src={user.avatarUrl}
 *   fallback={user.initials}
 *   size="md"
 * />
 * ```
 */
export const LazyAvatar = React.memo(function LazyAvatar({
  src,
  alt = 'Avatar',
  fallback = '?',
  className,
  size = 'md',
  rootMargin = '100px',
  eager = false,
}: LazyAvatarProps) {
  const { src: lazySrc, ref, isLoaded, isTriggered } = useLazyImage(src, {
    placeholder: '',
    rootMargin,
    eager,
  });

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="inline-block">
      <Avatar className={cn(sizeClasses[size], className)}>
        {isTriggered && lazySrc && (
          <AvatarImage
            src={lazySrc}
            alt={alt}
            className={cn(
              'transition-opacity duration-200',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}
        <AvatarFallback
          className={cn(
            'transition-opacity duration-200',
            isLoaded && lazySrc ? 'opacity-0' : 'opacity-100'
          )}
        >
          {fallback}
        </AvatarFallback>
      </Avatar>
    </div>
  );
});

/**
 * Get initials from a name for avatar fallback.
 */
export function getAvatarInitials(name?: string | null): string {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default LazyAvatar;
