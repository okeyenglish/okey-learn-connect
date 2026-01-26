import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { playNotificationSound } from '@/hooks/useNotificationSound';
import { showBrowserNotification } from '@/hooks/useBrowserNotifications';
import { useMissedCallListener } from '@/hooks/useCallLogsRealtime';

/**
 * Hook that shows notifications (toast, sound, browser notification) 
 * when a new missed call is received
 */
export const useMissedCallNotifications = () => {
  const { toast } = useToast();

  const handleMissedCall = useCallback((detail: { 
    callId: string; 
    clientId: string | null; 
    phoneNumber: string 
  }) => {
    console.log('[useMissedCallNotifications] Missed call received:', detail);

    // Play notification sound
    playNotificationSound(0.6);

    // Show toast notification
    toast({
      title: "📞 Пропущенный звонок",
      description: `Новый пропущенный звонок: ${detail.phoneNumber}`,
      variant: "destructive",
      duration: 5000,
    });

    // Show browser notification if tab is inactive
    showBrowserNotification({
      title: "Пропущенный звонок",
      body: `Входящий звонок от ${detail.phoneNumber}`,
      tag: `missed-call-${detail.callId}`,
    });

  }, [toast]);

  // Subscribe to missed call events
  useMissedCallListener(handleMissedCall);
};

/**
 * Component wrapper for using the hook in non-hook contexts
 */
export const MissedCallNotificationProvider = ({ children }: { children?: React.ReactNode }) => {
  useMissedCallNotifications();
  return children;
};
