import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import type { TypingStatus } from '@/integrations/supabase/database.types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface TypingPresence {
  count: number;
  names: string[];
}

interface TypingStatusWithName extends Omit<TypingStatus, 'manager_name'> {
  manager_name?: string;
}

// Tracks typing presence across all clients for chat lists
// OPTIMIZED: Uses payload directly instead of refresh() SELECT queries
export const useTypingPresence = () => {
  const [typingByClient, setTypingByClient] = useState<Record<string, TypingPresence>>({});

  // Initial fetch on mount
  const fetchInitial = useCallback(async () => {
    const { data, error } = await supabase
      .from('typing_status')
      .select('*');
    
    if (error) {
      console.error('[useTypingPresence] Initial fetch error:', error);
      return;
    }
    
    const map: Record<string, TypingPresence> = {};
    (data || []).forEach((r: TypingStatusWithName) => {
      if (!r.is_typing) return;
      const key = r.client_id;
      const name = r.manager_name || 'Менеджер';
      if (!map[key]) map[key] = { count: 0, names: [] };
      map[key].count += 1;
      if (!map[key].names.includes(name)) map[key].names.push(name);
    });
    setTypingByClient(map);
  }, []);

  // Handle realtime payload directly - NO additional SELECT queries
  const handleRealtimePayload = useCallback((
    payload: RealtimePostgresChangesPayload<TypingStatusWithName>
  ) => {
    const eventType = payload.eventType;
    const record = (payload.new || payload.old) as TypingStatusWithName | undefined;
    
    if (!record) return;
    
    const clientId = record.client_id;
    const userId = record.user_id;
    const isTyping = record.is_typing;
    const managerName = record.manager_name || 'Менеджер';

    setTypingByClient(prev => {
      const updated = { ...prev };
      
      if (eventType === 'DELETE' || !isTyping) {
        // Remove from map
        if (updated[clientId]) {
          updated[clientId] = {
            count: Math.max(0, updated[clientId].count - 1),
            names: updated[clientId].names.filter(n => n !== managerName)
          };
          if (updated[clientId].count <= 0) {
            delete updated[clientId];
          }
        }
      } else if (eventType === 'INSERT' || eventType === 'UPDATE') {
        // Add/update in map
        if (!updated[clientId]) {
          updated[clientId] = { count: 0, names: [] };
        }
        // For UPDATE, we need to handle existing entry
        if (eventType === 'UPDATE') {
          // Count stays same, just update name if changed
          if (!updated[clientId].names.includes(managerName)) {
            updated[clientId].names = [...updated[clientId].names, managerName];
          }
        } else {
          // INSERT - increment count
          updated[clientId].count += 1;
          if (!updated[clientId].names.includes(managerName)) {
            updated[clientId].names = [...updated[clientId].names, managerName];
          }
        }
      }
      
      return updated;
    });
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchInitial();
    
    // Single subscription with event: '*' - handles INSERT, UPDATE, DELETE
    const channel = supabase
      .channel('typing-status-list-optimized')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'typing_status' },
        (payload) => {
          // Use payload directly instead of refresh() to avoid SELECT queries
          handleRealtimePayload(payload as RealtimePostgresChangesPayload<TypingStatusWithName>);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInitial, handleRealtimePayload]);

  return { typingByClient };
};
