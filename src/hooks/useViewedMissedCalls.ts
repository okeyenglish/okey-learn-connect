import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const STORAGE_KEY = 'viewed_missed_calls';

interface ViewedCallsState {
  [clientId: string]: {
    viewedAt: string; // ISO timestamp when calls tab was last viewed
    callIds: string[]; // IDs of calls that were present when viewed
  };
}

// Utility functions for non-hook usage
export const getStoredViewedCalls = (): ViewedCallsState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

export const getViewedCallIds = (clientId: string): string[] => {
  const state = getStoredViewedCalls();
  return state[clientId]?.callIds || [];
};

export const countUnviewedMissedCalls = (clientId: string, missedCallIds: string[]): number => {
  const viewedCallIds = getViewedCallIds(clientId);
  return missedCallIds.filter(id => !viewedCallIds.includes(id)).length;
};

const saveState = (state: ViewedCallsState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('[useViewedMissedCalls] Failed to save state:', error);
  }
};

export const useViewedMissedCalls = (clientId: string) => {
  const queryClient = useQueryClient();
  const [viewedState, setViewedState] = useState<ViewedCallsState>(getStoredViewedCalls);

  // Mark all current missed calls as viewed for this client
  const markCallsAsViewed = useCallback((callIds: string[]) => {
    setViewedState(prev => {
      const newState = {
        ...prev,
        [clientId]: {
          viewedAt: new Date().toISOString(),
          callIds: callIds,
        },
      };
      saveState(newState);
      return newState;
    });

    // Invalidate the unread counts query to trigger UI update
    queryClient.invalidateQueries({ queryKey: ['client-unread-by-messenger', clientId] });
  }, [clientId, queryClient]);

  // Check if a call has been viewed
  const isCallViewed = useCallback((callId: string) => {
    const clientState = viewedState[clientId];
    if (!clientState) return false;
    return clientState.callIds.includes(callId);
  }, [clientId, viewedState]);

  // Get the timestamp when calls were last viewed for this client
  const getLastViewedAt = useCallback(() => {
    return viewedState[clientId]?.viewedAt || null;
  }, [clientId, viewedState]);

  // Count unviewed missed calls
  const countUnviewedCalls = useCallback((missedCallIds: string[]) => {
    const clientState = viewedState[clientId];
    if (!clientState) return missedCallIds.length;
    
    return missedCallIds.filter(id => !clientState.callIds.includes(id)).length;
  }, [clientId, viewedState]);

  // Sync with localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setViewedState(getStoredViewedCalls());
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    markCallsAsViewed,
    isCallViewed,
    getLastViewedAt,
    countUnviewedCalls,
  };
};
