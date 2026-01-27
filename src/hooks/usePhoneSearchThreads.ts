import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { ChatThread, UnreadByMessenger } from './useChatMessages';
import { isGroupChatName, isTelegramGroup } from './useCommunityChats';

/** Row returned by RPC get_chat_threads_by_client_ids */
interface RpcThreadRow {
  clt_id?: string;
  client_id?: string;
  client_name?: string | null;
  client_phone?: string | null;
  client_branch?: string | null;
  avatar_url?: string | null;
  telegram_avatar_url?: string | null;
  whatsapp_avatar_url?: string | null;
  max_avatar_url?: string | null;
  telegram_chat_id?: string | null;
  last_message_text?: string | null;
  last_message?: string | null;
  last_message_time?: string | null;
  unread_count?: number | null;
  unread_whatsapp?: number | null;
  unread_telegram?: number | null;
  unread_max?: number | null;
  unread_email?: number | null;
  unread_calls?: number | null;
  last_unread_messenger?: string | null;
}

/** Client row from direct fallback query */
interface ClientRow {
  id: string;
  name: string | null;
  phone: string | null;
  branch: string | null;
  avatar_url: string | null;
  telegram_avatar_url: string | null;
  whatsapp_avatar_url: string | null;
  max_avatar_url: string | null;
  telegram_chat_id: string | null;
  client_phone_numbers?: { phone: string; is_primary: boolean }[] | null;
}

/** Message row from fallback query */
interface MessageRow {
  client_id: string;
  message_text: string | null;
  created_at: string;
  is_read: boolean;
  messenger_type: string | null;
  message_type: string | null;
}

/**
 * Hook to load full thread data for client IDs found via phone search
 * that are NOT already present in the loaded threads
 */
export const usePhoneSearchThreads = (
  phoneSearchClientIds: string[],
  existingClientIds: Set<string>
) => {
  // Find which client IDs are missing from current threads
  const missingClientIds = phoneSearchClientIds.filter(id => !existingClientIds.has(id));

  return useQuery({
    queryKey: ['phone-search-threads', missingClientIds.sort().join(',')],
    enabled: missingClientIds.length > 0,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async (): Promise<ChatThread[]> => {
      console.log(`[usePhoneSearchThreads] Loading ${missingClientIds.length} missing threads...`);
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
              .rpc('get_chat_threads_by_client_ids', { p_client_ids: chunk });

            if (error) {
              console.error('[usePhoneSearchThreads] RPC failed for chunk, using fallback:', error);
              return await fetchThreadsDirectly(chunk);
            }

            const rpcData = (data || []) as unknown as RpcThreadRow[];
            const threads = mapRpcToThreads(rpcData);
            if (threads.length === 0 && chunk.length > 0) {
              return await fetchThreadsDirectly(chunk);
            }
            return threads;
          } catch (e) {
            console.error('[usePhoneSearchThreads] Chunk error:', e);
            return await fetchThreadsDirectly(chunk);
          }
        })
      );

      const allThreads = results.flat();
      console.log(`[usePhoneSearchThreads] Loaded ${allThreads.length} threads in ${(performance.now() - startTime).toFixed(2)}ms`);
      return allThreads;
    },
  });
};

