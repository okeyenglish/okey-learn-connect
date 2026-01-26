/**
 * Performance Metrics Utility for CRM Chat Loading
 * 
 * Tracks and logs timing metrics for debugging slow requests.
 * Stores metrics in memory and optionally displays in UI.
 */

export interface PerformanceMetric {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'completed' | 'failed' | 'timeout';
  metadata?: Record<string, unknown>;
}

interface PendingRequest {
  id: string;
  name: string;
  startTime: number;
  metadata?: Record<string, unknown>;
}

// Store for recent metrics (rolling window)
const MAX_METRICS = 50;
const metricsStore: PerformanceMetric[] = [];
const pendingRequests = new Map<string, PendingRequest>();
const subscribers = new Set<(metrics: PerformanceMetric[], pending: PendingRequest[]) => void>();

// Thresholds for warning/error logging (ms)
const THRESHOLDS = {
  warning: 1000,  // 1 second
  error: 5000,    // 5 seconds
  timeout: 12000, // 12 seconds
};

/**
 * Start tracking a request
 */
export const startMetric = (name: string, metadata?: Record<string, unknown>): string => {
  const id = `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const request: PendingRequest = {
    id,
    name,
    startTime: performance.now(),
    metadata,
  };
  
  pendingRequests.set(id, request);
  
  // Log start
  console.log(
    `%c⏱️ [PERF] Started: ${name}`,
    'color: #3b82f6; font-weight: bold;',
    metadata ? metadata : ''
  );
  
  notifySubscribers();
  return id;
};

/**
 * Complete tracking a request
 */
export const endMetric = (id: string, status: 'completed' | 'failed' | 'timeout' = 'completed', extraMetadata?: Record<string, unknown>): void => {
  const pending = pendingRequests.get(id);
  if (!pending) {
    console.warn(`[PERF] Unknown metric ID: ${id}`);
    return;
  }
  
  const endTime = performance.now();
  const duration = endTime - pending.startTime;
  
  const metric: PerformanceMetric = {
    id,
    name: pending.name,
    startTime: pending.startTime,
    endTime,
    duration,
    status,
    metadata: { ...pending.metadata, ...extraMetadata },
  };
  
  // Add to store
  metricsStore.push(metric);
  if (metricsStore.length > MAX_METRICS) {
    metricsStore.shift();
  }
  
  // Remove from pending
  pendingRequests.delete(id);
  
  // Log with appropriate styling
  const logStyle = getLogStyle(duration, status);
  const icon = status === 'completed' ? '✅' : status === 'failed' ? '❌' : '⏰';
  
  console.log(
    `%c${icon} [PERF] ${pending.name}: ${duration.toFixed(0)}ms (${status})`,
    logStyle,
    metric.metadata ? metric.metadata : ''
  );
  
  // Warn for slow requests
  if (duration > THRESHOLDS.error) {
    console.warn(`🐌 [PERF] SLOW REQUEST: ${pending.name} took ${(duration / 1000).toFixed(1)}s`);
  }
  
  notifySubscribers();
};

/**
 * Wrap an async function with metrics
 */
export const withMetrics = async <T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> => {
  const id = startMetric(name, metadata);
  try {
    const result = await fn();
    endMetric(id, 'completed', { resultSize: Array.isArray(result) ? result.length : undefined });
    return result;
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    endMetric(id, isTimeout ? 'timeout' : 'failed', { error: String(error) });
    throw error;
  }
};

/**
 * Get log style based on duration and status
 */
const getLogStyle = (duration: number, status: string): string => {
  if (status === 'failed') return 'color: #ef4444; font-weight: bold;';
  if (status === 'timeout') return 'color: #f97316; font-weight: bold;';
  if (duration > THRESHOLDS.error) return 'color: #ef4444; font-weight: bold;';
  if (duration > THRESHOLDS.warning) return 'color: #f59e0b; font-weight: bold;';
  return 'color: #22c55e; font-weight: bold;';
};

/**
 * Get all metrics
 */
export const getMetrics = (): PerformanceMetric[] => [...metricsStore];

/**
 * Get pending requests
 */
export const getPendingRequests = (): PendingRequest[] => Array.from(pendingRequests.values());

/**
 * Get average duration for a metric name
 */
export const getAverageDuration = (name: string): number | null => {
  const matching = metricsStore.filter(m => m.name === name && m.duration);
  if (matching.length === 0) return null;
  return matching.reduce((sum, m) => sum + (m.duration || 0), 0) / matching.length;
};

/**
 * Get slowest requests
 */
export const getSlowestRequests = (count = 5): PerformanceMetric[] => {
  return [...metricsStore]
    .filter(m => m.duration)
    .sort((a, b) => (b.duration || 0) - (a.duration || 0))
    .slice(0, count);
};

/**
 * Print performance summary to console
 */
export const printSummary = (): void => {
  const completed = metricsStore.filter(m => m.status === 'completed');
  const failed = metricsStore.filter(m => m.status === 'failed');
  const timeouts = metricsStore.filter(m => m.status === 'timeout');
  const pending = getPendingRequests();
  
  console.group('%c📊 Performance Summary', 'font-size: 14px; font-weight: bold;');
  console.log(`Total requests: ${metricsStore.length}`);
  console.log(`✅ Completed: ${completed.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`⏰ Timeouts: ${timeouts.length}`);
  console.log(`⏳ Pending: ${pending.length}`);
  
  if (pending.length > 0) {
    console.log('%c\nPending requests:', 'font-weight: bold;');
    pending.forEach(p => {
      const elapsed = performance.now() - p.startTime;
      console.log(`  - ${p.name}: ${(elapsed / 1000).toFixed(1)}s elapsed`, p.metadata || '');
    });
  }
  
  const slowest = getSlowestRequests(5);
  if (slowest.length > 0) {
    console.log('%c\n🐌 Slowest requests:', 'font-weight: bold;');
    slowest.forEach(m => {
      console.log(`  - ${m.name}: ${m.duration?.toFixed(0)}ms`, m.metadata || '');
    });
  }
  
  // Group by name and show averages
  const byName = new Map<string, number[]>();
  metricsStore.forEach(m => {
    if (m.duration) {
      const existing = byName.get(m.name) || [];
      existing.push(m.duration);
      byName.set(m.name, existing);
    }
  });
  
  if (byName.size > 0) {
    console.log('%c\n📈 Average by operation:', 'font-weight: bold;');
    byName.forEach((durations, name) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      console.log(`  - ${name}: ${avg.toFixed(0)}ms (${durations.length} calls)`);
    });
  }
  
  console.groupEnd();
};

/**
 * Subscribe to metric updates
 */
export const subscribeToMetrics = (
  callback: (metrics: PerformanceMetric[], pending: PendingRequest[]) => void
): (() => void) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

const notifySubscribers = (): void => {
  const metrics = getMetrics();
  const pending = getPendingRequests();
  subscribers.forEach(cb => cb(metrics, pending));
};

/**
 * Clear all metrics
 */
export const clearMetrics = (): void => {
  metricsStore.length = 0;
  pendingRequests.clear();
  notifySubscribers();
};

// Expose to window for debugging in console
if (typeof window !== 'undefined') {
  (window as any).__perfMetrics = {
    getMetrics,
    getPendingRequests,
    getSlowestRequests,
    printSummary,
    clearMetrics,
  };
  console.log('%c📊 Performance metrics available: window.__perfMetrics.printSummary()', 'color: #6366f1;');
}
