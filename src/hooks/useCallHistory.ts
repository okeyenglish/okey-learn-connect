import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";

interface CallLog {
  id: string;
  phone_number: string;
  direction: 'incoming' | 'outgoing';
  status: 'initiated' | 'answered' | 'missed' | 'busy' | 'failed';
  duration_seconds: number | null;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  notes: string | null;
}

export const useCallHistory = (clientId: string) => {
  return useQuery({
    queryKey: ['call-logs', clientId],
    queryFn: async (): Promise<CallLog[]> => {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('client_id', clientId)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      return (data || []) as CallLog[];
    },
    enabled: !!clientId,
  });
};