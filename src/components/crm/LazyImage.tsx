import { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { ImageOff } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
  crossOrigin?: 'anonymous' | 'use-credentials';
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}

/**
 * Optimized lazy loading image component
 * - Uses IntersectionObserver for efficient viewport detection
 * - Shows blur placeholder while loading
 * - Progressive loading with fade-in animation
 * - Handles errors gracefully
 */
export const LazyImage = memo(({
  src,
  alt,
  className,
  placeholderClassName,
  onLoad,
  onError,
  onClick,
  crossOrigin = 'anonymous',
  referrerPolicy = 'no-referrer',
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for lazy loading
  useEffect(() => {
    const element = imgRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.01,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Normalize URL (http -> https)
  const normalizedSrc = src?.replace(/^http:\/\//i, 'https://') || '';

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden bg-muted',
        className
      )}
      onClick={onClick}
    >
      {/* Placeholder skeleton */}
      {!isLoaded && !hasError && (
        <div
          className={cn(
            'absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]',
            placeholderClassName
          )}
          style={{
            animation: 'shimmer 1.5s infinite',
          }}
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <ImageOff className="h-6 w-6" />
        </div>
      )}

      {/* Actual image - only render when in view */}
      {isInView && !hasError && (
        <img
          src={normalizedSrc}
          alt={alt}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          loading="lazy"
          decoding="async"
          crossOrigin={crossOrigin}
          referrerPolicy={referrerPolicy}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

// Add shimmer animation to global styles
const shimmerStyle = document.createElement('style');
shimmerStyle.textContent = `
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;
if (!document.querySelector('#lazy-image-shimmer-style')) {
  shimmerStyle.id = 'lazy-image-shimmer-style';
  document.head.appendChild(shimmerStyle);
}
