import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ManagerKpiSettings, ManagerKpiWithProfile, DEFAULT_KPI_SETTINGS } from "@/types/kpi";
import { toast } from "sonner";

export const useManagerKpiSettings = (organizationId?: string) => {
  return useQuery({
    queryKey: ['manager-kpi-settings', organizationId],
    queryFn: async (): Promise<ManagerKpiWithProfile[]> => {
      const { data, error } = await supabase
        .from('manager_kpi_settings')
        .select(`
          *,
          profiles:profile_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ManagerKpiWithProfile[];
    },
    enabled: !!organizationId,
  });
};

export const useManagerKpiByProfile = (profileId?: string) => {
  return useQuery({
    queryKey: ['manager-kpi', profileId],
    queryFn: async (): Promise<ManagerKpiSettings | null> => {
      const { data, error } = await supabase
        .from('manager_kpi_settings')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (error) throw error;
      return data as ManagerKpiSettings | null;
    },
    enabled: !!profileId,
  });
};

export const useUpsertManagerKpi = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      profile_id: string;
      organization_id: string;
      min_call_score?: number;
      min_calls_per_day?: number;
      min_answered_rate?: number;
    }) => {
      const { data: existing } = await supabase
        .from('manager_kpi_settings')
        .select('id')
        .eq('profile_id', params.profile_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('manager_kpi_settings')
          .update({
            min_call_score: params.min_call_score ?? DEFAULT_KPI_SETTINGS.min_call_score,
            min_calls_per_day: params.min_calls_per_day ?? DEFAULT_KPI_SETTINGS.min_calls_per_day,
            min_answered_rate: params.min_answered_rate ?? DEFAULT_KPI_SETTINGS.min_answered_rate,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('manager_kpi_settings')
          .insert({
            profile_id: params.profile_id,
            organization_id: params.organization_id,
            min_call_score: params.min_call_score ?? DEFAULT_KPI_SETTINGS.min_call_score,
            min_calls_per_day: params.min_calls_per_day ?? DEFAULT_KPI_SETTINGS.min_calls_per_day,
            min_answered_rate: params.min_answered_rate ?? DEFAULT_KPI_SETTINGS.min_answered_rate,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-kpi-settings'] });
      queryClient.invalidateQueries({ queryKey: ['manager-kpi'] });
      toast.success('KPI настройки сохранены');
    },
    onError: (error) => {
      console.error('Error saving KPI:', error);
      toast.error('Ошибка сохранения KPI');
    },
  });
};

export const useDeleteManagerKpi = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase
        .from('manager_kpi_settings')
        .delete()
        .eq('profile_id', profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-kpi-settings'] });
      toast.success('KPI настройки удалены');
    },
    onError: (error) => {
      console.error('Error deleting KPI:', error);
      toast.error('Ошибка удаления KPI');
    },
  });
};
