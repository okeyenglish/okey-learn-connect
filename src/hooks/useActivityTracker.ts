import { useEffect, useRef, useCallback, useState } from 'react';
import { useThrottle } from './useThrottle';
import { useIsMobile } from './use-mobile';
import { playNotificationSound } from './useNotificationSound';
import { getNotificationSettings } from './useNotificationSettings';
import { sendActivityWarningMessage } from '@/utils/sendActivityWarningMessage';
import type { ServerSessionBaseline } from './useTodayWorkSession';

export type ActivityStatus = 'online' | 'idle' | 'on_call' | 'offline';

const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
const ACTIVITY_UPDATE_INTERVAL = 30_000; // 30 seconds
const MIN_SESSION_FOR_ALERT = 5 * 60 * 1000; // 5 minutes - don't alert before this
const MOUNT_GRACE_PERIOD = 60_000; // 1 minute after mount - don't show alert (wait for server sync)
const ALERT_SHOWN_KEY = 'staff-activity-alert-shown-date'; // Separate from state to persist across reloads

interface ActivityState {
  status: ActivityStatus;
  lastActivity: number;
  sessionStart: number;
  activeTime: number;
  idleTime: number;
  isOnCall: boolean;
  lowActivityAlertShown: boolean;
  lastServerActiveSeconds: number; // Track last synced server value
  lastServerIdleSeconds: number;
  serverSessionStartApplied: boolean; // Flag that sessionStart was synced from server
}

const STORAGE_KEY = 'staff-activity-state';
const SESSION_KEY = 'staff-activity-session-id';

