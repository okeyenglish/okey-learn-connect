import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TypingStatus {
  user_id: string;
  client_id: string;
  is_typing: boolean;
  updated_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export const useTypingStatus = (clientId: string) => {
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
  const [isCurrentUserTyping, setIsCurrentUserTyping] = useState(false);
  const { user } = useAuth();

  // Subscribe to typing status changes
  useEffect(() => {
    if (!clientId || !user) return;

    const channel = supabase
      .channel(`typing_status_${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
          filter: `client_id=eq.${clientId}`
        },
        async (payload) => {
          console.log('Typing status change:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const typingStatus = payload.new as TypingStatus;
            
            // Get user profile data
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('user_id', typingStatus.user_id)
              .single();
            
            const statusWithProfile = {
              ...typingStatus,
              profiles: profile
            };

            setTypingUsers(prev => {
              const filtered = prev.filter(t => t.user_id !== typingStatus.user_id);
              if (typingStatus.is_typing) {
                return [...filtered, statusWithProfile];
              }
              return filtered;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedStatus = payload.old as TypingStatus;
            setTypingUsers(prev => prev.filter(t => t.user_id !== deletedStatus.user_id));
          }
        }
      )
      .subscribe();

    // Load initial typing status
    const loadTypingStatus = async () => {
      const { data, error } = await supabase
        .from('typing_status')
        .select(`
          *,
          profiles!inner(first_name, last_name)
        `)
        .eq('client_id', clientId)
        .eq('is_typing', true);

      if (error) {
        console.error('Error loading typing status:', error);
        return;
      }

      setTypingUsers(data || []);
    };

    loadTypingStatus();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, user]);

  // Update typing status
  const updateTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!user || !clientId) return;

    try {
      if (isTyping) {
        // Insert or update typing status
        const { error } = await supabase
          .from('typing_status')
          .upsert({
            user_id: user.id,
            client_id: clientId,
            is_typing: true,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
        setIsCurrentUserTyping(true);
      } else {
        // Delete typing status
        const { error } = await supabase
          .from('typing_status')
          .delete()
          .eq('user_id', user.id)
          .eq('client_id', clientId);

        if (error) throw error;
        setIsCurrentUserTyping(false);
      }
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, [user, clientId]);

  // Auto-clear typing status after period of inactivity
  useEffect(() => {
    if (!isCurrentUserTyping) return;

    const timeout = setTimeout(() => {
      updateTypingStatus(false);
    }, 3000); // Clear after 3 seconds of inactivity

    return () => clearTimeout(timeout);
  }, [isCurrentUserTyping, updateTypingStatus]);

  // Get typing status message
  const getTypingMessage = useCallback(() => {
    const otherTypingUsers = typingUsers.filter(t => t.user_id !== user?.id);
    
    if (otherTypingUsers.length === 0) return null;
    
    if (otherTypingUsers.length === 1) {
      const typingUser = otherTypingUsers[0];
      const name = typingUser.profiles?.first_name && typingUser.profiles?.last_name
        ? `${typingUser.profiles.first_name} ${typingUser.profiles.last_name}`
        : 'Менеджер';
      return `${name} печатает...`;
    }
    
    return `${otherTypingUsers.length} менеджера печатают...`;
  }, [typingUsers, user]);

  return {
    typingUsers,
    isCurrentUserTyping,
    updateTypingStatus,
    getTypingMessage,
    isOtherUserTyping: typingUsers.some(t => t.user_id !== user?.id)
  };
};