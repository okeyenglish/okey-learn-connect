import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';
import type { TypingStatus } from '@/integrations/supabase/database.types';
import { useThrottle } from './useThrottle';
import { performanceAnalytics } from '@/utils/performanceAnalytics';
import { isValidUUID } from '@/lib/uuidValidation';

export interface TypingInfo {
  managerId: string;
  managerName: string;
  draftText: string | null;
}

// Extended type for internal use
type TypingStatusWithName = TypingStatus;

// Broadcast event payload shape
interface TypingBroadcastPayload {
  user_id: string;
  client_id: string;
  is_typing: boolean;
  manager_name: string | null;
  draft_text: string | null;
  updated_at: string;
}

// OPTIMIZED: Uses Broadcast API instead of postgres_changes
// postgres_changes removed because typing_status was dropped from supabase_realtime publication
// Broadcast goes directly via WebSocket — zero DB/WAL overhead
export const useTypingStatus = (clientId: string) => {
  const { user, profile } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingStatusWithName[]>([]);
  const [isCurrentUserTyping, setIsCurrentUserTyping] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);
  const managerNameRef = useRef<string>('Менеджер');
  const inactivityTimerRef = useRef<number | null>(null);
  
  // Broadcast channel ref
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // Fallback polling ref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync user info from AuthProvider
  useEffect(() => {
    if (user) {
      currentUserIdRef.current = user.id;
      
      if (profile) {
        const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
        if (name) managerNameRef.current = name;
      }
    }
  }, [user, profile]);

  // Fetch typing users - used for initial load and fallback polling
  const fetchTypingUsers = useCallback(async () => {
    if (!clientId || !isValidUUID(clientId)) return;
    
    const { data, error } = await supabase
      .from('typing_status')
      .select('user_id, client_id, is_typing, manager_name, draft_text')
      .eq('client_id', clientId)
      .eq('is_typing', true);
      
    if (!error && data) {
      setTypingUsers(data.filter((t) => t.user_id !== currentUserIdRef.current) as TypingStatusWithName[]);
    }
  }, [clientId]);

  // Fetch initial typing users
  useEffect(() => {
    if (!clientId || !isValidUUID(clientId)) return;
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

  // Handle broadcast payload
  const handleBroadcastPayload = useCallback((payload: TypingBroadcastPayload) => {
    if (!payload || payload.client_id !== clientId) return;
    if (payload.user_id === currentUserIdRef.current) return;

    setTypingUsers(prev => {
      if (!payload.is_typing) {
        return prev.filter(t => t.user_id !== payload.user_id);
      }

      const record: TypingStatusWithName = {
        id: `broadcast-${payload.user_id}`,
        user_id: payload.user_id,
        client_id: payload.client_id,
        is_typing: payload.is_typing,
        manager_name: payload.manager_name,
        draft_text: payload.draft_text,
        updated_at: payload.updated_at,
      };

      const existingIdx = prev.findIndex(t => t.user_id === payload.user_id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = record;
        return updated;
      }
      return [...prev, record];
    });
  }, [clientId]);

  // Subscribe to Broadcast channel + fallback polling
  useEffect(() => {
    if (!clientId || !isValidUUID(clientId)) return;

    const channelName = `typing-bc-${clientId}`;
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        handleBroadcastPayload(payload as TypingBroadcastPayload);
      })
      .subscribe();

    broadcastChannelRef.current = channel;

    // Fallback polling every 10 seconds
    pollingIntervalRef.current = setInterval(fetchTypingUsers, 10000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      supabase.removeChannel(channel);
      broadcastChannelRef.current = null;
    };
  }, [clientId, handleBroadcastPayload, fetchTypingUsers]);

  // Core update function — writes to DB + sends broadcast
  const doUpdateTypingStatus = useCallback(async (isTyping: boolean, draftText?: string) => {
    const userId = currentUserIdRef.current;
    if (!userId || !clientId || !isValidUUID(clientId)) return;

    const payload: TypingBroadcastPayload = {
      user_id: userId,
      client_id: clientId,
      is_typing: isTyping,
      updated_at: new Date().toISOString(),
      draft_text: isTyping && draftText ? draftText.slice(0, 100) : null,
      manager_name: isTyping ? managerNameRef.current : null,
    };

    // Send broadcast for instant delivery to other managers
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload,
      });
    }

    // Also persist to DB (for polling consumers like useTypingPresence)
    await supabase
      .from('typing_status')
      .upsert({
        user_id: userId,
        client_id: clientId,
        is_typing: isTyping,
        updated_at: payload.updated_at,
        draft_text: payload.draft_text,
        manager_name: payload.manager_name,
      }, { onConflict: 'user_id,client_id' });
  }, [clientId]);

  // Throttled version - max 1 update per 500ms
  const throttledUpdate = useThrottle(doUpdateTypingStatus, 500);

  // Public API
  const updateTypingStatus = useCallback((isTyping: boolean, draftText?: string) => {
    setIsCurrentUserTyping(isTyping);

    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    throttledUpdate(isTyping, draftText);

    if (isTyping) {
      inactivityTimerRef.current = window.setTimeout(() => {
        throttledUpdate(false);
        setIsCurrentUserTyping(false);
      }, 5000);
    }
  }, [throttledUpdate]);

  // Get detailed typing info
  const getTypingInfo = useCallback((): TypingInfo | null => {
    const typingUser = typingUsers.find(t => t.is_typing);
    if (!typingUser) return null;
    return {
      managerId: typingUser.user_id,
      managerName: typingUser.manager_name || 'Менеджер',
      draftText: typingUser.draft_text || null,
    };
  }, [typingUsers]);

  // Legacy: simple message
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
