import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';

export interface GroupFinancialStats {
  total_students: number;
  students_with_debt: number;
  total_debt: number;
  total_paid: number;
  average_balance: number;
}

/**
 * Хук для получения финансовой статистики группы
 */
export const useGroupFinances = (groupId?: string) => {
  return useQuery<GroupFinancialStats>({
    queryKey: ['group-finances', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_group_debt_stats', { p_group_id: groupId });

      if (error) {
        console.error('Error fetching group finances:', error);
        throw error;
      }

      // RPC возвращает массив с одной строкой
      if (data && data.length > 0) {
        return data[0] as GroupFinancialStats;
      }

      // Возвращаем пустую статистику если данных нет
      return {
        total_students: 0,
        students_with_debt: 0,
        total_debt: 0,
        total_paid: 0,
        average_balance: 0
      };
    },
    enabled: !!groupId
  });
};

/**
 * Хук для получения выплат преподавателям по группе
 */
export const useTeacherPayments = (groupId?: string) => {
  return useQuery({
    queryKey: ['teacher-payments', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_group_payments')
        .select(`
          *,
          teacher:profiles!teacher_id(first_name, last_name, email)
        `)
        .eq('group_id', groupId!)
        .order('period_start', { ascending: false });

      if (error) {
        console.error('Error fetching teacher payments:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!groupId
  });
};
