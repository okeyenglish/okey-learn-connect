import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/database.types';

export interface Event {
  id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  organization_id: string | null;
  created_at: string;
  processed_at: string | null;
  retry_count: number;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  error_message: string | null;
}

interface EventBusRow {
  id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Json;
  metadata: Json;
  organization_id: string | null;
  created_at: string;
  processed_at: string | null;
  retry_count: number;
  status: string;
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
        .from('event_bus')
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
      
      return (data || []).map((row: EventBusRow) => ({
        ...row,
        payload: row.payload as Record<string, unknown>,
        metadata: row.metadata as Record<string, unknown>,
        status: row.status as Event['status']
      })) as Event[];
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
      payload?: Record<string, unknown>;
      organization_id?: string;
    }) => {
      const { data, error } = await supabase.rpc('publish_event', {
        p_event_type: params.event_type,
        p_aggregate_type: params.aggregate_type,
        p_aggregate_id: params.aggregate_id,
        p_payload: (params.payload || {}) as Json,
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
      const { data, error } = await supabase.rpc('process_pending_events', {
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
        .from('event_bus')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const typedData = data as { status: string }[];
      const stats = {
        pending: typedData.filter((e) => e.status === 'pending').length,
        processing: typedData.filter((e) => e.status === 'processing').length,
        processed: typedData.filter((e) => e.status === 'processed').length,
        failed: typedData.filter((e) => e.status === 'failed').length,
        total: typedData.length,
      };

      return stats;
    },
    refetchInterval: 60000, // OPTIMIZED: 30s → 60s to reduce DB load
  });
};
