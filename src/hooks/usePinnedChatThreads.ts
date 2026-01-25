import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { ChatThread, UnreadByMessenger } from './useChatMessages';
import { isGroupChatName, isTelegramGroup } from './useCommunityChats';

/**
 * Hook to load full thread data for pinned chat IDs
 * that are NOT already present in the loaded threads.
 * This ensures pinned chats always appear even if outside the first N threads.
 */
export const usePinnedChatThreads = (
  pinnedChatIds: string[],
  existingClientIds: Set<string>
) => {
  // Find which pinned IDs are missing from current threads
  // Filter out system chat IDs (non-UUID format like "corporate", "teachers")
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const missingClientIds = pinnedChatIds.filter(id => 
    uuidRegex.test(id) && !existingClientIds.has(id)
  );

  return useQuery({
    queryKey: ['pinned-chat-threads', missingClientIds.sort().join(',')],
    enabled: missingClientIds.length > 0,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async (): Promise<ChatThread[]> => {
      console.log(`[usePinnedChatThreads] Loading ${missingClientIds.length} missing pinned threads...`);
      const startTime = performance.now();

      // Chunk into groups of 20 to prevent timeouts
      const CHUNK_SIZE = 20;
      const chunks: string[][] = [];
      for (let i = 0; i < missingClientIds.length; i += CHUNK_SIZE) {
        chunks.push(missingClientIds.slice(i, i + CHUNK_SIZE));
      }

      // Process chunks in parallel
      const results = await Promise.all(
        chunks.map(async (chunk) => {
          try {
            const { data, error } = await supabase
              .rpc('get_chat_threads_by_client_ids' as any, { p_client_ids: chunk });

            if (error) {
              console.error('[usePinnedChatThreads] RPC failed for chunk, using fallback:', error);
              return await fetchThreadsDirectly(chunk);
            }

            const threads = mapRpcToThreads(data || []);
            if (threads.length === 0 && chunk.length > 0) {
              return await fetchThreadsDirectly(chunk);
            }
            return threads;
          } catch (e) {
            console.error('[usePinnedChatThreads] Chunk error:', e);
            return await fetchThreadsDirectly(chunk);
          }
        })
      );

      const allThreads = results.flat();
      console.log(`[usePinnedChatThreads] Loaded ${allThreads.length} threads in ${(performance.now() - startTime).toFixed(2)}ms`);
      return allThreads;
    },
  });
};

