/**
 * Performance Analytics System
 * Tracks database queries, realtime subscriptions, and polling to identify system load sources
 */

export interface QueryMetric {
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC';
  duration: number;
  timestamp: number;
  source: string; // hook/component name
  rowCount?: number;
}

export interface RealtimeMetric {
  channel: string;
  table: string;
  eventCount: number;
  lastEvent: number;
  subscribedAt: number;
}

export interface PollingMetric {
  source: string;
  interval: number;
  lastPoll: number;
  pollCount: number;
  avgDuration: number;
}

export interface EdgeFunctionMetric {
  functionName: string;
  callCount: number;
  avgDuration: number;
  lastCall: number;
  errors: number;
}

export interface PerformanceReport {
  queries: {
    total: number;
    byTable: Record<string, { count: number; avgDuration: number; totalDuration: number }>;
    bySource: Record<string, { count: number; avgDuration: number }>;
    slowest: QueryMetric[];
    mostFrequent: { table: string; count: number }[];
  };
  realtime: {
    activeChannels: number;
    channels: RealtimeMetric[];
    totalEvents: number;
  };
  polling: {
    sources: PollingMetric[];
    totalPolls: number;
    estimatedQueriesPerMinute: number;
  };
  edgeFunctions: {
    functions: EdgeFunctionMetric[];
    totalCalls: number;
    avgDuration: number;
  };
  summary: {
    queryLoad: 'low' | 'medium' | 'high' | 'critical';
    realtimeLoad: 'low' | 'medium' | 'high' | 'critical';
    pollingLoad: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  };
}

class PerformanceAnalytics {
  private queries: QueryMetric[] = [];
  private realtimeChannels: Map<string, RealtimeMetric> = new Map();
  private pollingMetrics: Map<string, PollingMetric> = new Map();
  private edgeFunctions: Map<string, EdgeFunctionMetric> = new Map();
  private maxQueries = 1000; // Keep last 1000 queries
  private enabled = true;
  private listeners: Set<() => void> = new Set();

