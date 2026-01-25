import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';

interface PinCountResult {
  chat_id: string;
  pin_count: number;
}

export const usePinCounts = (chatIds: string[]) => {
  const [pinCounts, setPinCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPinCounts = async () => {
      if (chatIds.length === 0) {
        setPinCounts({});
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_chat_pin_counts', {
          _chat_ids: chatIds
        });

        if (error) {
          console.error('Error fetching pin counts:', error);
          return;
        }

        const counts: Record<string, number> = {};
        (data || []).forEach((item: PinCountResult) => {
          counts[item.chat_id] = item.pin_count;
        });

        setPinCounts(counts);
      } catch (error) {
        console.error('Error fetching pin counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPinCounts();
  }, [chatIds]);

  return { pinCounts, loading };
};
