import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface CommunityChat {
  id: string;
  name: string;
  branch: string | null;
  messengerType: 'telegram' | 'whatsapp' | 'max';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  avatarUrl: string | null;
}

/**
 * Hook to fetch community chats (group chats from messengers)
 * Telegram groups have negative chat_id
 */
export const useCommunityChats = () => {
  const queryClient = useQueryClient();

  const { data: communityChats = [], isLoading } = useQuery({
    queryKey: ['community-chats'],
    queryFn: async (): Promise<CommunityChat[]> => {
      console.log('[useCommunityChats] Fetching community chats...');
      
      // Get all group chats - telegram groups have negative chat_id (starts with -)
      // We use LIKE '-%' since telegram_chat_id is stored as string
      const { data: clients, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          branch,
          telegram_chat_id,
          telegram_avatar_url,
          whatsapp_chat_id,
          whatsapp_avatar_url,
          max_chat_id,
          max_avatar_url
        `)
        .like('telegram_chat_id', '-%')
        .not('name', 'ilike', '%Корпоративный%')
        .not('name', 'ilike', '%педагог%')
        .not('name', 'ilike', '%Преподаватель:%')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[useCommunityChats] Error fetching clients:', error);
        throw error;
      }

      if (!clients || clients.length === 0) {
        console.log('[useCommunityChats] No community chats found');
        return [];
      }

      console.log(`[useCommunityChats] Found ${clients.length} clients with group chat_id`);

      // Get latest message and unread count for each community
      const communitiesData = await Promise.all(
        clients.map(async (client) => {
          // Determine messenger type
          let messengerType: 'telegram' | 'whatsapp' | 'max' = 'telegram';
          let avatarUrl = client.telegram_avatar_url;
          
          if (client.telegram_chat_id) {
            messengerType = 'telegram';
            avatarUrl = client.telegram_avatar_url;
          } else if (client.whatsapp_chat_id) {
            messengerType = 'whatsapp';
            avatarUrl = client.whatsapp_avatar_url;
          } else if (client.max_chat_id) {
            messengerType = 'max';
            avatarUrl = client.max_avatar_url;
          }

          // Get last message - also check for file_type if message_text is empty
          const { data: lastMsg } = await supabase
            .from('chat_messages')
            .select('message_text, file_type, file_name, created_at, is_read')
            .eq('client_id', client.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id)
            .eq('is_read', false)
            .eq('message_type', 'client');

          // Format last message - show file type if no text
          let lastMessageText = lastMsg?.message_text || '';
          if (!lastMessageText && lastMsg?.file_type) {
            // Show media type indicator
            if (lastMsg.file_type.startsWith('image/')) {
              lastMessageText = '📷 Фото';
            } else if (lastMsg.file_type.startsWith('video/')) {
              lastMessageText = '🎥 Видео';
            } else if (lastMsg.file_type.startsWith('audio/')) {
              lastMessageText = '🎵 Аудио';
            } else if (lastMsg.file_type === 'voice') {
              lastMessageText = '🎤 Голосовое сообщение';
            } else if (lastMsg.file_name) {
              lastMessageText = `📎 ${lastMsg.file_name}`;
            } else {
              lastMessageText = '📎 Файл';
            }
          }

          return {
            id: client.id,
            name: client.name,
            branch: client.branch,
            messengerType,
            lastMessage: lastMessageText,
            lastMessageTime: lastMsg?.created_at || '',
            unreadCount: unreadCount || 0,
            avatarUrl
          };
        })
      );

      console.log(`[useCommunityChats] Processed ${communitiesData.length} community chats`);
      return communitiesData;
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  // Real-time subscription for community messages
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;

    const debouncedRefetch = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['community-chats'] });
        debounceTimer = null;
      }, 2000);
    };

    const channel = supabase
      .channel('community-chats-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        debouncedRefetch
      )
      .subscribe();

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Calculate totals
  const totalUnread = communityChats.reduce((sum, c) => sum + c.unreadCount, 0);
  const latestCommunity = communityChats.reduce((latest: CommunityChat | null, c) => {
    if (!c.lastMessageTime) return latest;
    if (!latest) return c;
    return new Date(c.lastMessageTime) > new Date(latest.lastMessageTime) ? c : latest;
  }, null);

  return {
    communityChats,
    totalUnread,
    latestCommunity,
    isLoading,
  };
};
