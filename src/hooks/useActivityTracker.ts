import { useEffect, useRef, useCallback, useState } from 'react';
import { useThrottle } from './useThrottle';
import { playNotificationSound } from './useNotificationSound';
import { getNotificationSettings } from './useNotificationSettings';
import { sendActivityWarningMessage } from '@/utils/sendActivityWarningMessage';

export type ActivityStatus = 'online' | 'idle' | 'on_call' | 'offline';

const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
const ACTIVITY_UPDATE_INTERVAL = 30_000; // 30 seconds
const MIN_SESSION_FOR_ALERT = 5 * 60 * 1000; // 5 minutes - don't alert before this

interface ActivityState {
  status: ActivityStatus;
  lastActivity: number;
  sessionStart: number;
  activeTime: number;
  idleTime: number;
  isOnCall: boolean;
  lowActivityAlertShown: boolean;
}

const STORAGE_KEY = 'staff-activity-state';

// Load state from localStorage
const loadState = (): Partial<ActivityState> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Reset if session is from a different day
      const today = new Date().toDateString();
      const sessionDay = new Date(parsed.sessionStart).toDateString();
      if (today !== sessionDay) {
        return {};
      }
      return parsed;
    }
  } catch {
    // Ignore errors
  }
  return {};
};

// Save state to localStorage
const saveState = (state: ActivityState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore errors
  }
};

interface UseActivityTrackerOptions {
  isOnCall?: boolean;
  /** Callback when activity drops below threshold - replaces default sound/message behavior */
  onLowActivity?: (activityPercentage: number) => void;
}

/**
 * Hook to track user activity and determine idle status.
 * Uses throttled event listeners to minimize performance impact.
 */
