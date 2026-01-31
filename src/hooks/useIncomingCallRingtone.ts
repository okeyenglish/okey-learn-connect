import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { startRingtone, stopRingtone } from '@/hooks/useNotificationSound';
import { getNotificationSettings } from '@/hooks/useNotificationSettings';

interface IncomingCallEvent {
  callId: string;
  clientId: string | null;
  phoneNumber: string;
  managerId?: string;
}

/**
 * Hook for playing ringtone when an incoming call is detected
 * Automatically stops when call ends or is answered
 */
export const useIncomingCallRingtone = () => {
  const { user } = useAuth();
  const stopFnRef = useRef<(() => void) | null>(null);
  const activeCallIdRef = useRef<string | null>(null);

  const handleIncomingCall = useCallback((detail: IncomingCallEvent) => {
    // Check if sound notifications are enabled
    const settings = getNotificationSettings();
    if (!settings.soundEnabled) {
      console.log('[useIncomingCallRingtone] Sound disabled, skipping ringtone');
      return;
    }

    // Only play for the current user if managerId is specified
    if (detail.managerId && user?.id && detail.managerId !== user.id) {
      console.log('[useIncomingCallRingtone] Call not for current user, skipping');
      return;
    }

    // Don't restart if same call
    if (activeCallIdRef.current === detail.callId) {
      console.log('[useIncomingCallRingtone] Already ringing for this call');
      return;
    }

    // Stop any existing ringtone
    if (stopFnRef.current) {
      stopFnRef.current();
    }

    console.log('[useIncomingCallRingtone] Starting ringtone for call:', detail.callId);
    activeCallIdRef.current = detail.callId;
    stopFnRef.current = startRingtone(settings.soundVolume);
  }, [user?.id]);

  const handleCallEnded = useCallback((detail: { callId: string }) => {
    // Stop ringtone if it's for the same call
    if (activeCallIdRef.current === detail.callId) {
      console.log('[useIncomingCallRingtone] Stopping ringtone, call ended:', detail.callId);
      if (stopFnRef.current) {
        stopFnRef.current();
        stopFnRef.current = null;
      }
      activeCallIdRef.current = null;
    }
  }, []);

  // Manual stop function exposed for UI controls
  const stopCurrentRingtone = useCallback(() => {
    if (stopFnRef.current) {
      stopFnRef.current();
      stopFnRef.current = null;
    }
    activeCallIdRef.current = null;
  }, []);

  // Listen for incoming call events
  useEffect(() => {
    const handleStart = (event: Event) => {
      const customEvent = event as CustomEvent<IncomingCallEvent>;
      handleIncomingCall(customEvent.detail);
    };

    const handleEnd = (event: Event) => {
      const customEvent = event as CustomEvent<{ callId: string }>;
      handleCallEnded(customEvent.detail);
    };

    window.addEventListener('incoming-call-started', handleStart);
    window.addEventListener('incoming-call-ended', handleEnd);
    window.addEventListener('call-answered', handleEnd);

    return () => {
      window.removeEventListener('incoming-call-started', handleStart);
      window.removeEventListener('incoming-call-ended', handleEnd);
      window.removeEventListener('call-answered', handleEnd);
      
      // Cleanup ringtone on unmount
      if (stopFnRef.current) {
        stopFnRef.current();
      }
    };
  }, [handleIncomingCall, handleCallEnded]);

  // Auto-stop after 30 seconds (safety measure)
  useEffect(() => {
    if (!activeCallIdRef.current) return;

    const timeout = setTimeout(() => {
      console.log('[useIncomingCallRingtone] Auto-stopping after 30s timeout');
      stopCurrentRingtone();
    }, 30000);

    return () => clearTimeout(timeout);
  }, [stopCurrentRingtone]);

  return {
    stopRingtone: stopCurrentRingtone,
    isRinging: activeCallIdRef.current !== null,
  };
};

/**
 * Dispatch incoming call event (call from webhook handler or realtime)
 */
export const dispatchIncomingCallEvent = (detail: IncomingCallEvent) => {
  window.dispatchEvent(new CustomEvent('incoming-call-started', { detail }));
};

/**
 * Dispatch call ended event
 */
export const dispatchCallEndedEvent = (callId: string) => {
  window.dispatchEvent(new CustomEvent('incoming-call-ended', { 
    detail: { callId } 
  }));
};

/**
 * Dispatch call answered event
 */
export const dispatchCallAnsweredEvent = (callId: string) => {
  window.dispatchEvent(new CustomEvent('call-answered', { 
    detail: { callId } 
  }));
};
