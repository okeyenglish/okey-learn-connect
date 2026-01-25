import { useRef, useEffect, useCallback } from 'react';

interface RetryState {
  retryCount: number;
  timeoutId: NodeJS.Timeout | null;
  isRetrying: boolean;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 30 * 1000; // 30 seconds

// Track retry state per message
const retryStateMap = new Map<string, RetryState>();

// Track messages we've already handled to prevent duplicate retries
const handledFailuresMap = new Map<string, number>(); // messageId -> timestamp when handled

/**
 * Hook for automatic retry of failed messages
 * 
 * Features:
 * - Automatically retries failed messages after 30 seconds
 * - Maximum 3 retry attempts per message
 * - Prevents duplicate retries across component re-mounts
 * - Tracks retry count and shows appropriate notifications
 */
export const useAutoRetryMessages = (
  clientId: string,
  onRetry: (messageId: string, retryCount: number) => Promise<boolean>,
  onMaxRetriesReached?: (messageId: string) => void
) => {
  const activeRetriesRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Schedule an automatic retry for a failed message
  const scheduleRetry = useCallback((messageId: string) => {
    // Check if already handling this failure (within 5 seconds window)
    const lastHandled = handledFailuresMap.get(messageId);
    if (lastHandled && Date.now() - lastHandled < 5000) {
      console.log(`[AutoRetry] Skipping duplicate retry schedule for ${messageId.slice(0, 8)}`);
      return;
    }
    handledFailuresMap.set(messageId, Date.now());

    // Get or create retry state
    let state = retryStateMap.get(messageId);
    if (!state) {
      state = { retryCount: 0, timeoutId: null, isRetrying: false };
      retryStateMap.set(messageId, state);
    }

    // Check if max retries reached
    if (state.retryCount >= MAX_RETRY_ATTEMPTS) {
      console.log(`[AutoRetry] Max retries (${MAX_RETRY_ATTEMPTS}) reached for ${messageId.slice(0, 8)}`);
      onMaxRetriesReached?.(messageId);
      return;
    }

    // Don't schedule if already scheduled or retrying
    if (state.timeoutId || state.isRetrying) {
      console.log(`[AutoRetry] Already scheduled/retrying ${messageId.slice(0, 8)}`);
      return;
    }

    console.log(`[AutoRetry] Scheduling retry #${state.retryCount + 1} for ${messageId.slice(0, 8)} in ${RETRY_DELAY_MS / 1000}s`);

    // Schedule retry
    const timeoutId = setTimeout(async () => {
      const currentState = retryStateMap.get(messageId);
      if (!currentState) return;

      currentState.isRetrying = true;
      currentState.retryCount++;
      currentState.timeoutId = null;
      
      console.log(`[AutoRetry] Executing retry #${currentState.retryCount} for ${messageId.slice(0, 8)}`);

      try {
        const success = await onRetry(messageId, currentState.retryCount);
        
        if (success) {
          // Success - clean up state
          console.log(`[AutoRetry] ✅ Retry successful for ${messageId.slice(0, 8)}`);
          retryStateMap.delete(messageId);
          activeRetriesRef.current.delete(messageId);
          handledFailuresMap.delete(messageId);
        } else {
          // Failed - will be re-scheduled when failure event fires again
          console.log(`[AutoRetry] ❌ Retry failed for ${messageId.slice(0, 8)}, attempt ${currentState.retryCount}/${MAX_RETRY_ATTEMPTS}`);
          currentState.isRetrying = false;
          
          // Check if max retries reached after this attempt
          if (currentState.retryCount >= MAX_RETRY_ATTEMPTS) {
            console.log(`[AutoRetry] Max retries reached for ${messageId.slice(0, 8)}`);
            onMaxRetriesReached?.(messageId);
          }
        }
      } catch (error) {
        console.error(`[AutoRetry] Error during retry:`, error);
        currentState.isRetrying = false;
      }
    }, RETRY_DELAY_MS);

    state.timeoutId = timeoutId;
    activeRetriesRef.current.set(messageId, timeoutId);
  }, [onRetry, onMaxRetriesReached]);

  // Cancel a scheduled retry
  const cancelRetry = useCallback((messageId: string) => {
    const state = retryStateMap.get(messageId);
    if (state?.timeoutId) {
      clearTimeout(state.timeoutId);
      state.timeoutId = null;
      activeRetriesRef.current.delete(messageId);
      console.log(`[AutoRetry] Cancelled retry for ${messageId.slice(0, 8)}`);
    }
  }, []);

  // Get retry count for a message
  const getRetryCount = useCallback((messageId: string): number => {
    return retryStateMap.get(messageId)?.retryCount || 0;
  }, []);

  // Check if auto-retry is still possible for a message
  const canAutoRetry = useCallback((messageId: string): boolean => {
    const state = retryStateMap.get(messageId);
    return !state || state.retryCount < MAX_RETRY_ATTEMPTS;
  }, []);

  // Reset retry state for a message (e.g., after manual successful send)
  const resetRetryState = useCallback((messageId: string) => {
    cancelRetry(messageId);
    retryStateMap.delete(messageId);
    handledFailuresMap.delete(messageId);
    console.log(`[AutoRetry] Reset state for ${messageId.slice(0, 8)}`);
  }, [cancelRetry]);

  // Cleanup on unmount or client change
  useEffect(() => {
    return () => {
      // Clear all active timeouts for this client's messages
      activeRetriesRef.current.forEach((timeoutId, messageId) => {
        clearTimeout(timeoutId);
        console.log(`[AutoRetry] Cleanup: cancelled ${messageId.slice(0, 8)}`);
      });
      activeRetriesRef.current.clear();
    };
  }, [clientId]);

  return {
    scheduleRetry,
    cancelRetry,
    getRetryCount,
    canAutoRetry,
    resetRetryState,
    MAX_RETRY_ATTEMPTS,
    RETRY_DELAY_MS,
  };
};
