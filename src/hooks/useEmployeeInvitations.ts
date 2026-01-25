import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorUtils';

export interface EmployeeInvitation {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  email: string | null;
  branch: string | null;
  position: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invite_token: string;
  token_expires_at: string;
  created_at: string;
  terms_accepted_at: string | null;
  profile_id: string | null;
}

export const useEmployeeInvitations = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['employee-invitations', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await (supabase
        .from('employee_invitations' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;
      return (data || []) as EmployeeInvitation[];
    },
    enabled: !!organizationId,
  });

  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await (supabase
        .from('employee_invitations' as any)
        .update({ status: 'cancelled' })
        .eq('id', invitationId) as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-invitations'] });
      toast.success('Приглашение отменено');
    },
    onError: (error) => {
      toast.error('Ошибка: ' + getErrorMessage(error));
    },
  });

  const resendInvitation = useMutation({
    mutationFn: async (invitation: EmployeeInvitation) => {
      // Генерируем новый токен и продлеваем срок действия
      const newToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);

      const { error } = await (supabase
        .from('employee_invitations' as any)
        .update({ 
          invite_token: newToken,
          token_expires_at: newExpiry.toISOString(),
          status: 'pending'
        })
        .eq('id', invitation.id) as any);
      
      if (error) throw error;

      return { ...invitation, invite_token: newToken };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employee-invitations'] });
      
      // Копируем ссылку в буфер
      const inviteLink = `${window.location.origin}/employee/onboarding/${data.invite_token}`;
      navigator.clipboard.writeText(inviteLink);
      toast.success('Приглашение обновлено, ссылка скопирована');
    },
    onError: (error) => {
      toast.error('Ошибка: ' + getErrorMessage(error));
    },
  });

  return {
    invitations: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    cancelInvitation,
    resendInvitation,
  };
};

// Маппинг позиций на русские названия
export const POSITION_LABELS: Record<string, string> = {
  manager: 'Менеджер',
  methodist: 'Методист',
  branch_manager: 'Управляющий',
  teacher: 'Преподаватель',
  accountant: 'Бухгалтер',
  receptionist: 'Администратор',
  sales_manager: 'Менеджер по продажам',
  head_teacher: 'Старший преподаватель',
};

// Маппинг статусов
export const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  accepted: 'Принято',
  expired: 'Истекло',
  cancelled: 'Отменено',
};

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  expired: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};
