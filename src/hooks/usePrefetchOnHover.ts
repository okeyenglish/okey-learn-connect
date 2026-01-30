import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface PrefetchConfig {
  /** Delay in ms before prefetching starts (default: 150ms) */
  delay?: number;
  /** Query key to prefetch */
  queryKey: readonly unknown[];
  /** Fetch function to execute */
  queryFn: () => Promise<unknown>;
  /** Stale time for prefetched data (default: 30s) */
  staleTime?: number;
}

interface UsePrefetchOnHoverResult {
  /** Attach to onMouseEnter */
  onMouseEnter: () => void;
  /** Attach to onMouseLeave (cancels pending prefetch) */
  onMouseLeave: () => void;
  /** Attach to onFocus for keyboard navigation */
  onFocus: () => void;
  /** Attach to onBlur (cancels pending prefetch) */
  onBlur: () => void;
  /** Manual prefetch trigger */
  prefetch: () => void;
}

/**
 * Hook for prefetching data when user hovers over an element.
 * Implements delay to avoid unnecessary fetches on quick mouse movements.
 * 
 * @example
 * ```tsx
 * const prefetchProps = usePrefetchOnHover({
 *   queryKey: ['students'],
 *   queryFn: () => fetchStudents(),
 *   delay: 150,
 * });
 * 
 * return (
 *   <button {...prefetchProps} onClick={handleClick}>
 *     Students
 *   </button>
 * );
 * ```
 */
export function usePrefetchOnHover(config: PrefetchConfig): UsePrefetchOnHoverResult {
  const { delay = 150, queryKey, queryFn, staleTime = 30000 } = config;
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasPrefetchedRef = useRef(false);

  const cancelPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const prefetch = useCallback(() => {
    // Skip if already prefetched or data is fresh in cache
    if (hasPrefetchedRef.current) return;

    const existingData = queryClient.getQueryData(queryKey);
    if (existingData) {
      hasPrefetchedRef.current = true;
      return;
    }

    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime,
    });
    hasPrefetchedRef.current = true;
  }, [queryClient, queryKey, queryFn, staleTime]);

  const schedulePrefetch = useCallback(() => {
    cancelPrefetch();
    timeoutRef.current = setTimeout(prefetch, delay);
  }, [cancelPrefetch, prefetch, delay]);

  return {
    onMouseEnter: schedulePrefetch,
    onMouseLeave: cancelPrefetch,
    onFocus: schedulePrefetch,
    onBlur: cancelPrefetch,
    prefetch,
  };
}

/**
 * Hook for prefetching multiple queries on hover.
 * Useful for tabs or navigation where each item has different data.
 */
export function usePrefetchOnHoverMultiple(
  configs: Record<string, Omit<PrefetchConfig, 'delay'>>,
  globalDelay = 150
): Record<string, UsePrefetchOnHoverResult> {
  const results: Record<string, UsePrefetchOnHoverResult> = {};

  Object.entries(configs).forEach(([key, config]) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[key] = usePrefetchOnHover({
      ...config,
      delay: globalDelay,
    });
  });

  return results;
}

/**
 * Simplified prefetch hook for CRM tabs.
 * Pre-configured for common CRM data patterns.
 */
export function useCrmTabPrefetch(
  tabId: string,
  fetchFn: () => Promise<unknown>,
  options: { delay?: number; staleTime?: number } = {}
): UsePrefetchOnHoverResult {
  const { delay = 150, staleTime = 60000 } = options;

  return usePrefetchOnHover({
    queryKey: ['crm-tab', tabId],
    queryFn: fetchFn,
    delay,
    staleTime,
  });
}

export default usePrefetchOnHover;