export const useActivityTracker = (options: UseActivityTrackerOptions = {}) => {
  const { isOnCall = false, onLowActivity } = options;
  
  const [state, setState] = useState<ActivityState>(() => {
    const loaded = loadState();
    const now = Date.now();
    return {
      status: 'online',
      lastActivity: loaded.lastActivity || now,
      sessionStart: loaded.sessionStart || now,
      activeTime: loaded.activeTime || 0,
      idleTime: loaded.idleTime || 0,
      isOnCall: false,
      lowActivityAlertShown: loaded.lowActivityAlertShown || false,
    };
  });

  const lastCheckRef = useRef(Date.now());
  const frameRef = useRef<number | null>(null);

  // Update last activity timestamp (throttled)
  const updateActivity = useCallback(() => {
    const now = Date.now();
    setState(prev => {
      const timeSinceLastCheck = now - lastCheckRef.current;
      lastCheckRef.current = now;

      // Calculate time deltas
      const wasIdle = prev.status === 'idle';
      const newActiveTime = wasIdle ? prev.activeTime : prev.activeTime + timeSinceLastCheck;
      const newIdleTime = wasIdle ? prev.idleTime + timeSinceLastCheck : prev.idleTime;

      const newState: ActivityState = {
        ...prev,
        lastActivity: now,
        status: prev.isOnCall ? 'on_call' : 'online',
        activeTime: newActiveTime,
        idleTime: newIdleTime,
      };
      
      saveState(newState);
      return newState;
    });
  }, []);

  const throttledUpdateActivity = useThrottle(updateActivity, ACTIVITY_UPDATE_INTERVAL);

  // Check for idle status
  const checkIdleStatus = useCallback(() => {
    const now = Date.now();
    setState(prev => {
      const timeSinceActivity = now - prev.lastActivity;
      const timeSinceLastCheck = now - lastCheckRef.current;
      lastCheckRef.current = now;

      // Determine new status
      let newStatus: ActivityStatus = prev.status;
      if (prev.isOnCall) {
        newStatus = 'on_call';
      } else if (timeSinceActivity >= IDLE_THRESHOLD) {
        newStatus = 'idle';
      } else if (prev.status === 'idle') {
        // Was idle but now active
        newStatus = 'online';
      }

      // Calculate time deltas based on current status
      const isIdle = newStatus === 'idle';
      const newActiveTime = isIdle ? prev.activeTime : prev.activeTime + timeSinceLastCheck;
      const newIdleTime = isIdle ? prev.idleTime + timeSinceLastCheck : prev.idleTime;

      if (newStatus !== prev.status || prev.activeTime !== newActiveTime) {
        const newState: ActivityState = {
          ...prev,
          status: newStatus,
          activeTime: newActiveTime,
          idleTime: newIdleTime,
        };
        saveState(newState);
        return newState;
      }
      return prev;
    });
  }, []);

  // Update on_call status
  useEffect(() => {
    setState(prev => {
      if (prev.isOnCall === isOnCall) return prev;
      const newState = {
        ...prev,
        isOnCall,
        status: isOnCall ? 'on_call' as ActivityStatus : 'online' as ActivityStatus,
      };
      saveState(newState);
      return newState;
    });
  }, [isOnCall]);

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      throttledUpdateActivity();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Periodic idle check (every 30 seconds)
    const idleCheckInterval = setInterval(checkIdleStatus, 30_000);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Save state on unload
    const handleUnload = () => {
      saveState(state);
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(idleCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleUnload);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [throttledUpdateActivity, checkIdleStatus, updateActivity, state]);

  // Calculate session duration
  const sessionDuration = Date.now() - state.sessionStart;
  const activityPercentage = sessionDuration > 0 
    ? Math.round((state.activeTime / sessionDuration) * 100)
    : 100;

  // Reset session (for new day or manual reset)
  const resetSession = useCallback(() => {
    const now = Date.now();
    const newState: ActivityState = {
      status: 'online',
      lastActivity: now,
      sessionStart: now,
      activeTime: 0,
      idleTime: 0,
      isOnCall: false,
      lowActivityAlertShown: false,
    };
    setState(newState);
    saveState(newState);
  }, []);

  // Check for low activity and trigger callback or default behavior
  useEffect(() => {
    // Only check after minimum session duration
    if (sessionDuration < MIN_SESSION_FOR_ALERT) return;
    
    // Check if activity warning is enabled in settings
    const notificationSettings = getNotificationSettings();
    if (!notificationSettings.activityWarningEnabled) return;
    
    // Get threshold from settings (default 60%)
    const threshold = notificationSettings.activityWarningThreshold || 60;
    
    // Check if activity dropped below threshold and we haven't shown alert yet
    if (activityPercentage < threshold && !state.lowActivityAlertShown) {
      // If custom callback provided, use it instead of default behavior
      if (onLowActivity) {
        onLowActivity(activityPercentage);
      } else {
        // Default behavior: play warning sound
        playNotificationSound(0.5, 'activity_warning');
        
        // Send motivational message from AI assistant (async, fire and forget)
        sendActivityWarningMessage(activityPercentage).catch(err => {
          console.warn('[useActivityTracker] Failed to send AI message:', err);
        });
      }
      
      setState(prev => {
        const newState = { ...prev, lowActivityAlertShown: true };
        saveState(newState);
        return newState;
      });
    }
    
    // Reset alert flag if activity goes back above threshold (with 5% buffer)
    if (activityPercentage >= threshold + 5 && state.lowActivityAlertShown) {
      setState(prev => {
        const newState = { ...prev, lowActivityAlertShown: false };
        saveState(newState);
        return newState;
      });
    }
  }, [activityPercentage, sessionDuration, state.lowActivityAlertShown, onLowActivity]);

  return {
    status: state.status,
    lastActivity: state.lastActivity,
    sessionStart: state.sessionStart,
    activeTime: state.activeTime,
    idleTime: state.idleTime,
    sessionDuration,
    activityPercentage,
    isIdle: state.status === 'idle',
    isOnCall: state.status === 'on_call',
    resetSession,
  };
};

export default useActivityTracker;
