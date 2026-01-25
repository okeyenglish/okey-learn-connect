import { useState, useEffect, useCallback } from 'react';

// Store scheduled retry timestamps globally (shared across components)
const scheduledRetryTimestamps = new Map<string, number>();

/**
 * Register a scheduled retry for countdown display
 */
export const registerScheduledRetry = (messageId: string, scheduledAt: number) => {
  scheduledRetryTimestamps.set(messageId, scheduledAt);
  // Dispatch event for countdown components to update
  window.dispatchEvent(new CustomEvent('retry-scheduled', { detail: { messageId, scheduledAt } }));
};

/**
 * Unregister a scheduled retry (after success or cancellation)
 */
export const unregisterScheduledRetry = (messageId: string) => {
  scheduledRetryTimestamps.delete(messageId);
  window.dispatchEvent(new CustomEvent('retry-cancelled', { detail: { messageId } }));
};

/**
 * Get scheduled retry timestamp for a message
 */
export const getScheduledRetryTime = (messageId: string): number | null => {
  return scheduledRetryTimestamps.get(messageId) || null;
};

/**
 * Hook to get countdown seconds until next retry for a specific message
 * Updates every second when a retry is scheduled
 */
export const useRetryCountdown = (messageId: string | undefined) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  const calculateRemaining = useCallback(() => {
    if (!messageId) return null;
    const scheduledAt = scheduledRetryTimestamps.get(messageId);
    if (!scheduledAt) return null;
    
    const remaining = Math.max(0, Math.ceil((scheduledAt - Date.now()) / 1000));
    return remaining > 0 ? remaining : null;
  }, [messageId]);

  useEffect(() => {
    if (!messageId) {
      setSecondsRemaining(null);
      return;
    }

    // Initial calculation
    setSecondsRemaining(calculateRemaining());

    // Update every second
    const intervalId = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);
      
      // Stop interval when countdown finishes
      if (remaining === null || remaining <= 0) {
        clearInterval(intervalId);
      }
    }, 1000);

    // Listen for retry scheduled/cancelled events
    const handleRetryScheduled = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.messageId === messageId) {
        setSecondsRemaining(calculateRemaining());
      }
    };

    const handleRetryCancelled = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.messageId === messageId) {
        setSecondsRemaining(null);
      }
    };

    window.addEventListener('retry-scheduled', handleRetryScheduled);
    window.addEventListener('retry-cancelled', handleRetryCancelled);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('retry-scheduled', handleRetryScheduled);
      window.removeEventListener('retry-cancelled', handleRetryCancelled);
    };
  }, [messageId, calculateRemaining]);

  return secondsRemaining;
};
