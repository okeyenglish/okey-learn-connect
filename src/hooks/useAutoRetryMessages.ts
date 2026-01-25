import { useRef, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { registerScheduledRetry, unregisterScheduledRetry } from './useRetryCountdown';
import { useAutoRetrySettings, getAutoRetrySettings } from './useAutoRetrySettings';

interface RetryState {
  retryCount: number;
  timeoutId: NodeJS.Timeout | null;
  isRetrying: boolean;
}

// Default values (can be overridden by organization settings)
export const DEFAULT_MAX_RETRY_ATTEMPTS = 3;
export const DEFAULT_RETRY_DELAY_MS = 30 * 1000; // 30 seconds

// For backward compatibility - these will use cached settings
export const MAX_RETRY_ATTEMPTS = DEFAULT_MAX_RETRY_ATTEMPTS;
export const RETRY_DELAY_MS = DEFAULT_RETRY_DELAY_MS;

// Track retry state per message (in-memory for current session)
const retryStateMap = new Map<string, RetryState>();

// Track messages we've already handled to prevent duplicate retries
const handledFailuresMap = new Map<string, number>(); // messageId -> timestamp when handled

/**
 * Get retry count from message metadata in database
 */
export const getRetryCountFromMetadata = (metadata: Record<string, unknown> | null): number => {
  if (!metadata) return 0;
  const count = metadata.retry_count;
  return typeof count === 'number' ? count : 0;
};

/**
 * Update retry count in message metadata
 */
export const updateRetryCountInDB = async (messageId: string, retryCount: number): Promise<void> => {
  try {
    // First get current metadata
    const { data: message } = await supabase
      .from('chat_messages')
      .select('metadata')
      .eq('id', messageId)
      .maybeSingle();
    
    const currentMetadata = (message?.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
      ...currentMetadata,
      retry_count: retryCount,
      last_retry_at: new Date().toISOString(),
    };

    await supabase
      .from('chat_messages')
      .update({ metadata: updatedMetadata })
      .eq('id', messageId);
    
    console.log(`[AutoRetry] Updated retry_count to ${retryCount} in DB for ${messageId.slice(0, 8)}`);
  } catch (error) {
    console.error('[AutoRetry] Failed to update retry count in DB:', error);
  }
};

/**
 * Clear retry count from message metadata (on successful send)
 */
export const clearRetryCountInDB = async (messageId: string): Promise<void> => {
  try {
    const { data: message } = await supabase
      .from('chat_messages')
      .select('metadata')
      .eq('id', messageId)
      .maybeSingle();
    
    const currentMetadata = (message?.metadata as Record<string, unknown>) || {};
    // Remove retry-related fields
    const { retry_count, last_retry_at, ...restMetadata } = currentMetadata as { 
      retry_count?: number; 
      last_retry_at?: string;
      [key: string]: unknown;
    };

    await supabase
      .from('chat_messages')
      .update({ metadata: restMetadata })
      .eq('id', messageId);
    
    console.log(`[AutoRetry] Cleared retry metadata for ${messageId.slice(0, 8)}`);
  } catch (error) {
    console.error('[AutoRetry] Failed to clear retry count in DB:', error);
  }
};

/**
 * Hook for automatic retry of failed messages
 * 
 * Features:
 * - Automatically retries failed messages after 30 seconds
 * - Maximum 3 retry attempts per message
 * - Persists retry count in message metadata (survives sessions)
 * - Prevents duplicate retries across component re-mounts
 * - Tracks retry count and shows appropriate notifications
 */
export const useAutoRetryMessages = (
  clientId: string,
  onRetry: (messageId: string, retryCount: number) => Promise<boolean>,
  onMaxRetriesReached?: (messageId: string) => void
) => {
  const activeRetriesRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Get organization settings for auto-retry
  const { settings: autoRetrySettings } = useAutoRetrySettings();
  
  // Memoize settings to avoid re-renders
  const retryDelayMs = useMemo(() => 
    (autoRetrySettings?.retryDelaySeconds || 30) * 1000, 
    [autoRetrySettings?.retryDelaySeconds]
  );
  const maxRetryAttempts = useMemo(() => 
    autoRetrySettings?.maxRetryAttempts || DEFAULT_MAX_RETRY_ATTEMPTS, 
    [autoRetrySettings?.maxRetryAttempts]
  );
  const isEnabled = useMemo(() => 
    autoRetrySettings?.enabled !== false, 
    [autoRetrySettings?.enabled]
  );

  // Initialize retry state from DB metadata
  const initRetryStateFromDB = useCallback(async (messageId: string, metadata: Record<string, unknown> | null): Promise<number> => {
    const dbRetryCount = getRetryCountFromMetadata(metadata);
    
    // Sync in-memory state with DB
    let state = retryStateMap.get(messageId);
    if (!state) {
      state = { retryCount: dbRetryCount, timeoutId: null, isRetrying: false };
      retryStateMap.set(messageId, state);
    } else if (dbRetryCount > state.retryCount) {
      // DB has higher count (from previous session)
      state.retryCount = dbRetryCount;
    }
    
    return state.retryCount;
  }, []);

  // Schedule an automatic retry for a failed message
  const scheduleRetry = useCallback((messageId: string, metadata?: Record<string, unknown> | null) => {
    // Check if auto-retry is enabled
    if (!isEnabled) {
      console.log(`[AutoRetry] Disabled by organization settings`);
      return;
    }

    // Check if already handling this failure (within 5 seconds window)
    const lastHandled = handledFailuresMap.get(messageId);
    if (lastHandled && Date.now() - lastHandled < 5000) {
      console.log(`[AutoRetry] Skipping duplicate retry schedule for ${messageId.slice(0, 8)}`);
      return;
    }
    handledFailuresMap.set(messageId, Date.now());

    // Get or create retry state, syncing with DB if metadata provided
    let state = retryStateMap.get(messageId);
    const dbRetryCount = getRetryCountFromMetadata(metadata || null);
    
    if (!state) {
      state = { retryCount: dbRetryCount, timeoutId: null, isRetrying: false };
      retryStateMap.set(messageId, state);
    } else if (dbRetryCount > state.retryCount) {
      // DB has higher count (from previous session)
      state.retryCount = dbRetryCount;
    }

    // Check if max retries reached (use dynamic setting)
    if (state.retryCount >= maxRetryAttempts) {
      console.log(`[AutoRetry] Max retries (${maxRetryAttempts}) reached for ${messageId.slice(0, 8)}`);
      onMaxRetriesReached?.(messageId);
      return;
    }

    // Don't schedule if already scheduled or retrying
    if (state.timeoutId || state.isRetrying) {
      console.log(`[AutoRetry] Already scheduled/retrying ${messageId.slice(0, 8)}`);
      return;
    }

    console.log(`[AutoRetry] Scheduling retry #${state.retryCount + 1} for ${messageId.slice(0, 8)} in ${retryDelayMs / 1000}s`);

    // Register for countdown display
    const scheduledAt = Date.now() + retryDelayMs;
    registerScheduledRetry(messageId, scheduledAt);

    // Schedule retry with dynamic delay
    const timeoutId = setTimeout(async () => {
      const currentState = retryStateMap.get(messageId);
      if (!currentState) return;

      // Unregister countdown
      unregisterScheduledRetry(messageId);

      currentState.isRetrying = true;
      currentState.retryCount++;
      currentState.timeoutId = null;
      
      // Persist retry count to DB
      await updateRetryCountInDB(messageId, currentState.retryCount);
      
      console.log(`[AutoRetry] Executing retry #${currentState.retryCount} for ${messageId.slice(0, 8)}`);

      try {
        const success = await onRetry(messageId, currentState.retryCount);
        
        if (success) {
          // Success - clean up state and DB
          console.log(`[AutoRetry] ✅ Retry successful for ${messageId.slice(0, 8)}`);
          retryStateMap.delete(messageId);
          activeRetriesRef.current.delete(messageId);
          handledFailuresMap.delete(messageId);
          await clearRetryCountInDB(messageId);
        } else {
          // Failed - will be re-scheduled when failure event fires again
          console.log(`[AutoRetry] ❌ Retry failed for ${messageId.slice(0, 8)}, attempt ${currentState.retryCount}/${maxRetryAttempts}`);
          currentState.isRetrying = false;
          
          // Check if max retries reached after this attempt
          if (currentState.retryCount >= maxRetryAttempts) {
            console.log(`[AutoRetry] Max retries reached for ${messageId.slice(0, 8)}`);
            onMaxRetriesReached?.(messageId);
          }
        }
      } catch (error) {
        console.error(`[AutoRetry] Error during retry:`, error);
        currentState.isRetrying = false;
      }
    }, retryDelayMs);

    state.timeoutId = timeoutId;
    activeRetriesRef.current.set(messageId, timeoutId);
  }, [onRetry, onMaxRetriesReached, isEnabled, retryDelayMs, maxRetryAttempts]);

  // Cancel a scheduled retry
  const cancelRetry = useCallback((messageId: string) => {
    const state = retryStateMap.get(messageId);
    if (state?.timeoutId) {
      clearTimeout(state.timeoutId);
      state.timeoutId = null;
      activeRetriesRef.current.delete(messageId);
      unregisterScheduledRetry(messageId);
      console.log(`[AutoRetry] Cancelled retry for ${messageId.slice(0, 8)}`);
    }
  }, []);

  // Get retry count for a message (from in-memory state or provided metadata)
  const getRetryCount = useCallback((messageId: string, metadata?: Record<string, unknown> | null): number => {
    const memoryCount = retryStateMap.get(messageId)?.retryCount || 0;
    const dbCount = getRetryCountFromMetadata(metadata || null);
    return Math.max(memoryCount, dbCount);
  }, []);

  // Check if auto-retry is still possible for a message
  const canAutoRetry = useCallback((messageId: string, metadata?: Record<string, unknown> | null): boolean => {
    if (!isEnabled) return false;
    const retryCount = getRetryCount(messageId, metadata);
    return retryCount < maxRetryAttempts;
  }, [getRetryCount, isEnabled, maxRetryAttempts]);

  // Reset retry state for a message (e.g., after manual successful send)
  const resetRetryState = useCallback(async (messageId: string) => {
    cancelRetry(messageId);
    retryStateMap.delete(messageId);
    handledFailuresMap.delete(messageId);
    await clearRetryCountInDB(messageId);
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
    initRetryStateFromDB,
    maxRetryAttempts,
    retryDelayMs,
    isEnabled,
  };
};
