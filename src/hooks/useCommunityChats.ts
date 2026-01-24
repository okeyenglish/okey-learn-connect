import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
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

// Helper to check if telegram_chat_id indicates a real Telegram group/supergroup
// Real Telegram groups have negative IDs starting with -100
export const isTelegramGroup = (telegramChatId: string | null): boolean => {
  if (!telegramChatId) return false;
  // Telegram supergroups/channels have IDs like -100XXXXXXXXXX (negative, starts with -100)
  return telegramChatId.startsWith('-100');
};

// Helper to check if a client name indicates it's a group/community (for edge cases)
export const isGroupChatName = (name: string): boolean => {
  if (!name) return false;
  const lowerName = name.toLowerCase();
  
  // Patterns that indicate group chats
  return (
    lowerName.includes('жк ') ||
    lowerName.includes('жк«') ||
    lowerName.startsWith('жк') ||
    lowerName.includes(' жк') ||
    lowerName.includes('| жк') ||
    lowerName.includes('английский язык') ||
    lowerName.includes('support') ||
    lowerName.includes('люберцы') ||
    lowerName.includes('жулебино') ||
    lowerName.includes('найти репетитора') ||
    lowerName.includes('заявки для репетиторов') ||
    (lowerName.includes('|') && (lowerName.includes('язык') || lowerName.includes('группа')))
  );
};

/**
 * Hook to fetch community chats (group chats from messengers)
 * Groups are identified by:
 * 1. Negative telegram_chat_id starting with -100 (Telegram supergroups)
 * 2. Name patterns like "ЖК", "Английский язык |", "Найти репетитора", etc.
 */
export const useCommunityChats = () => {
  const queryClient = useQueryClient();

  const { data: communityChats = [], isLoading } = useQuery({
    queryKey: ['community-chats'],
    queryFn: async (): Promise<CommunityChat[]> => {
      console.log('[useCommunityChats] Fetching community chats...');
      
      // Get all clients with telegram_chat_id to filter groups
      // We'll filter by telegram group ID pattern on the client side
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
          max_avatar_url,
          last_message_at
        `)
        .not('telegram_chat_id', 'is', null)
        .not('name', 'ilike', '%Корпоративный%')
        .not('name', 'ilike', '%педагог%')
        .not('name', 'ilike', '%Преподаватель:%')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(200);

      if (error) {
        console.error('[useCommunityChats] Error fetching clients:', error);
        throw error;
      }

      if (!clients || clients.length === 0) {
        console.log('[useCommunityChats] No community chats found');
        return [];
      }

      // Filter to only include group chats based on:
      // 1. Real Telegram groups (negative telegram_chat_id starting with -100)
      // 2. Name patterns indicating groups (for edge cases from Salebot)
      const groupClients = clients.filter(client => {
        const isRealTelegramGroup = isTelegramGroup(client.telegram_chat_id);
        const hasGroupName = isGroupChatName(client.name);
        return isRealTelegramGroup || hasGroupName;
      });

      console.log(`[useCommunityChats] Found ${groupClients.length} group chats out of ${clients.length} with telegram_chat_id`);

      console.log(`[useCommunityChats] Found ${groupClients.length} group chats out of ${clients.length} with telegram_chat_id`);

      if (groupClients.length === 0) {
        return [];
      }

      // Get latest message and unread count for each community in a single batch
      const clientIds = groupClients.map(c => c.id);
      
      // Batch fetch last messages for all communities (limit to recent for performance)
      const { data: lastMessages } = await supabase
        .from('chat_messages')
        .select('client_id, message_text, file_type, file_name, created_at')
        .in('client_id', clientIds)
        .order('created_at', { ascending: false })
        .limit(500);
      
      // Batch fetch unread counts
      const { data: unreadMessages } = await supabase
        .from('chat_messages')
        .select('client_id')
        .in('client_id', clientIds)
        .eq('is_read', false)
        .eq('message_type', 'client');
      
      // Create lookup maps
      const lastMessageMap = new Map<string, any>();
      lastMessages?.forEach(msg => {
        if (!lastMessageMap.has(msg.client_id)) {
          lastMessageMap.set(msg.client_id, msg);
        }
      });
      
      const unreadCountMap = new Map<string, number>();
      unreadMessages?.forEach(msg => {
        unreadCountMap.set(msg.client_id, (unreadCountMap.get(msg.client_id) || 0) + 1);
      });

      // Map communities data using the batch-fetched data
      const communitiesData: CommunityChat[] = groupClients.map((client) => {
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

        // Get last message from batch data
        const lastMsg = lastMessageMap.get(client.id);
        const unreadCount = unreadCountMap.get(client.id) || 0;

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
          lastMessageTime: lastMsg?.created_at || client.last_message_at || '',
          unreadCount,
          avatarUrl
        };
      });

      // Sort by last message time
      communitiesData.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

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
