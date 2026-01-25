import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import type { TypingStatus } from '@/integrations/supabase/database.types';

export const useTypingStatus = (clientId: string) => {
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
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
      const { data, error } = await supabase
        .from('typing_status')
        .select('user_id, client_id, is_typing')
        .eq('client_id', clientId)
        .eq('is_typing', true);
      if (!error && isMounted) {
        setTypingUsers((data || []).filter((t) => t.user_id !== currentUserIdRef.current) as TypingStatus[]);
      }
    })();
    return () => { isMounted = false; };
  }, [clientId]);

  // Subscribe to realtime typing updates for this client
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel(`typing_status_${clientId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'typing_status', filter: `client_id=eq.${clientId}` },
        () => refreshTyping()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'typing_status', filter: `client_id=eq.${clientId}` },
        () => refreshTyping()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'typing_status', filter: `client_id=eq.${clientId}` },
        () => refreshTyping()
      )
      .subscribe();

    async function refreshTyping() {
      const { data } = await supabase
        .from('typing_status')
        .select('user_id, client_id, is_typing')
        .eq('client_id', clientId)
        .eq('is_typing', true);
      setTypingUsers((data || []).filter((t) => t.user_id !== currentUserIdRef.current) as TypingStatus[]);
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  // Debounced update typing status with auto-stop after inactivity
  const updateTypingStatus = useCallback(async (isTyping: boolean) => {
    setIsCurrentUserTyping(isTyping);

    const userId = currentUserIdRef.current;
    if (!userId || !clientId) return;

    // Clear previous inactivity timer
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    const payload = {
      user_id: userId,
      client_id: clientId,
      is_typing: isTyping,
      updated_at: new Date().toISOString(),
    };

    // Upsert to avoid duplicate key errors on rapid updates
    await supabase
      .from('typing_status')
      .upsert(payload, { onConflict: 'user_id,client_id' });

    // Auto set false after 5s of inactivity when typing
    if (isTyping) {
      inactivityTimerRef.current = window.setTimeout(() => {
        updateTypingStatus(false);
      }, 5000);
    }
  }, [clientId]);

  const getTypingMessage = useCallback(() => {
    const otherTypingUsers = typingUsers.filter(t => t.is_typing);
    if (otherTypingUsers.length === 0) return null;
    if (otherTypingUsers.length === 1) {
      return 'Менеджер печатает...';
    }
    return `${otherTypingUsers.length} менеджера печатают...`;
  }, [typingUsers]);

  const isOtherUserTyping = typingUsers.some(t => t.is_typing);

  return {
    typingUsers,
    isCurrentUserTyping,
    updateTypingStatus,
    getTypingMessage,
    isOtherUserTyping,
  };
};
