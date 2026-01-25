import { useEffect, useRef } from 'react';

const DEFAULT_TITLE = 'AcademyOS CRM';

/**
 * Hook to manage document title with unread count indicator
 * Shows "(N) Title" format when there are unread messages
 */
export const useDocumentTitle = (unreadCount: number, customTitle?: string) => {
  const previousTitle = useRef(document.title);
  
  useEffect(() => {
    const baseTitle = customTitle || DEFAULT_TITLE;
    
    if (unreadCount > 0) {
      const displayCount = unreadCount > 99 ? '99+' : unreadCount;
      document.title = `(${displayCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
    
    // Cleanup - restore title on unmount
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [unreadCount, customTitle]);
};

/**
 * Hook to flash the document title for attention
 * Useful for new message notifications
 */
export const useFlashingTitle = (
  shouldFlash: boolean, 
  flashMessage: string = '💬 Новое сообщение!',
  intervalMs: number = 1500
) => {
  const originalTitleRef = useRef(document.title);
  const isFlashingRef = useRef(false);
  
  useEffect(() => {
    if (!shouldFlash) {
      isFlashingRef.current = false;
      return;
    }
    
    originalTitleRef.current = document.title;
    isFlashingRef.current = true;
    
    const interval = setInterval(() => {
      if (!isFlashingRef.current) {
        clearInterval(interval);
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
        clearInterval(interval);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      isFlashingRef.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [shouldFlash, flashMessage, intervalMs]);
};

export default useDocumentTitle;
