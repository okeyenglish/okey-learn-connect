/**
 * Performance monitoring and Web Vitals tracking
 */

export interface PerformanceMetrics {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  tti?: number; // Time to Interactive
}

// Track performance metrics
export function trackPerformanceMetrics(): PerformanceMetrics {
  const metrics: PerformanceMetrics = {};

  // Check if Performance API is available
  if (typeof window === 'undefined' || !window.performance) {
    return metrics;
  }

  try {
    // Get navigation timing
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigationTiming) {
      // TTFB
      metrics.ttfb = navigationTiming.responseStart - navigationTiming.requestStart;
    }

    // FCP - First Contentful Paint
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0] as PerformanceEntry;
    if (fcpEntry) {
      metrics.fcp = fcpEntry.startTime;
    }

    // LCP - Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP observation failed:', e);
      }

      // FID - First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            metrics.fid = entry.processingStart - entry.startTime;
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID observation failed:', e);
      }

      // CLS - Cumulative Layout Shift
      try {
        let clsScore = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsScore += entry.value;
              metrics.cls = clsScore;
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS observation failed:', e);
      }
    }
  } catch (error) {
    console.error('Performance tracking error:', error);
  }

  return metrics;
}

// Log performance metrics to console in development
export function logPerformanceMetrics() {
  if (process.env.NODE_ENV !== 'development') return;

  setTimeout(() => {
    const metrics = trackPerformanceMetrics();
    console.group('📊 Performance Metrics');
    console.log('TTFB:', metrics.ttfb ? `${metrics.ttfb.toFixed(2)}ms` : 'N/A');
    console.log('FCP:', metrics.fcp ? `${metrics.fcp.toFixed(2)}ms` : 'N/A');
    console.log('LCP:', metrics.lcp ? `${metrics.lcp.toFixed(2)}ms` : 'N/A');
    console.log('FID:', metrics.fid ? `${metrics.fid.toFixed(2)}ms` : 'N/A');
    console.log('CLS:', metrics.cls ? metrics.cls.toFixed(3) : 'N/A');
    console.groupEnd();

    // Log bundle size
    if (performance.getEntriesByType) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsSize = resources
        .filter(r => r.name.endsWith('.js'))
        .reduce((acc, r) => acc + (r.transferSize || 0), 0);
      const cssSize = resources
        .filter(r => r.name.endsWith('.css'))
        .reduce((acc, r) => acc + (r.transferSize || 0), 0);
      
      console.group('📦 Bundle Sizes');
      console.log('JavaScript:', `${(jsSize / 1024).toFixed(2)} KB`);
      console.log('CSS:', `${(cssSize / 1024).toFixed(2)} KB`);
      console.log('Total:', `${((jsSize + cssSize) / 1024).toFixed(2)} KB`);
      console.groupEnd();
    }
  }, 3000); // Wait 3 seconds for metrics to stabilize
}

// Throttle function for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  let lastResult: ReturnType<T>;

  return function(this: any, ...args: Parameters<T>): void {
    if (!inThrottle) {
      lastResult = func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Request Idle Callback polyfill
export const requestIdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (callback: IdleRequestCallback) => setTimeout(callback, 1);

export const cancelIdleCallback =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback
    : clearTimeout;
