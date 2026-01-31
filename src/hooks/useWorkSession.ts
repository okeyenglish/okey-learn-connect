import { useState, useCallback, useEffect } from 'react';

const SESSION_STORAGE_KEY = 'staff-work-session';

interface WorkSession {
  isActive: boolean;
  startTime: number | null;
  endTime: number | null;
  breaks: Array<{ start: number; end: number | null }>;
}

const loadSession = (): WorkSession => {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Reset if session is from a different day
      if (parsed.startTime) {
        const today = new Date().toDateString();
        const sessionDay = new Date(parsed.startTime).toDateString();
        if (today !== sessionDay) {
          return { isActive: false, startTime: null, endTime: null, breaks: [] };
        }
      }
      return parsed;
    }
  } catch {
    // Ignore errors
  }
  return { isActive: false, startTime: null, endTime: null, breaks: [] };
};

const saveSession = (session: WorkSession) => {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore errors
  }
};

/**
 * Hook to manage work session (shift start/end, breaks)
 */
export const useWorkSession = () => {
  const [session, setSession] = useState<WorkSession>(loadSession);

  // Auto-start session on component mount if not already active
  useEffect(() => {
    if (!session.isActive && !session.startTime) {
      // Auto-start session when user enters the system
      const newSession: WorkSession = {
        isActive: true,
        startTime: Date.now(),
        endTime: null,
        breaks: [],
      };
      setSession(newSession);
      saveSession(newSession);
    }
  }, [session.isActive, session.startTime]);

  const startSession = useCallback(() => {
    const newSession: WorkSession = {
      isActive: true,
      startTime: Date.now(),
      endTime: null,
      breaks: [],
    };
    setSession(newSession);
    saveSession(newSession);
  }, []);

  const endSession = useCallback(() => {
    setSession(prev => {
      const newSession = {
        ...prev,
        isActive: false,
        endTime: Date.now(),
      };
      saveSession(newSession);
      return newSession;
    });
  }, []);

  const startBreak = useCallback(() => {
    setSession(prev => {
      const newSession = {
        ...prev,
        breaks: [...prev.breaks, { start: Date.now(), end: null }],
      };
      saveSession(newSession);
      return newSession;
    });
  }, []);

  const endBreak = useCallback(() => {
    setSession(prev => {
      const breaks = [...prev.breaks];
      const lastBreak = breaks[breaks.length - 1];
      if (lastBreak && lastBreak.end === null) {
        breaks[breaks.length - 1] = { ...lastBreak, end: Date.now() };
      }
      const newSession = { ...prev, breaks };
      saveSession(newSession);
      return newSession;
    });
  }, []);

  const resetSession = useCallback(() => {
    const newSession: WorkSession = {
      isActive: false,
      startTime: null,
      endTime: null,
      breaks: [],
    };
    setSession(newSession);
    saveSession(newSession);
  }, []);

  // Calculate total break time
  const totalBreakTime = session.breaks.reduce((total, brk) => {
    if (brk.end) {
      return total + (brk.end - brk.start);
    } else if (brk.start) {
      return total + (Date.now() - brk.start);
    }
    return total;
  }, 0);

  // Check if currently on break
  const isOnBreak = session.breaks.length > 0 && 
    session.breaks[session.breaks.length - 1].end === null;

  // Calculate total session time (excluding breaks)
  const sessionTime = session.startTime 
    ? (session.endTime || Date.now()) - session.startTime - totalBreakTime
    : 0;

  return {
    isActive: session.isActive,
    isOnBreak,
    startTime: session.startTime,
    endTime: session.endTime,
    sessionTime,
    totalBreakTime,
    breaks: session.breaks,
    startSession,
    endSession,
    startBreak,
    endBreak,
    resetSession,
  };
};

export default useWorkSession;
