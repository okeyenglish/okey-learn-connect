import { useState, useCallback, useRef, useEffect } from 'react';
import { RetryStatus } from '@/components/ui/RetryIndicator';

interface RetryState {
  status: RetryStatus;
  currentAttempt: number;
  maxAttempts: number;
  lastError?: string;
}

const DEFAULT_STATE: RetryState = {
  status: 'idle',
  currentAttempt: 0,
  maxAttempts: 3,
};

/**
 * Hook to track API retry status for UI display
 * 
 * Usage:
 * ```tsx
 * const { state, trackRetry, reset } = useApiRetryStatus();
 * 
 * const sendMessage = async () => {
 *   const result = await trackRetry(() => selfHostedPost('send', { ... }));
 *   if (result.success) {
 *     // Handle success
 *   }
 * };
 * 
 * return (
 *   <div>
 *     <RetryIndicator {...state} visible={state.status !== 'idle'} />
 *   </div>
 * );
 * ```
 */
export const useApiRetryStatus = (options?: {
  /** Auto-hide success status after ms (0 to disable) */
  autoHideSuccessMs?: number;
  /** Auto-hide failed status after ms (0 to disable) */
  autoHideFailedMs?: number;
  /** Default max attempts to show in UI */
  defaultMaxAttempts?: number;
}) => {
  const {
    autoHideSuccessMs = 2000,
    autoHideFailedMs = 0,
    defaultMaxAttempts = 3,
  } = options || {};

  const [state, setState] = useState<RetryState>({
    ...DEFAULT_STATE,
    maxAttempts: defaultMaxAttempts,
  });

  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback((ms: number) => {
    clearHideTimeout();
    if (ms > 0) {
      hideTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, status: 'idle' }));
      }, ms);
    }
  }, [clearHideTimeout]);

  const setRetrying = useCallback((attempt: number, maxAttempts?: number) => {
    clearHideTimeout();
    setState(prev => ({
      ...prev,
      status: 'retrying',
      currentAttempt: attempt,
      maxAttempts: maxAttempts ?? prev.maxAttempts,
    }));
  }, [clearHideTimeout]);

  const setSuccess = useCallback((finalAttempt: number) => {
    setState(prev => ({
      ...prev,
      status: 'success',
      currentAttempt: finalAttempt,
    }));
    scheduleHide(autoHideSuccessMs);
  }, [autoHideSuccessMs, scheduleHide]);

  const setFailed = useCallback((finalAttempt: number, error?: string) => {
    setState(prev => ({
      ...prev,
      status: 'failed',
      currentAttempt: finalAttempt,
      lastError: error,
    }));
    scheduleHide(autoHideFailedMs);
  }, [autoHideFailedMs, scheduleHide]);

  const reset = useCallback(() => {
    clearHideTimeout();
    setState({ ...DEFAULT_STATE, maxAttempts: defaultMaxAttempts });
  }, [clearHideTimeout, defaultMaxAttempts]);

  /**
   * Wrap an API call to automatically track retry status
   * 
   * The API response should include a `retryCount` field indicating
   * how many retries were attempted.
   */
  const trackRetry = useCallback(async <T,>(
    apiCall: () => Promise<{ success: boolean; retryCount?: number; error?: string; data?: T }>
  ): Promise<{ success: boolean; data?: T; error?: string }> => {
    try {
      // Show initial "attempting" state
      setRetrying(1);

      const result = await apiCall();
      const retryCount = (result.retryCount ?? 0) + 1; // +1 because retryCount is 0-indexed

      if (result.success) {
        setSuccess(retryCount);
        return { success: true, data: result.data };
      } else {
        setFailed(retryCount, result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setFailed(1, errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [setRetrying, setSuccess, setFailed]);

  return {
    state,
    setRetrying,
    setSuccess,
    setFailed,
    reset,
    trackRetry,
    isActive: state.status !== 'idle',
  };
};

/**
 * Global retry status tracker for showing retry indicators across components
 */
const globalRetryListeners = new Map<string, (state: RetryState) => void>();

export const subscribeToRetryStatus = (
  key: string,
  callback: (state: RetryState) => void
) => {
  globalRetryListeners.set(key, callback);
  return () => {
    globalRetryListeners.delete(key);
  };
};

export const notifyRetryStatus = (key: string, state: RetryState) => {
  const listener = globalRetryListeners.get(key);
  if (listener) {
    listener(state);
  }
};

/**
 * Hook to subscribe to global retry status updates for a specific key
 */
export const useGlobalRetryStatus = (key: string) => {
  const [state, setState] = useState<RetryState>(DEFAULT_STATE);

  useEffect(() => {
    return subscribeToRetryStatus(key, setState);
  }, [key]);

  return state;
};
