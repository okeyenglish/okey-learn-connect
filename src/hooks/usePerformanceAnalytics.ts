import { useState, useEffect, useCallback } from 'react';
import { performanceAnalytics, PerformanceReport } from '@/utils/performanceAnalytics';

/**
 * Hook to access performance analytics data
 */
export const usePerformanceAnalytics = () => {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [isEnabled, setIsEnabled] = useState(performanceAnalytics.isEnabled());

  // Update report periodically
  useEffect(() => {
    const updateReport = () => {
      setReport(performanceAnalytics.generateReport());
    };

    // Initial report
    updateReport();

    // Subscribe to changes
    const unsubscribe = performanceAnalytics.subscribe(updateReport);

    // Also update on interval for time-based calculations
    const interval = setInterval(updateReport, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const toggleEnabled = useCallback(() => {
    const newState = !performanceAnalytics.isEnabled();
    performanceAnalytics.setEnabled(newState);
    setIsEnabled(newState);
  }, []);

  const clearMetrics = useCallback(() => {
    performanceAnalytics.clear();
  }, []);

  return {
    report,
    isEnabled,
    toggleEnabled,
    clearMetrics,
  };
};