// Fallback: fetch threads directly if RPC fails
async function fetchThreadsDirectly(clientIds: string[]): Promise<ChatThread[]> {
  if (clientIds.length === 0) return [];
  
  console.log('[usePinnedChatThreads] fetchThreadsDirectly called for:', clientIds);

  // Fetch clients with their phone numbers
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select(`
      id,
      name,
      first_name,
      last_name,
      phone,
      branch,
      avatar_url,
      telegram_avatar_url,
      whatsapp_avatar_url,
      max_avatar_url,
      telegram_chat_id,
      whatsapp_chat_id,
      max_chat_id,
      client_phone_numbers(phone, is_primary)
    `)
    .in('id', clientIds);

  if (clientsError) {
    console.error('[usePinnedChatThreads] Failed to fetch clients:', clientsError);
    return [];
  }
  
  console.log('[usePinnedChatThreads] Fetched clients:', clients?.length || 0);

  // Fetch last message for each client
  const { data: messages, error: messagesError } = await supabase
    .from('chat_messages')
    .select('client_id, message_text, created_at, is_read, messenger_type, message_type')
    .in('client_id', clientIds)
    .order('created_at', { ascending: false })
    .limit(clientIds.length * 10);

  if (messagesError) {
    console.error('[usePinnedChatThreads] Failed to fetch messages:', messagesError);
  }

  // Group messages by client
  const messagesByClient = new Map<string, any[]>();
  (messages || []).forEach((msg: any) => {
    if (!messagesByClient.has(msg.client_id)) {
      messagesByClient.set(msg.client_id, []);
    }
    messagesByClient.get(msg.client_id)!.push(msg);
  });

  // Build threads
  const threads: ChatThread[] = (clients || [])
    .filter((client: any) => {
      const telegramChatId = client.telegram_chat_id;
      if (telegramChatId && isTelegramGroup(String(telegramChatId))) {
        return false;
      }
      if (isGroupChatName(client.name || '')) {
        return false;
      }
      return true;
    })
    .map((client: any) => {
      const clientMessages = messagesByClient.get(client.id) || [];
      const lastMessage = clientMessages[0];
      const unreadMessages = clientMessages.filter((m: any) => !m.is_read && m.message_type === 'client');

      const unreadByMessenger: UnreadByMessenger = {
        whatsapp: 0,
        telegram: 0,
        max: 0,
        email: 0,
        calls: 0,
      };
      unreadMessages.forEach((m: any) => {
        const type = m.messenger_type as keyof UnreadByMessenger;
        if (type in unreadByMessenger) {
          unreadByMessenger[type]++;
        }
      });

      const phoneNumbers = client.client_phone_numbers || [];
      const primaryPhone = phoneNumbers.find((p: any) => p.is_primary);
      const clientPhone = client.phone || primaryPhone?.phone || phoneNumbers[0]?.phone || '';

      return {
        client_id: client.id,
        client_name: client.name || '',
        first_name: client.first_name || null,
        last_name: client.last_name || null,
        client_phone: clientPhone,
        client_branch: client.branch || null,
        avatar_url: client.avatar_url || null,
        telegram_avatar_url: client.telegram_avatar_url || null,
        whatsapp_avatar_url: client.whatsapp_avatar_url || null,
        max_avatar_url: client.max_avatar_url || null,
        telegram_chat_id: client.telegram_chat_id || null,
        whatsapp_chat_id: client.whatsapp_chat_id || null,
        max_chat_id: client.max_chat_id || null,
        last_message: lastMessage?.message_text || '',
        last_message_time: lastMessage?.created_at || null,
        unread_count: unreadMessages.length,
        unread_by_messenger: unreadByMessenger,
        last_unread_messenger: unreadMessages[0]?.messenger_type || null,
        messages: [],
      };
    });

  console.log('[usePinnedChatThreads] Built threads:', threads.length);
  return threads;
}

// Map RPC result to ChatThread format
function mapRpcToThreads(data: any[]): ChatThread[] {
  const filteredData = data.filter((row: any) => {
    const name = row.client_name || '';
    const telegramChatId = row.telegram_chat_id;

    if (telegramChatId && isTelegramGroup(String(telegramChatId))) {
      return false;
    }
    if (isGroupChatName(name)) {
      return false;
    }

    const lowerName = name.toLowerCase();
    if (lowerName.includes('корпоративный') ||
        lowerName.includes('педагог') ||
        lowerName.includes('преподаватель:')) {
      return false;
    }

    return true;
  });

  return filteredData.map((row: any) => ({
    client_id: row.clt_id || row.client_id,
    client_name: row.client_name || '',
    first_name: row.first_name || null,
    last_name: row.last_name || null,
    client_phone: row.client_phone || '',
    client_branch: row.client_branch || null,
    avatar_url: row.avatar_url || null,
    telegram_avatar_url: row.telegram_avatar_url || null,
    whatsapp_avatar_url: row.whatsapp_avatar_url || null,
    max_avatar_url: row.max_avatar_url || null,
    telegram_chat_id: row.telegram_chat_id || null,
    whatsapp_chat_id: row.whatsapp_chat_id || null,
    max_chat_id: row.max_chat_id || null,
    last_message: row.last_message_text || row.last_message || '',
    last_message_time: row.last_message_time,
    unread_count: Number(row.unread_count) || 0,
    unread_by_messenger: {
      whatsapp: Number(row.unread_whatsapp) || 0,
      telegram: Number(row.unread_telegram) || 0,
      max: Number(row.unread_max) || 0,
      email: Number(row.unread_email) || 0,
      calls: Number(row.unread_calls) || 0,
    } as UnreadByMessenger,
    last_unread_messenger: row.last_unread_messenger || null,
    messages: [],
  }));
}
