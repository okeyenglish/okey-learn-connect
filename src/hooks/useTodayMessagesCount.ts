import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook to fetch today's sent messages count
 * Counts outgoing messages sent by the current user today
 * Refreshes every 5 minutes
 */
export function useTodayMessagesCount() {
  const { user } = useAuth();
  
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['todayMessagesCount', user?.id, startOfDay],
    queryFn: async () => {
      if (!user?.id) return { total: 0, lastMessageTime: null };

      // Count outgoing messages sent by this user today
      // Self-hosted schema uses is_outgoing (boolean) instead of direction (string)
      // and user_id instead of sender_id
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_outgoing', true)
        .eq('user_id', user.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (error) {
        console.error('[useTodayMessagesCount] Error:', error);
        return { total: 0, lastMessageTime: null };
      }

      // Get last message time
      const { data: lastMessage } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('is_outgoing', true)
        .eq('user_id', user.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastMessageTime = lastMessage
        ? new Date(lastMessage.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        : null;

      return { total: count ?? 0, lastMessageTime };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 1,
  });

  return {
    messagesCount: data?.total ?? 0,
    lastMessageTime: data?.lastMessageTime ?? null,
    isLoading,
    error,
    refetch,
  };
}

export default useTodayMessagesCount;
