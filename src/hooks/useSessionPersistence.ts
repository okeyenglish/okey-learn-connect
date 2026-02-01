import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SESSION_DATE_KEY = 'work-session-date';
const LAST_SAVE_KEY = 'work-session-last-save';

interface SessionDelta {
  activeSecondsDelta: number;
  idleSecondsDelta: number;
  onCallSecondsDelta: number;
  idleEvent: boolean;
  maxIdleStreak: number;
}

/**
 * Hook to persist work session data to the database.
 * Saves every 5 minutes and on page unload.
 */
export const useSessionPersistence = (
  sessionStart: number,
  activeTime: number,
  idleTime: number,
  onCallTime: number = 0,
  isIdle: boolean = false,
  currentIdleStreak: number = 0
) => {
  const { user, profile } = useAuth();
  const lastSavedRef = useRef<{
    activeTime: number;
    idleTime: number;
    onCallTime: number;
    timestamp: number;
  }>({
    activeTime: 0,
    idleTime: 0,
    onCallTime: 0,
    timestamp: Date.now(),
  });
  const idleEventTriggeredRef = useRef(false);
  const maxIdleStreakRef = useRef(0);
  const saveInProgressRef = useRef(false);

  // Get current session date in local timezone
  const getSessionDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  // Calculate deltas since last save
  const calculateDeltas = useCallback((): SessionDelta => {
    const activeSecondsDelta = Math.floor((activeTime - lastSavedRef.current.activeTime) / 1000);
    const idleSecondsDelta = Math.floor((idleTime - lastSavedRef.current.idleTime) / 1000);
    const onCallSecondsDelta = Math.floor((onCallTime - lastSavedRef.current.onCallTime) / 1000);
    
    // Check if idle event should be recorded (transitioned to idle since last save)
    const idleEvent = isIdle && !idleEventTriggeredRef.current;
    
    // Track max idle streak
    if (currentIdleStreak > maxIdleStreakRef.current) {
      maxIdleStreakRef.current = currentIdleStreak;
    }

    return {
      activeSecondsDelta: Math.max(0, activeSecondsDelta),
      idleSecondsDelta: Math.max(0, idleSecondsDelta),
      onCallSecondsDelta: Math.max(0, onCallSecondsDelta),
      idleEvent,
      maxIdleStreak: Math.floor(maxIdleStreakRef.current / 1000),
    };
  }, [activeTime, idleTime, onCallTime, isIdle, currentIdleStreak]);

  // Save session to database
  const saveSession = useCallback(async (isUnload = false) => {
    if (!user?.id || saveInProgressRef.current) return;

    const deltas = calculateDeltas();
    
    // Skip if no meaningful changes
    if (
      deltas.activeSecondsDelta === 0 &&
      deltas.idleSecondsDelta === 0 &&
      deltas.onCallSecondsDelta === 0 &&
      !deltas.idleEvent
    ) {
      return;
    }

    saveInProgressRef.current = true;

    try {
      const sessionDate = getSessionDate();
      const payload = {
        session_date: sessionDate,
        organization_id: profile?.organization_id,
        session_start: new Date(sessionStart).toISOString(),
        active_seconds_delta: deltas.activeSecondsDelta,
        idle_seconds_delta: deltas.idleSecondsDelta,
        on_call_seconds_delta: deltas.onCallSecondsDelta,
        idle_event: deltas.idleEvent,
        max_idle_streak: deltas.maxIdleStreak,
        ...(isUnload && { session_end: new Date().toISOString() }),
      };

      console.log('[useSessionPersistence] Saving session:', payload);

      const { data, error } = await supabase.functions.invoke('save-work-session', {
        body: payload,
      });

      if (error) {
        console.error('[useSessionPersistence] Save error:', error);
      } else {
        console.log('[useSessionPersistence] Save successful:', data);
        
        // Update last saved values
        lastSavedRef.current = {
          activeTime,
          idleTime,
          onCallTime,
          timestamp: Date.now(),
        };
        
        // Mark idle event as triggered if it was
        if (deltas.idleEvent) {
          idleEventTriggeredRef.current = true;
        }
        
        // Store last save time
        localStorage.setItem(LAST_SAVE_KEY, Date.now().toString());
        localStorage.setItem(SESSION_DATE_KEY, sessionDate);
      }
    } catch (err) {
      console.error('[useSessionPersistence] Error:', err);
    } finally {
      saveInProgressRef.current = false;
    }
  }, [user?.id, profile?.organization_id, sessionStart, activeTime, idleTime, onCallTime, calculateDeltas]);

  // Reset idle event flag when user becomes active
  useEffect(() => {
    if (!isIdle) {
      idleEventTriggeredRef.current = false;
    }
  }, [isIdle]);

  // Check if day changed and reset tracking
  useEffect(() => {
    const storedDate = localStorage.getItem(SESSION_DATE_KEY);
    const currentDate = getSessionDate();
    
    if (storedDate && storedDate !== currentDate) {
      // New day - reset tracking
      lastSavedRef.current = {
        activeTime: 0,
        idleTime: 0,
        onCallTime: 0,
        timestamp: Date.now(),
      };
      maxIdleStreakRef.current = 0;
      idleEventTriggeredRef.current = false;
      localStorage.setItem(SESSION_DATE_KEY, currentDate);
    }
  }, []);

  // Periodic save interval
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      saveSession(false);
    }, SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [user?.id, saveSession]);

  // Save on page unload
  useEffect(() => {
    if (!user?.id) return;

    const handleUnload = () => {
      // Use sendBeacon for reliable unload saves
      const deltas = calculateDeltas();
      if (
        deltas.activeSecondsDelta === 0 &&
        deltas.idleSecondsDelta === 0 &&
        deltas.onCallSecondsDelta === 0
      ) {
        return;
      }

      const payload = {
        session_date: getSessionDate(),
        organization_id: profile?.organization_id,
        active_seconds_delta: deltas.activeSecondsDelta,
        idle_seconds_delta: deltas.idleSecondsDelta,
        on_call_seconds_delta: deltas.onCallSecondsDelta,
        idle_event: deltas.idleEvent,
        max_idle_streak: deltas.maxIdleStreak,
        session_end: new Date().toISOString(),
      };

      // Try to use sendBeacon for more reliable unload
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-work-session`;
        navigator.sendBeacon(url, JSON.stringify(payload));
      } catch {
        // Fallback - the interval will have already saved recent data
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        saveSession(true);
      }
    });

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user?.id, profile?.organization_id, calculateDeltas, saveSession]);

  // Manual save function
  const forceSave = useCallback(() => {
    saveSession(false);
  }, [saveSession]);

  return {
    forceSave,
    lastSaved: lastSavedRef.current.timestamp,
  };
};

export default useSessionPersistence;
