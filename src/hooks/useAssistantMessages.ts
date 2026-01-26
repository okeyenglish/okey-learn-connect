import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AssistantMessage, AssistantMessageRole } from '@/integrations/supabase/database.types';
import { performanceAnalytics } from '@/utils/performanceAnalytics';

export type { AssistantMessage } from '@/integrations/supabase/database.types';

export const useAssistantMessages = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Получаем историю сообщений
  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['assistant-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const start = performance.now();
      
      const { data, error } = await supabase
        .from('assistant_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (error) {
        console.error('[useAssistantMessages] Error fetching messages:', error);
        throw error;
      }
      
      performanceAnalytics.trackQuery({
        table: 'assistant_messages',
        operation: 'SELECT',
        duration: performance.now() - start,
        source: 'useAssistantMessages',
        rowCount: data?.length,
      });
      
      return (data || []) as AssistantMessage[];
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Получаем количество непрочитанных сообщений от ассистента
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['assistant-unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const start = performance.now();
      
      const { count, error } = await supabase
        .from('assistant_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('role', 'assistant')
        .eq('is_read', false);
      
      if (error) {
        console.error('[useAssistantMessages] Error fetching unread count:', error);
        return 0;
      }
      
      performanceAnalytics.trackQuery({
        table: 'assistant_messages',
        operation: 'SELECT',
        duration: performance.now() - start,
        source: 'useAssistantMessages.unreadCount',
      });
      
      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 10000,
    refetchInterval: 60000, // OPTIMIZED: 30s → 60s to reduce DB load
  });

  // Добавляем сообщение
  const addMessageMutation = useMutation({
    mutationFn: async ({ role, content }: { role: AssistantMessageRole; content: string }) => {
      if (!user?.id || !profile?.organization_id) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .from('assistant_messages')
        .insert({
          user_id: user.id,
          organization_id: profile.organization_id,
          role,
          content,
          is_read: role === 'user', // Сообщения пользователя сразу прочитаны
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as AssistantMessage;
    },
    onSuccess: (newMessage) => {
      queryClient.setQueryData<AssistantMessage[]>(
        ['assistant-messages', user?.id],
        (old = []) => [...old, newMessage]
      );
      // Обновляем счётчик непрочитанных
      if (newMessage.role === 'assistant') {
        queryClient.invalidateQueries({ queryKey: ['assistant-unread-count', user?.id] });
      }
    },
  });

  // Помечаем все сообщения как прочитанные
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from('assistant_messages')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData<AssistantMessage[]>(
        ['assistant-messages', user?.id],
        (old = []) => old.map(msg => ({ ...msg, is_read: true }))
      );
      queryClient.setQueryData(['assistant-unread-count', user?.id], 0);
    },
  });

  // Очищаем историю
  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from('assistant_messages')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData(['assistant-messages', user?.id], []);
      queryClient.setQueryData(['assistant-unread-count', user?.id], 0);
    },
  });

  // Realtime подписка на новые сообщения
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`assistant-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'assistant_messages',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as AssistantMessage;
          queryClient.setQueryData<AssistantMessage[]>(
            ['assistant-messages', user.id],
            (old = []) => {
              // Избегаем дубликатов
              if (old.some(m => m.id === newMessage.id)) return old;
              return [...old, newMessage];
            }
          );
          // Обновляем счётчик непрочитанных
          if (newMessage.role === 'assistant' && !newMessage.is_read) {
            queryClient.invalidateQueries({ queryKey: ['assistant-unread-count', user.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const addMessage = useCallback(
    (role: AssistantMessageRole, content: string) => {
      return addMessageMutation.mutateAsync({ role, content });
    },
    [addMessageMutation]
  );

  const markAllAsRead = useCallback(() => {
    return markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation]);

  const clearHistory = useCallback(() => {
    return clearHistoryMutation.mutateAsync();
  }, [clearHistoryMutation]);

  return {
    messages,
    unreadCount,
    isLoading,
    addMessage,
    markAllAsRead,
    clearHistory,
    refetch,
  };
};
