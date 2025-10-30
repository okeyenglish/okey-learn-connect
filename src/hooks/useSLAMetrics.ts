import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SLAMetric {
  id: string;
  metric_type: 'lead_first_touch' | 'attendance_submission' | 'payment_reminder';
  entity_id: string;
  entity_type: string;
  target_time: string;
  actual_time: string | null;
  is_met: boolean | null;
  sla_threshold_minutes: number;
  delay_minutes: number | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface SLADashboardStats {
  organization_id: string;
  metric_type: string;
  total_metrics: number;
  met_count: number;
  missed_count: number;
  avg_delay_minutes: number;
  sla_percentage: number;
  date: string;
}

export const useSLAMetrics = (filters?: {
  metric_type?: string;
  entity_id?: string;
  is_met?: boolean;
}) => {
  return useQuery({
    queryKey: ['sla-metrics', filters],
    queryFn: async () => {
      let query = supabase
        .from('sla_metrics' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.metric_type) {
        query = query.eq('metric_type', filters.metric_type);
      }
      if (filters?.entity_id) {
        query = query.eq('entity_id', filters.entity_id);
      }
      if (filters?.is_met !== undefined) {
        query = query.eq('is_met', filters.is_met);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as SLAMetric[];
    },
  });
};

export const useSLADashboard = (days: number = 30) => {
  return useQuery({
    queryKey: ['sla-dashboard', days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_sla_dashboard' as any)
        .select('*')
        .order('date', { ascending: false })
        .limit(days);

      if (error) throw error;
      return data as unknown as SLADashboardStats[];
    },
  });
};

export const useRecordSLAMetric = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      metric_type: string;
      entity_id: string;
      entity_type: string;
      target_time: string;
      actual_time: string;
      threshold_minutes: number;
      organization_id: string;
    }) => {
      const { data, error } = await supabase.rpc('record_sla_metric' as any, {
        p_metric_type: params.metric_type,
        p_entity_id: params.entity_id,
        p_entity_type: params.entity_type,
        p_target_time: params.target_time,
        p_actual_time: params.actual_time,
        p_threshold_minutes: params.threshold_minutes,
        p_organization_id: params.organization_id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['sla-dashboard'] });
    },
  });
};

export const useRefreshSLADashboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('refresh_advanced_materialized_views' as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-dashboard'] });
      toast.success('SLA dashboard refreshed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to refresh: ${error.message}`);
    },
  });
};
