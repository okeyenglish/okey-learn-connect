import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Event {
  id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, any>;
  metadata: Record<string, any>;
  organization_id: string | null;
  created_at: string;
  processed_at: string | null;
  retry_count: number;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  error_message: string | null;
}

export const useEvents = (filters?: {
  status?: string;
  event_type?: string;
  aggregate_type?: string;
}) => {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: async () => {
      let query = supabase
        .from('event_bus' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.event_type) {
        query = query.eq('event_type', filters.event_type);
      }
      if (filters?.aggregate_type) {
        query = query.eq('aggregate_type', filters.aggregate_type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Event[];
    },
  });
};

export const usePublishEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      event_type: string;
      aggregate_type: string;
      aggregate_id: string;
      payload?: Record<string, any>;
      metadata?: Record<string, any>;
      organization_id?: string;
    }) => {
      const { data, error } = await supabase.rpc('publish_event' as any, {
        p_event_type: params.event_type,
        p_aggregate_type: params.aggregate_type,
        p_aggregate_id: params.aggregate_id,
        p_payload: params.payload || {},
        p_metadata: params.metadata || {},
        p_organization_id: params.organization_id || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useProcessPendingEvents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (limit: number = 100) => {
      const { data, error } = await supabase.rpc('process_pending_events' as any, {
        p_limit: limit,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Events processed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to process events: ${error.message}`);
    },
  });
};

export const useEventStats = () => {
  return useQuery({
    queryKey: ['event-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_bus' as any)
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const stats = {
        pending: data.filter((e: any) => e.status === 'pending').length,
        processing: data.filter((e: any) => e.status === 'processing').length,
        processed: data.filter((e: any) => e.status === 'processed').length,
        failed: data.filter((e: any) => e.status === 'failed').length,
        total: data.length,
      };

      return stats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
