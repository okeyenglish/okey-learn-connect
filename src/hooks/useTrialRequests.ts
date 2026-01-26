import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TrialLessonRequest {
  id: string;
  name: string;
  phone: string;
  branch_name: string;
  branch_address: string | null;
  comment: string | null;
  source: string | null;
  status: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrialRequestFilters {
  branch?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export const useTrialRequests = (filters: TrialRequestFilters = {}) => {
  return useQuery({
    queryKey: ['trial-requests', filters],
    queryFn: async (): Promise<TrialLessonRequest[]> => {
      let query = supabase
        .from('trial_lesson_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.branch && filters.branch !== 'all') {
        query = query.eq('branch_name', filters.branch);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching trial requests:', error);
        throw error;
      }

      return (data || []) as TrialLessonRequest[];
    },
  });
};

export const useUpdateTrialRequestStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('trial_lesson_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-requests'] });
      toast.success('Статус заявки обновлён');
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast.error('Ошибка обновления статуса');
    },
  });
};

export const useDeleteTrialRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trial_lesson_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-requests'] });
      toast.success('Заявка удалена');
    },
    onError: (error) => {
      console.error('Error deleting request:', error);
      toast.error('Ошибка удаления заявки');
    },
  });
};

export const TRIAL_REQUEST_STATUSES = [
  { value: 'new', label: 'Новая', color: 'bg-blue-500' },
  { value: 'contacted', label: 'Связались', color: 'bg-yellow-500' },
  { value: 'scheduled', label: 'Записан', color: 'bg-purple-500' },
  { value: 'visited', label: 'Посетил', color: 'bg-green-500' },
  { value: 'enrolled', label: 'Записался', color: 'bg-emerald-600' },
  { value: 'cancelled', label: 'Отменён', color: 'bg-red-500' },
  { value: 'no_answer', label: 'Недозвон', color: 'bg-orange-500' },
] as const;

export const getStatusLabel = (status: string | null): string => {
  const found = TRIAL_REQUEST_STATUSES.find(s => s.value === status);
  return found?.label || status || 'Новая';
};

export const getStatusColor = (status: string | null): string => {
  const found = TRIAL_REQUEST_STATUSES.find(s => s.value === status);
  return found?.color || 'bg-blue-500';
};
