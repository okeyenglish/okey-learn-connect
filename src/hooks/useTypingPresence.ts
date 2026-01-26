import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import type { TypingStatus } from '@/integrations/supabase/database.types';

export interface TypingPresence {
  count: number;
  names: string[];
}

interface TypingStatusWithName extends Omit<TypingStatus, 'manager_name'> {
  manager_name?: string;
}

// Tracks typing presence across all clients for chat lists
export const useTypingPresence = () => {
  const [typingByClient, setTypingByClient] = useState<Record<string, TypingPresence>>({});

  const rebuildFrom = useCallback((rows: TypingStatusWithName[] = []) => {
    const map: Record<string, TypingPresence> = {};
    rows.forEach((r) => {
      if (!r.is_typing) return;
      const key = r.client_id;
      const name = r.manager_name || 'Менеджер';
      if (!map[key]) map[key] = { count: 0, names: [] };
      map[key].count += 1;
      if (!map[key].names.includes(name)) map[key].names.push(name);
    });
    setTypingByClient(map);
  }, []);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('typing_status')
      .select('*');
    if (!error) rebuildFrom(data || []);
  }, [rebuildFrom]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel('typing-status-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'typing_status' }, () => {
        refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { typingByClient };
};
