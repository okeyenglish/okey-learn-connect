import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { triggerKeyProvisioning } from '@/lib/aiProviderHelpers';

export interface AIProviderKey {
  id: string;
  organization_id: string | null;
  teacher_id: string | null;
  provider: string;
  key_label: string | null;
  key_preview: string | null;
  limit_monthly: number | null;
  limit_remaining: number | null;
  reset_policy: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProvisionJob {
  id: number;
  organization_id: string | null;
  teacher_id: string | null;
  entity_name: string;
  provider: string;
  monthly_limit: number;
  reset_policy: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  run_after: string;
  created_at: string;
  updated_at: string;
}

export const useAIProviderKeys = () => {
  return useQuery({
    queryKey: ['ai-provider-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_ai_provider_keys_public')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AIProviderKey[];
    },
  });
};

export const useProvisionJobs = () => {
  return useQuery({
    queryKey: ['provision-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_key_provision_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ProvisionJob[];
    },
  });
};

export const useProvisionJobsStats = () => {
  return useQuery({
    queryKey: ['provision-jobs-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_key_provision_jobs')
        .select('status');

      if (error) return { queued: 0, running: 0, done: 0, failed: 0, retry: 0, total: 0 };

      const stats = (data || []).reduce((acc, job) => {
        acc[job.status as keyof typeof acc] = (acc[job.status as keyof typeof acc] || 0) + 1;
        acc.total++;
        return acc;
      }, { queued: 0, running: 0, done: 0, failed: 0, retry: 0, total: 0 });

      return stats;
    },
  });
};

export const useTriggerKeyProvisioning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      entityName,
    }: {
      entityType: 'organization' | 'teacher';
      entityId: string;
      entityName: string;
    }) => {
      await triggerKeyProvisioning(entityType, entityId, entityName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provision-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['provision-jobs-stats'] });
      toast.success('Задача на создание ключа добавлена в очередь');
    },
    onError: (error) => {
      toast.error(`Ошибка создания задачи: ${error.message}`);
    },
  });
};

export const useBackfillKeys = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entityType }: { entityType: 'organizations' | 'teachers' | 'all' }) => {
      // Manual backfill - create jobs for entities without keys
      toast.info('Функция backfill будет добавлена в следующем обновлении');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provision-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['provision-jobs-stats'] });
    },
    onError: (error) => {
      toast.error(`Ошибка backfill: ${error.message}`);
    },
  });
};
