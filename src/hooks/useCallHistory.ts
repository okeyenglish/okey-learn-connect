import { useQuery } from "@tanstack/react-query";
import { selfHostedPost } from "@/lib/selfHostedApi";

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
  manager_id: string | null;
  manager_name: string | null;
  ai_evaluation: unknown | null;
  recording_url?: string | null;
  transcription?: string | null;
  is_viewed?: boolean | null;
  viewed_at?: string | null;
  viewed_by?: string | null;
}

interface CallLogsResponse {
  success: boolean;
  calls: CallLog[];
  total: number;
}

export const useCallHistory = (clientId: string) => {
  return useQuery({
    queryKey: ['call-logs', clientId],
    queryFn: async (): Promise<CallLog[]> => {
      const response = await selfHostedPost<CallLogsResponse>('get-call-logs', {
        action: 'history',
        clientId,
        limit: 20
      });

      if (!response.success) {
        throw new Error(response.error || 'Ошибка загрузки звонков');
      }

      return response.data?.calls || [];
    },
    enabled: !!clientId,
  });
};