  // Enable/disable tracking
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    console.log(`[PerformanceAnalytics] Tracking ${enabled ? 'enabled' : 'disabled'}`);
  }

  isEnabled() {
    return this.enabled;
  }

  // Track a database query
  trackQuery(metric: Omit<QueryMetric, 'timestamp'>) {
    if (!this.enabled) return;
    
    const fullMetric: QueryMetric = {
      ...metric,
      timestamp: Date.now(),
    };
    
    this.queries.push(fullMetric);
    
    // Trim old queries
    if (this.queries.length > this.maxQueries) {
      this.queries = this.queries.slice(-this.maxQueries);
    }
    
    // Log slow queries (>1s)
    if (metric.duration > 1000) {
      console.warn(`[PerformanceAnalytics] Slow query: ${metric.table} (${metric.operation}) - ${metric.duration}ms from ${metric.source}`);
    }
    
    this.notifyListeners();
  }

  // Track a realtime subscription
  trackRealtimeSubscription(channel: string, table: string) {
    if (!this.enabled) return;
    
    if (!this.realtimeChannels.has(channel)) {
      this.realtimeChannels.set(channel, {
        channel,
        table,
        eventCount: 0,
        lastEvent: 0,
        subscribedAt: Date.now(),
      });
      console.log(`[PerformanceAnalytics] New realtime subscription: ${channel} (${table})`);
    }
    
    this.notifyListeners();
  }

  // Track a realtime event
  trackRealtimeEvent(channel: string) {
    if (!this.enabled) return;
    
    const metric = this.realtimeChannels.get(channel);
    if (metric) {
      metric.eventCount++;
      metric.lastEvent = Date.now();
    }
    
    this.notifyListeners();
  }

  // Untrack a realtime subscription
  untrackRealtimeSubscription(channel: string) {
    this.realtimeChannels.delete(channel);
    this.notifyListeners();
  }

  // Track a polling operation
  trackPolling(source: string, interval: number, duration: number) {
    if (!this.enabled) return;
    
    const existing = this.pollingMetrics.get(source);
    if (existing) {
      existing.pollCount++;
      existing.lastPoll = Date.now();
      existing.avgDuration = (existing.avgDuration * (existing.pollCount - 1) + duration) / existing.pollCount;
    } else {
      this.pollingMetrics.set(source, {
        source,
        interval,
        lastPoll: Date.now(),
        pollCount: 1,
        avgDuration: duration,
      });
    }
    
    this.notifyListeners();
  }

  // Track an edge function call
  trackEdgeFunction(functionName: string, duration: number, isError: boolean = false) {
    if (!this.enabled) return;
    
    const existing = this.edgeFunctions.get(functionName);
    if (existing) {
      existing.callCount++;
      existing.lastCall = Date.now();
      existing.avgDuration = (existing.avgDuration * (existing.callCount - 1) + duration) / existing.callCount;
      if (isError) existing.errors++;
    } else {
      this.edgeFunctions.set(functionName, {
        functionName,
        callCount: 1,
        avgDuration: duration,
        lastCall: Date.now(),
        errors: isError ? 1 : 0,
      });
    }
    
    this.notifyListeners();
  }

  // Generate a performance report
  generateReport(): PerformanceReport {
    const now = Date.now();
    const recentQueries = this.queries.filter(q => now - q.timestamp < 5 * 60 * 1000); // Last 5 minutes
    
    // Aggregate by table
    const byTable: Record<string, { count: number; totalDuration: number; avgDuration: number }> = {};
    const bySource: Record<string, { count: number; totalDuration: number; avgDuration: number }> = {};
    
    recentQueries.forEach(q => {
      if (!byTable[q.table]) {
        byTable[q.table] = { count: 0, totalDuration: 0, avgDuration: 0 };
      }
      byTable[q.table].count++;
      byTable[q.table].totalDuration += q.duration;
      
      if (!bySource[q.source]) {
        bySource[q.source] = { count: 0, totalDuration: 0, avgDuration: 0 };
      }
      bySource[q.source].count++;
      bySource[q.source].totalDuration += q.duration;
    });
    
    // Calculate averages
    Object.keys(byTable).forEach(key => {
      byTable[key].avgDuration = byTable[key].totalDuration / byTable[key].count;
    });
    Object.keys(bySource).forEach(key => {
      bySource[key].avgDuration = bySource[key].totalDuration / bySource[key].count;
    });
    
    // Find slowest queries
    const slowest = [...recentQueries]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
    
    // Find most frequent tables
    const mostFrequent = Object.entries(byTable)
      .map(([table, data]) => ({ table, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Realtime metrics
    const channels = Array.from(this.realtimeChannels.values());
    const totalEvents = channels.reduce((sum, c) => sum + c.eventCount, 0);
    
    // Polling metrics
    const pollingSources = Array.from(this.pollingMetrics.values());
    const totalPolls = pollingSources.reduce((sum, p) => sum + p.pollCount, 0);
    
    // Estimate queries per minute from polling
    const estimatedQueriesPerMinute = pollingSources.reduce((sum, p) => {
      return sum + (60000 / p.interval);
    }, 0);
    
    // Edge function metrics
    const functions = Array.from(this.edgeFunctions.values());
    const totalCalls = functions.reduce((sum, f) => sum + f.callCount, 0);
    const avgEdgeDuration = functions.length > 0
      ? functions.reduce((sum, f) => sum + f.avgDuration, 0) / functions.length
      : 0;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    // Query load analysis
    let queryLoad: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const queriesPerMinute = recentQueries.length / 5;
    if (queriesPerMinute > 100) {
      queryLoad = 'critical';
      recommendations.push('Критическая нагрузка запросов: >100/мин. Рассмотрите кэширование.');
    } else if (queriesPerMinute > 50) {
      queryLoad = 'high';
      recommendations.push('Высокая нагрузка запросов: >50/мин. Оптимизируйте частые запросы.');
    } else if (queriesPerMinute > 20) {
      queryLoad = 'medium';
    }
    
    // Slow query warnings
    const slowQueries = recentQueries.filter(q => q.duration > 500);
    if (slowQueries.length > 5) {
      recommendations.push(`${slowQueries.length} медленных запросов (>500мс). Проверьте индексы.`);
    }
    
    // Realtime load analysis
    let realtimeLoad: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (channels.length > 30) {
      realtimeLoad = 'critical';
      recommendations.push(`Слишком много realtime каналов: ${channels.length}. Консолидируйте подписки.`);
    } else if (channels.length > 20) {
      realtimeLoad = 'high';
      recommendations.push(`Много realtime каналов: ${channels.length}. Рассмотрите объединение.`);
    } else if (channels.length > 10) {
      realtimeLoad = 'medium';
    }
    
    // Polling load analysis
    let pollingLoad: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (estimatedQueriesPerMinute > 30) {
      pollingLoad = 'critical';
      recommendations.push(`Polling генерирует ~${Math.round(estimatedQueriesPerMinute)} запросов/мин. Увеличьте интервалы.`);
    } else if (estimatedQueriesPerMinute > 15) {
      pollingLoad = 'high';
      recommendations.push(`Polling: ~${Math.round(estimatedQueriesPerMinute)} запросов/мин. Можно оптимизировать.`);
    } else if (estimatedQueriesPerMinute > 5) {
      pollingLoad = 'medium';
    }
    
    // Frequent table warnings
    const highFreqTables = mostFrequent.filter(t => t.count > 20);
    highFreqTables.forEach(t => {
      recommendations.push(`Таблица "${t.table}" запрашивается ${t.count} раз за 5 мин. Добавьте кэширование.`);
    });
    
    return {
      queries: {
        total: recentQueries.length,
        byTable,
        bySource,
        slowest,
        mostFrequent,
      },
      realtime: {
        activeChannels: channels.length,
        channels,
        totalEvents,
      },
      polling: {
        sources: pollingSources,
        totalPolls,
        estimatedQueriesPerMinute,
      },
      edgeFunctions: {
        functions,
        totalCalls,
        avgDuration: avgEdgeDuration,
      },
      summary: {
        queryLoad,
        realtimeLoad,
        pollingLoad,
        recommendations,
      },
    };
  }

  // Clear all metrics
  clear() {
    this.queries = [];
    this.realtimeChannels.clear();
    this.pollingMetrics.clear();
    this.edgeFunctions.clear();
    this.notifyListeners();
    console.log('[PerformanceAnalytics] Metrics cleared');
  }

  // Subscribe to changes
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance
export const performanceAnalytics = new PerformanceAnalytics();

// Helper to wrap Supabase queries with tracking
export function trackSupabaseQuery<T>(
  source: string,
  table: string,
  operation: QueryMetric['operation'],
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  
  return queryFn().then(result => {
    const duration = performance.now() - start;
    performanceAnalytics.trackQuery({
      table,
      operation,
      duration,
      source,
      rowCount: Array.isArray(result) ? result.length : undefined,
    });
    return result;
  }).catch(error => {
    const duration = performance.now() - start;
    performanceAnalytics.trackQuery({
      table,
      operation,
      duration,
      source,
    });
    throw error;
  });
}

// Helper to wrap Edge Function calls with tracking
export async function trackEdgeFunctionCall<T>(
  functionName: string,
  callFn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await callFn();
    const duration = performance.now() - start;
    performanceAnalytics.trackEdgeFunction(functionName, duration, false);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    performanceAnalytics.trackEdgeFunction(functionName, duration, true);
    throw error;
  }
}
