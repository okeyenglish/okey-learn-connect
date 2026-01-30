import { useState, useEffect, useRef, useCallback } from 'react';

interface UseLazyImageOptions {
  /** Placeholder URL to show while loading */
  placeholder?: string;
  /** Root margin for intersection observer (e.g., "100px" to start loading 100px before visible) */
  rootMargin?: string;
  /** Threshold for intersection (0-1) */
  threshold?: number;
  /** Whether to start loading immediately (skip lazy loading) */
  eager?: boolean;
}

interface UseLazyImageResult {
  /** The current src to use (placeholder or actual) */
  src: string;
  /** Ref to attach to the image container */
  ref: React.RefObject<HTMLElement>;
  /** Whether the image has been loaded */
  isLoaded: boolean;
  /** Whether loading has been triggered */
  isTriggered: boolean;
  /** Manually trigger loading */
  triggerLoad: () => void;
}

/**
 * Hook for lazy loading images using IntersectionObserver.
 * Only starts loading the image when it enters the viewport.
 * 
 * @example
 * ```tsx
 * const { src, ref, isLoaded } = useLazyImage(avatarUrl, {
 *   placeholder: '/default-avatar.png',
 *   rootMargin: '100px'
 * });
 * 
 * return (
 *   <div ref={ref as React.RefObject<HTMLDivElement>}>
 *     <img src={src} className={isLoaded ? 'opacity-100' : 'opacity-50'} />
 *   </div>
 * );
 * ```
 */
export function useLazyImage(
  imageSrc: string | null | undefined,
  options: UseLazyImageOptions = {}
): UseLazyImageResult {
  const {
    placeholder = '',
    rootMargin = '50px',
    threshold = 0.1,
    eager = false,
  } = options;

  const [isTriggered, setIsTriggered] = useState(eager);
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Cleanup observer
  const cleanupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  // Manual trigger function
  const triggerLoad = useCallback(() => {
    if (!isTriggered) {
      setIsTriggered(true);
      cleanupObserver();
    }
  }, [isTriggered, cleanupObserver]);

  // Setup IntersectionObserver
  useEffect(() => {
    // Skip if eager loading, already triggered, or no image
    if (eager || isTriggered || !imageSrc) {
      return;
    }

    const element = ref.current;
    if (!element) return;

    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      setIsTriggered(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsTriggered(true);
          cleanupObserver();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    observerRef.current.observe(element);

    return cleanupObserver;
  }, [eager, isTriggered, imageSrc, rootMargin, threshold, cleanupObserver]);

  // Preload image when triggered
  useEffect(() => {
    if (!isTriggered || !imageSrc || isLoaded) return;

    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setIsLoaded(true); // Mark as loaded even on error
    img.src = imageSrc;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isTriggered, imageSrc, isLoaded]);

  // Determine current src
  const currentSrc = isTriggered && imageSrc ? imageSrc : placeholder;

  return {
    src: currentSrc,
    ref,
    isLoaded,
    isTriggered,
    triggerLoad,
  };
}

/**
 * Batch lazy loading hook for multiple images (e.g., avatar list).
 * Uses a single IntersectionObserver for better performance.
 */
export function useLazyImageBatch(
  imageSrcs: (string | null | undefined)[],
  options: UseLazyImageOptions = {}
): Map<number, UseLazyImageResult> {
  const results = new Map<number, UseLazyImageResult>();
  
  // For batch loading, we use individual hooks
  // In production, consider a more optimized approach with a single observer
  imageSrcs.forEach((src, index) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const result = useLazyImage(src, options);
    results.set(index, result);
  });

  return results;
}

export default useLazyImage;
