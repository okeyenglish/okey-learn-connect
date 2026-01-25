import { useEffect, useRef, useState } from 'react';
import { useFaviconBadge } from './useFaviconBadge';

const DEFAULT_TITLE = 'AcademyOS CRM';

/**
 * Hook to manage document title with unread count indicator
 * Shows "(N) Title" format when there are unread messages
 * Also handles title flashing for new messages when tab is inactive
 */
export const useDocumentTitle = (
  unreadCount: number, 
  customTitle?: string,
  hasNewMessage?: boolean
) => {
  const previousTitle = useRef(document.title);
  const [isTabVisible, setIsTabVisible] = useState(document.visibilityState === 'visible');
  
  // Update favicon badge with unread count
  useFaviconBadge(unreadCount);
  
  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
  
  // Update base title
  useEffect(() => {
    const baseTitle = customTitle || DEFAULT_TITLE;
    
    if (unreadCount > 0) {
      const displayCount = unreadCount > 99 ? '99+' : unreadCount;
      document.title = `(${displayCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
    
    previousTitle.current = document.title;
    
    // Cleanup - restore title on unmount
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [unreadCount, customTitle]);
  
  // Flash title when new message arrives and tab is hidden
  useFlashingTitle(
    hasNewMessage === true && !isTabVisible,
    '💬 Новое сообщение!'
  );
};

/**
 * Hook to flash the document title for attention
 * Useful for new message notifications
 */
export const useFlashingTitle = (
  shouldFlash: boolean, 
  flashMessage: string = '💬 Новое сообщение!',
  intervalMs: number = 1000
) => {
  const originalTitleRef = useRef(document.title);
  const isFlashingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (!shouldFlash) {
      isFlashingRef.current = false;
      // Restore original title if we were flashing
      if (document.title === flashMessage) {
        document.title = originalTitleRef.current;
      }
      return;
    }
    
    // Store current title before flashing
    originalTitleRef.current = document.title;
    isFlashingRef.current = true;
    
    // Start flashing immediately
    document.title = flashMessage;
    
    intervalRef.current = setInterval(() => {
      if (!isFlashingRef.current) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
      
      // Toggle between original title and flash message
      if (document.title === flashMessage) {
        document.title = originalTitleRef.current;
      } else {
        document.title = flashMessage;
      }
    }, intervalMs);
    
    // Stop flashing when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        isFlashingRef.current = false;
        document.title = originalTitleRef.current;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      isFlashingRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Restore title on cleanup
      if (document.title === flashMessage) {
        document.title = originalTitleRef.current;
      }
    };
  }, [shouldFlash, flashMessage, intervalMs]);
};

export default useDocumentTitle;
