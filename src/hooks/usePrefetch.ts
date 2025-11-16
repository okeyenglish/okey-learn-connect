import { useEffect, useRef } from 'react';
import { requestIdleCallback, cancelIdleCallback } from '@/lib/performance';

/**
 * Hook to prefetch resources during idle time
 */
export function usePrefetch(urls: string[], enabled: boolean = true) {
  const prefetchedRef = useRef<Set<string>>(new Set());
  const idleCallbackRef = useRef<number>();

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const prefetchUrls = () => {
      urls.forEach(url => {
        // Skip if already prefetched
        if (prefetchedRef.current.has(url)) return;

        // Create prefetch link
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.as = url.endsWith('.js') ? 'script' : 'fetch';
        
        document.head.appendChild(link);
        prefetchedRef.current.add(url);
      });
    };

    // Use requestIdleCallback to prefetch during idle time
    idleCallbackRef.current = requestIdleCallback(() => {
      prefetchUrls();
    });

    return () => {
      if (idleCallbackRef.current) {
        cancelIdleCallback(idleCallbackRef.current);
      }
    };
  }, [urls, enabled]);
}

/**
 * Hook to prefetch on scroll progress
 */
export function usePrefetchOnScroll(
  urls: string[],
  scrollThreshold: number = 0.5
) {
  const hasPrefetchedRef = useRef(false);

  useEffect(() => {
    if (hasPrefetchedRef.current) return;

    const handleScroll = () => {
      const scrollPercent = 
        window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);

      if (scrollPercent >= scrollThreshold && !hasPrefetchedRef.current) {
        hasPrefetchedRef.current = true;
        
        // Prefetch URLs
        urls.forEach(url => {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = url;
          document.head.appendChild(link);
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [urls, scrollThreshold]);
}
