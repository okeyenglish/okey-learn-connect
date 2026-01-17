import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChatThread, UnreadByMessenger } from './useChatMessages';
import { chatQueryConfig } from '@/lib/queryConfig';

/**
 * Optimized hook for loading chat threads
 * Uses database indexes for much faster queries
 */
export const useChatThreadsOptimized = () => {
  return useQuery({
    queryKey: ['chat-threads-optimized'],
    queryFn: async () => {
      console.log('[useChatThreadsOptimized] Starting optimized fetch...');
      const startTime = performance.now();

      // Step 1: Get latest message per client using a more efficient approach
      // Uses idx_chat_messages_org_created index
      const { data: latestMessages, error: latestError } = await supabase
        .from('chat_messages')
        .select('client_id, message_text, message_type, messenger_type, created_at, is_read')
        .order('created_at', { ascending: false })
        .limit(1000); // Get recent messages, we'll dedupe by client

      if (latestError) {
        console.error('[useChatThreadsOptimized] Error fetching messages:', latestError);
        throw latestError;
      }

      // Dedupe to get latest message per client
      const clientLatestMap = new Map<string, any>();
      const clientUnreadMap = new Map<string, { count: number; byMessenger: UnreadByMessenger; lastMessenger: string | null }>();

      (latestMessages || []).forEach((msg: any) => {
        const clientId = msg.client_id;
        
        // Track latest message per client
        if (!clientLatestMap.has(clientId)) {
          clientLatestMap.set(clientId, msg);
        }

        // Count unread messages
        if (!msg.is_read && msg.message_type === 'client') {
          if (!clientUnreadMap.has(clientId)) {
            clientUnreadMap.set(clientId, {
              count: 0,
              byMessenger: { whatsapp: 0, telegram: 0, max: 0, email: 0, calls: 0 },
              lastMessenger: null
            });
          }
          const unread = clientUnreadMap.get(clientId)!;
          unread.count++;
          
          const messengerType = msg.messenger_type || 'whatsapp';
          if (messengerType in unread.byMessenger) {
            (unread.byMessenger as any)[messengerType]++;
          }
          
          // First encountered unread is the latest (since sorted desc)
          if (!unread.lastMessenger) {
            unread.lastMessenger = messengerType;
          }
        }
      });

      const clientIds = Array.from(clientLatestMap.keys());
      
      if (clientIds.length === 0) {
        console.log('[useChatThreadsOptimized] No messages found');
        return [];
      }

      // Step 2: Fetch client details in parallel
      const [{ data: clients, error: clientsError }, { data: primaryPhones }] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name, phone')
          .in('id', clientIds),
        supabase
          .from('client_phone_numbers')
          .select('client_id, phone')
          .in('client_id', clientIds)
          .eq('is_primary', true)
      ]);

      if (clientsError) {
        console.warn('[useChatThreadsOptimized] Error fetching clients:', clientsError);
      }

      const clientsMap = new Map((clients || []).map((c: any) => [c.id, c]));
      const phonesMap = new Map((primaryPhones || []).map((p: any) => [p.client_id, p.phone]));

      // Step 3: Build threads
      const threads: ChatThread[] = [];

      clientLatestMap.forEach((latestMsg, clientId) => {
        const client = clientsMap.get(clientId);
        const primaryPhone = phonesMap.get(clientId);
        const unreadData = clientUnreadMap.get(clientId);

        threads.push({
          client_id: clientId,
          client_name: client?.name || '',
          client_phone: client?.phone || primaryPhone || '',
          last_message: latestMsg.message_text || '',
          last_message_time: latestMsg.created_at,
          unread_count: unreadData?.count || 0,
          unread_by_messenger: unreadData?.byMessenger || { whatsapp: 0, telegram: 0, max: 0, email: 0, calls: 0 },
          last_unread_messenger: unreadData?.lastMessenger || null,
          messages: []
        });
      });

      // Sort by last message time
      threads.sort((a, b) => 
        new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      );

      const endTime = performance.now();
      console.log(`[useChatThreadsOptimized] Completed in ${(endTime - startTime).toFixed(2)}ms, ${threads.length} threads`);

      return threads;
    },
    ...chatQueryConfig,
    staleTime: 10 * 1000, // 10 seconds for chat list
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to get threads with unread messages only (faster for notifications)
 */
export const useUnreadThreads = () => {
  return useQuery({
    queryKey: ['unread-threads'],
    queryFn: async () => {
      // Uses idx_chat_messages_client_unread partial index for fast unread lookup
      const { data, error } = await supabase
        .from('chat_messages')
        .select('client_id, messenger_type, created_at')
        .eq('is_read', false)
        .eq('message_type', 'client')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Group by client
      const unreadByClient = new Map<string, { count: number; lastMessenger: string; lastTime: string }>();

      (data || []).forEach((msg: any) => {
        const clientId = msg.client_id;
        if (!unreadByClient.has(clientId)) {
          unreadByClient.set(clientId, {
            count: 0,
            lastMessenger: msg.messenger_type || 'whatsapp',
            lastTime: msg.created_at
          });
        }
        unreadByClient.get(clientId)!.count++;
      });

      return Array.from(unreadByClient.entries()).map(([clientId, data]) => ({
        client_id: clientId,
        unread_count: data.count,
        last_unread_messenger: data.lastMessenger,
        last_unread_time: data.lastTime
      }));
    },
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });
};
