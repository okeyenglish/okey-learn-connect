import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import type { TypingStatus } from '@/integrations/supabase/database.types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useThrottle } from './useThrottle';
import { performanceAnalytics } from '@/utils/performanceAnalytics';

export interface TypingInfo {
  managerName: string;
  draftText: string | null;
}

// Extended type for internal use - Supabase returns these fields directly
type TypingStatusWithName = TypingStatus;

// OPTIMIZED: Uses payload directly instead of refresh() SELECT queries
export const useTypingStatus = (clientId: string) => {
  const [typingUsers, setTypingUsers] = useState<TypingStatusWithName[]>([]);
  const [isCurrentUserTyping, setIsCurrentUserTyping] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);
  const managerNameRef = useRef<string>('Менеджер');
  const inactivityTimerRef = useRef<number | null>(null);

  // Load current user and manager name once
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      currentUserIdRef.current = userData.user?.id ?? null;

      if (currentUserIdRef.current) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name,last_name')
          .eq('id', currentUserIdRef.current)
          .maybeSingle();
        const n = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
        if (n) managerNameRef.current = n;
      }
    })();
  }, []);

  // Fetch initial typing users for this client
  useEffect(() => {
    if (!clientId) return;
    let isMounted = true;
    (async () => {
      const start = performance.now();
      const { data, error } = await supabase
        .from('typing_status')
        .select('user_id, client_id, is_typing, manager_name, draft_text')
        .eq('client_id', clientId)
        .eq('is_typing', true);
      if (!error && isMounted) {
        performanceAnalytics.trackQuery({
          table: 'typing_status',
          operation: 'SELECT',
          duration: performance.now() - start,
          source: 'useTypingStatus',
          rowCount: data?.length,
        });
        setTypingUsers((data || []).filter((t) => t.user_id !== currentUserIdRef.current) as TypingStatusWithName[]);
      }
    })();
    return () => { isMounted = false; };
  }, [clientId]);

  // Handle realtime payload directly - NO additional SELECT queries
  const handleRealtimePayload = useCallback((
    payload: RealtimePostgresChangesPayload<TypingStatusWithName>
  ) => {
    const eventType = payload.eventType;
    const record = (payload.new || payload.old) as TypingStatusWithName | undefined;
    
    if (!record) return;
    
    // Skip own typing status
    if (record.user_id === currentUserIdRef.current) return;
    
    setTypingUsers(prev => {
      if (eventType === 'DELETE') {
        return prev.filter(t => t.user_id !== record.user_id);
      }
      
      // INSERT or UPDATE
      if (!record.is_typing) {
        // User stopped typing
        return prev.filter(t => t.user_id !== record.user_id);
      }
      
      // User is typing - add or update
      const existingIdx = prev.findIndex(t => t.user_id === record.user_id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = record;
        return updated;
      }
      return [...prev, record];
    });
  }, []);

  // Subscribe to realtime typing updates for this client
  // OPTIMIZED: Single subscription with event: '*' instead of 3 separate subscriptions
  useEffect(() => {
    if (!clientId) return;
    
    const channelName = `typing_status_${clientId}_optimized`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'typing_status', filter: `client_id=eq.${clientId}` },
        (payload) => {
          // Track realtime event
          performanceAnalytics.trackRealtimeEvent(channelName);
          // Use payload directly instead of refreshTyping() SELECT
          handleRealtimePayload(payload as RealtimePostgresChangesPayload<TypingStatusWithName>);
        }
      )
      .subscribe();
    
    // Track subscription
    performanceAnalytics.trackRealtimeSubscription(channelName, 'typing_status');

    return () => {
      performanceAnalytics.untrackRealtimeSubscription(channelName);
      supabase.removeChannel(channel);
    };
  }, [clientId, handleRealtimePayload]);

  // Core update function (will be throttled)
  const doUpdateTypingStatus = useCallback(async (isTyping: boolean, draftText?: string) => {
    const userId = currentUserIdRef.current;
    if (!userId || !clientId) return;

    const payload = {
      user_id: userId,
      client_id: clientId,
      is_typing: isTyping,
      updated_at: new Date().toISOString(),
      // Include draft text (max 100 chars) and manager name when typing
      draft_text: isTyping && draftText ? draftText.slice(0, 100) : null,
      manager_name: isTyping ? managerNameRef.current : null,
    };

    // Upsert to avoid duplicate key errors on rapid updates
    await supabase
      .from('typing_status')
      .upsert(payload, { onConflict: 'user_id,client_id' });
  }, [clientId]);

  // Throttled version - max 1 update per 500ms
  const throttledUpdate = useThrottle(doUpdateTypingStatus, 500);

  // Public API for updating typing status with optional draft text
  const updateTypingStatus = useCallback((isTyping: boolean, draftText?: string) => {
    setIsCurrentUserTyping(isTyping);

    // Clear previous inactivity timer
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    // Use throttled update
    throttledUpdate(isTyping, draftText);

    // Auto set false after 5s of inactivity when typing
    if (isTyping) {
      inactivityTimerRef.current = window.setTimeout(() => {
        throttledUpdate(false);
        setIsCurrentUserTyping(false);
      }, 5000);
    }
  }, [throttledUpdate]);

  // Get detailed typing info (name + draft text)
  const getTypingInfo = useCallback((): TypingInfo | null => {
    const typingUser = typingUsers.find(t => t.is_typing);
    if (!typingUser) return null;
    return {
      managerName: typingUser.manager_name || 'Менеджер',
      draftText: typingUser.draft_text || null,
    };
  }, [typingUsers]);

  // Legacy: simple message for backward compatibility
  const getTypingMessage = useCallback(() => {
    const otherTypingUsers = typingUsers.filter(t => t.is_typing);
    if (otherTypingUsers.length === 0) return null;
    
    const firstName = otherTypingUsers[0]?.manager_name || 'Менеджер';
    if (otherTypingUsers.length === 1) {
      return `${firstName} печатает...`;
    }
    return `${otherTypingUsers.length} менеджера печатают...`;
  }, [typingUsers]);

  const isOtherUserTyping = useMemo(() => typingUsers.some(t => t.is_typing), [typingUsers]);

  return {
    typingUsers,
    isCurrentUserTyping,
    updateTypingStatus,
    getTypingMessage,
    getTypingInfo,
    isOtherUserTyping,
  };
};