// Fallback: fetch threads directly if RPC fails
async function fetchThreadsDirectly(clientIds: string[]): Promise<ChatThread[]> {
  if (clientIds.length === 0) return [];
  
  console.log('[usePhoneSearchThreads] fetchThreadsDirectly called for:', clientIds);

  // Fetch clients with their phone numbers
  const { data: clientsRaw, error: clientsError } = await supabase
    .from('clients')
    .select(`
      id,
      name,
      phone,
      branch,
      avatar_url,
      telegram_avatar_url,
      whatsapp_avatar_url,
      max_avatar_url,
      telegram_chat_id,
      client_phone_numbers(phone, is_primary)
    `)
    .in('id', clientIds)
    .eq('is_active', true);

  if (clientsError) {
    console.error('[usePhoneSearchThreads] Failed to fetch clients:', clientsError);
    return [];
  }
  
  const clients = (clientsRaw || []) as unknown as ClientRow[];
  console.log('[usePhoneSearchThreads] Fetched clients:', clients.length);

  // Fetch last message for each client
  const { data: messagesRaw, error: messagesError } = await supabase
    .from('chat_messages')
    .select('client_id, message_text, created_at, is_read, messenger_type, message_type')
    .in('client_id', clientIds)
    .order('created_at', { ascending: false })
    .limit(clientIds.length * 10); // Get a few messages per client

  if (messagesError) {
    console.error('[usePhoneSearchThreads] Failed to fetch messages:', messagesError);
  }

  const messages = (messagesRaw || []) as unknown as MessageRow[];

  // Group messages by client
  const messagesByClient = new Map<string, MessageRow[]>();
  messages.forEach((msg) => {
    if (!messagesByClient.has(msg.client_id)) {
      messagesByClient.set(msg.client_id, []);
    }
    messagesByClient.get(msg.client_id)!.push(msg);
  });

  // Build threads
  const threads: ChatThread[] = clients
    .filter((client) => {
      // Filter out groups
      const telegramChatId = client.telegram_chat_id;
      if (telegramChatId && isTelegramGroup(String(telegramChatId))) {
        return false;
      }
      if (isGroupChatName(client.name || '')) {
        return false;
      }
      return true;
    })
    .map((client) => {
      const clientMessages = messagesByClient.get(client.id) || [];
      const lastMessage = clientMessages[0];
      const unreadMessages = clientMessages.filter((m) => !m.is_read && m.message_type === 'client');

      // Calculate unread by messenger
      const unreadByMessenger: UnreadByMessenger = {
        whatsapp: 0,
        telegram: 0,
        max: 0,
        chatos: 0,
        email: 0,
        calls: 0,
      };
      unreadMessages.forEach((m) => {
        const type = m.messenger_type as keyof UnreadByMessenger;
        if (type in unreadByMessenger) {
          unreadByMessenger[type]++;
        }
      });

      // Get phone from client or from client_phone_numbers
      const phoneNumbers = client.client_phone_numbers || [];
      const primaryPhone = phoneNumbers.find((p) => p.is_primary);
      const clientPhone = client.phone || primaryPhone?.phone || phoneNumbers[0]?.phone || '';

      return {
        client_id: client.id,
        client_name: client.name || '',
        client_phone: clientPhone,
        client_branch: client.branch || null,
        avatar_url: client.avatar_url || null,
        telegram_avatar_url: client.telegram_avatar_url || null,
        whatsapp_avatar_url: client.whatsapp_avatar_url || null,
        max_avatar_url: client.max_avatar_url || null,
        last_message: lastMessage?.message_text || '',
        last_message_time: lastMessage?.created_at || null,
        unread_count: unreadMessages.length,
        unread_by_messenger: unreadByMessenger,
        last_unread_messenger: unreadMessages[0]?.messenger_type || null,
        messages: [],
      };
    });

  console.log('[usePhoneSearchThreads] Built threads:', threads.length);
  return threads;
}

// Map RPC result to ChatThread format
function mapRpcToThreads(data: RpcThreadRow[]): ChatThread[] {
  const filteredData = data.filter((row) => {
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

  return filteredData.map((row) => ({
    client_id: row.clt_id || row.client_id || '', // clt_id from new RPC, client_id fallback
    client_name: row.client_name || '',
    client_phone: row.client_phone || '',
    client_branch: row.client_branch || null,
    avatar_url: row.avatar_url || null,
    telegram_avatar_url: row.telegram_avatar_url || null,
    whatsapp_avatar_url: row.whatsapp_avatar_url || null,
    max_avatar_url: row.max_avatar_url || null,
    last_message: row.last_message_text || row.last_message || '', // last_message_text from new RPC
    last_message_time: row.last_message_time || null,
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