// Load state from localStorage
const loadState = (): Partial<ActivityState> => {
  try {
    // Check if this is a fresh browser session (new tab, hard refresh)
    const currentSessionId = sessionStorage.getItem(SESSION_KEY);
    const isFreshSession = !currentSessionId;
    
    if (isFreshSession) {
      // Mark this browser session as started
      sessionStorage.setItem(SESSION_KEY, Date.now().toString());
      // Return minimal state - wait for server data to sync
      // This prevents AI assistant popup on reload
      return {
        serverSessionStartApplied: false, // Will be synced from server
      };
    }
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Reset if session is from a different day
      const today = new Date().toDateString();
      const sessionDay = new Date(parsed.sessionStart).toDateString();
      if (today !== sessionDay) {
        return {
          serverSessionStartApplied: false,
        };
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
  /** Server baseline from useTodayWorkSession for cross-device sync */
  serverBaseline?: ServerSessionBaseline | null;
}

/**
 * Hook to track user activity and determine idle status.
 * Uses throttled event listeners to minimize performance impact.
 * Supports cross-device sync via serverBaseline parameter.
 */
export const useActivityTracker = (options: UseActivityTrackerOptions = {}) => {
  const { isOnCall = false, onLowActivity, serverBaseline } = options;
  const isMobile = useIsMobile();
  
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
      lastServerActiveSeconds: loaded.lastServerActiveSeconds || 0,
      lastServerIdleSeconds: loaded.lastServerIdleSeconds || 0,
      serverSessionStartApplied: loaded.serverSessionStartApplied || false,
    };
  });

  // Ref to track mount time for grace period
  const mountTimeRef = useRef(Date.now());

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

  // Sync with server baseline (cross-device sync)
  // Re-syncs whenever server has newer data (higher values)
  // Also syncs sessionStart from server for accurate activity percentage calculation
  useEffect(() => {
    if (!serverBaseline) return;

    const serverActiveMs = serverBaseline.activeSeconds * 1000;
    const serverIdleMs = serverBaseline.idleSeconds * 1000;

    setState(prev => {
      const updates: Partial<ActivityState> = {};
      let hasChanges = false;

      // Sync sessionStart from server (only once per session)
      // This fixes cross-device sync where local sessionStart would be "now" on new device
      if (serverBaseline.sessionStart && !prev.serverSessionStartApplied) {
        const serverSessionStart = new Date(serverBaseline.sessionStart).getTime();
        // Use server sessionStart if it's earlier than local (real session started earlier)
        if (serverSessionStart < prev.sessionStart) {
          updates.sessionStart = serverSessionStart;
          console.log('[useActivityTracker] Synced sessionStart from server:', {
            localSessionStart: new Date(prev.sessionStart).toISOString(),
            serverSessionStart: new Date(serverSessionStart).toISOString(),
          });
          hasChanges = true;
        }
        updates.serverSessionStartApplied = true;
        hasChanges = true;
      }

      // Only sync active/idle time if server has new data (values increased from last sync)
      const serverHasNewData = 
        serverBaseline.activeSeconds > prev.lastServerActiveSeconds ||
        serverBaseline.idleSeconds > prev.lastServerIdleSeconds;

      if (serverHasNewData) {
        // Use maximum values to avoid losing data from either device
        const mergedActiveTime = Math.max(prev.activeTime, serverActiveMs);
        const mergedIdleTime = Math.max(prev.idleTime, serverIdleMs);

        if (mergedActiveTime !== prev.activeTime || mergedIdleTime !== prev.idleTime) {
          console.log('[useActivityTracker] Synced activity from server:', {
            localActive: Math.round(prev.activeTime / 1000),
            serverActive: serverBaseline.activeSeconds,
            mergedActive: Math.round(mergedActiveTime / 1000),
            localIdle: Math.round(prev.idleTime / 1000),
            serverIdle: serverBaseline.idleSeconds,
            mergedIdle: Math.round(mergedIdleTime / 1000),
          });
        }

        updates.activeTime = mergedActiveTime;
        updates.idleTime = mergedIdleTime;
        updates.lastServerActiveSeconds = serverBaseline.activeSeconds;
        updates.lastServerIdleSeconds = serverBaseline.idleSeconds;
        hasChanges = true;
      }

      if (!hasChanges) return prev;

      const newState: ActivityState = { ...prev, ...updates };
      saveState(newState);
      return newState;
    });
  }, [serverBaseline]);

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
      lastServerActiveSeconds: 0,
      lastServerIdleSeconds: 0,
      serverSessionStartApplied: false,
    };
    setState(newState);
    saveState(newState);
    // Also clear the persistent alert flag
    localStorage.removeItem(ALERT_SHOWN_KEY);
    // Reset mount time ref for new grace period
    mountTimeRef.current = now;
  }, []);

  // Check for low activity and trigger callback or default behavior
  useEffect(() => {
    // Skip alerts on mobile devices
    if (isMobile) return;
    
    // Grace period after mount - wait for server sync before checking
    const timeSinceMount = Date.now() - mountTimeRef.current;
    if (timeSinceMount < MOUNT_GRACE_PERIOD) return;

    // Only check after minimum session duration
    if (sessionDuration < MIN_SESSION_FOR_ALERT) return;
    
    // Check if activity warning is enabled in settings
    const notificationSettings = getNotificationSettings();
    if (!notificationSettings.activityWarningEnabled) return;
    
    // Get threshold from settings (default 60%)
    const threshold = notificationSettings.activityWarningThreshold || 60;
    
    // Check if alert was already shown today (using separate localStorage key)
    // This persists across page reloads within the same day
    const today = new Date().toDateString();
    const alertShownDate = localStorage.getItem(ALERT_SHOWN_KEY);
    const alertAlreadyShownToday = alertShownDate === today;
    
    // Check if activity dropped below threshold and we haven't shown alert yet today
    if (activityPercentage < threshold && !alertAlreadyShownToday) {
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
      
      // Save alert shown date to separate localStorage key (persists across reloads)
      localStorage.setItem(ALERT_SHOWN_KEY, today);
      
      setState(prev => {
        const newState = { ...prev, lowActivityAlertShown: true };
        saveState(newState);
        return newState;
      });
    }
    
    // Reset alert flag if activity goes back above threshold (with 5% buffer)
    if (activityPercentage >= threshold + 5 && state.lowActivityAlertShown) {
      localStorage.removeItem(ALERT_SHOWN_KEY);
      setState(prev => {
        const newState = { ...prev, lowActivityAlertShown: false };
        saveState(newState);
        return newState;
      });
    }
  }, [activityPercentage, sessionDuration, state.lowActivityAlertShown, onLowActivity, isMobile]);

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
