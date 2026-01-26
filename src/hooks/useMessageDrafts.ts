import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for persisting message drafts across browser tab switches and component remounts.
 * Uses in-memory storage with sessionStorage fallback for persistence.
 */

// In-memory cache for drafts (survives component remounts but not page refresh)
const draftsCache = new Map<string, string>();

// Session storage key prefix
const STORAGE_PREFIX = 'chat_draft_';

export const useMessageDrafts = (chatId: string | null) => {
  const [draft, setDraftState] = useState<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stable key for storage
  const storageKey = chatId ? `${STORAGE_PREFIX}${chatId}` : null;
  
  // Load draft on mount or chatId change
  useEffect(() => {
    if (!chatId) {
      setDraftState('');
      return;
    }
    
    // Try in-memory cache first (fastest)
    const cached = draftsCache.get(chatId);
    if (cached) {
      setDraftState(cached);
      return;
    }
    
    // Fallback to sessionStorage
    try {
      const stored = sessionStorage.getItem(storageKey!);
      if (stored) {
        setDraftState(stored);
        draftsCache.set(chatId, stored);
      } else {
        setDraftState('');
      }
    } catch {
      setDraftState('');
    }
  }, [chatId, storageKey]);
  
  // Save draft with debounce
  const setDraft = useCallback((value: string) => {
    if (!chatId) return;
    
    setDraftState(value);
    
    // Update in-memory cache immediately
    if (value.trim()) {
      draftsCache.set(chatId, value);
    } else {
      draftsCache.delete(chatId);
    }
    
    // Debounce sessionStorage writes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      try {
        if (value.trim()) {
          sessionStorage.setItem(storageKey!, value);
        } else {
          sessionStorage.removeItem(storageKey!);
        }
      } catch {
        // Ignore storage errors
      }
    }, 300);
  }, [chatId, storageKey]);
  
  // Clear draft after successful send
  const clearDraft = useCallback(() => {
    if (!chatId) return;
    
    setDraftState('');
    draftsCache.delete(chatId);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    try {
      if (storageKey) {
        sessionStorage.removeItem(storageKey);
      }
    } catch {
      // Ignore
    }
  }, [chatId, storageKey]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    draft,
    setDraft,
    clearDraft,
    hasDraft: draft.trim().length > 0
  };
};

/**
 * Get all drafts (for debugging or displaying indicators)
 */
export const getAllDrafts = (): Map<string, string> => {
  return new Map(draftsCache);
};

/**
 * Clear all drafts (for logout or cleanup)
 */
export const clearAllDrafts = () => {
  draftsCache.clear();
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch {
    // Ignore
  }
};
