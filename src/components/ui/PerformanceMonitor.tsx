import React, { useState, useEffect } from 'react';
import { Activity, X, ChevronDown, ChevronUp, Clock, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  subscribeToMetrics,
  getMetrics,
  getPendingRequests,
  printSummary,
  clearMetrics,
  type PerformanceMetric,
} from '@/lib/performanceMetrics';

interface PendingRequest {
  id: string;
  name: string;
  startTime: number;
  metadata?: Record<string, unknown>;
}

/**
 * Floating performance monitor widget for development
 * Shows pending requests and recent metrics in real-time
 */
export const PerformanceMonitor = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [now, setNow] = useState(performance.now());

  // Subscribe to metric updates
  useEffect(() => {
    setMetrics(getMetrics());
    setPending(getPendingRequests());
    
    const unsubscribe = subscribeToMetrics((m, p) => {
      setMetrics([...m]);
      setPending([...p]);
    });

    // Update elapsed time for pending requests
    const interval = setInterval(() => {
      setNow(performance.now());
    }, 100);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const slowPending = pending.filter(p => (now - p.startTime) > 2000);
  const recentFailed = metrics.filter(m => m.status === 'failed' || m.status === 'timeout').slice(-3);

  // Don't show in production
  if (import.meta.env.PROD && !localStorage.getItem('showPerfMonitor')) {
    return null;
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "fixed bottom-20 right-4 z-50 h-10 w-10 rounded-full shadow-lg transition-all",
          pending.length > 0 ? "animate-pulse bg-amber-100 border-amber-300" : "bg-background",
          slowPending.length > 0 && "bg-red-100 border-red-300"
        )}
        onClick={() => setIsOpen(true)}
        title="Performance Monitor"
      >
        <Activity className={cn("h-4 w-4", pending.length > 0 && "text-amber-600")} />
        {pending.length > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-[10px] text-white flex items-center justify-center font-bold">
            {pending.length}
          </span>
        )}
      </Button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-80 bg-background border rounded-lg shadow-xl overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <span className="text-sm font-medium">Performance</span>
          {pending.length > 0 && (
            <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-200">
              {pending.length} pending
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <div className="max-h-64 overflow-y-auto">
          {/* Pending Requests */}
          {pending.length > 0 && (
            <div className="p-2 border-b">
              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Pending Requests
              </div>
              <div className="space-y-1">
                {pending.map(p => {
                  const elapsed = now - p.startTime;
                  const isSlow = elapsed > 2000;
                  const isVerySlow = elapsed > 5000;
                  
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center justify-between text-xs p-1.5 rounded",
                        isVerySlow ? "bg-red-50 text-red-700" : isSlow ? "bg-amber-50 text-amber-700" : "bg-muted/50"
                      )}
                    >
                      <span className="truncate flex-1">{p.name}</span>
                      <span className={cn(
                        "font-mono ml-2 flex items-center gap-1",
                        isVerySlow && "animate-pulse"
                      )}>
                        <Clock className="h-3 w-3" />
                        {(elapsed / 1000).toFixed(1)}s
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Metrics */}
          <div className="p-2">
            <div className="text-xs font-medium text-muted-foreground mb-1">Recent Operations</div>
            <div className="space-y-1">
              {metrics.slice(-8).reverse().map(m => (
                <div
                  key={m.id}
                  className={cn(
                    "flex items-center justify-between text-xs p-1.5 rounded",
                    m.status === 'failed' && "bg-red-50 text-red-700",
                    m.status === 'timeout' && "bg-orange-50 text-orange-700",
                    m.status === 'completed' && (m.duration || 0) > 2000 && "bg-amber-50 text-amber-700",
                    m.status === 'completed' && (m.duration || 0) <= 2000 && "bg-green-50/50 text-green-700"
                  )}
                >
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    {m.status === 'completed' && <CheckCircle className="h-3 w-3 flex-shrink-0" />}
                    {m.status === 'failed' && <AlertTriangle className="h-3 w-3 flex-shrink-0" />}
                    {m.status === 'timeout' && <Clock className="h-3 w-3 flex-shrink-0" />}
                    <span className="truncate">{m.name}</span>
                  </div>
                  <span className="font-mono ml-2 flex-shrink-0">
                    {m.duration ? `${m.duration.toFixed(0)}ms` : '-'}
                  </span>
                </div>
              ))}
              {metrics.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-2">
                  No metrics yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-2 bg-muted/30 border-t text-xs">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => printSummary()}
        >
          📊 Console Log
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground"
          onClick={() => clearMetrics()}
        >
          Clear
        </Button>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
