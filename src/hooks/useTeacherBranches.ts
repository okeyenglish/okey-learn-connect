import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useState, useEffect } from 'react';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  organization_id?: string;
  organization_name?: string;
  lessonsCount?: number;
}

export const useTeacherBranches = (teacherId?: string) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string | 'all'>('all');

  // Загружаем филиалы преподавателя с информацией об организациях
  const { data: branches, isLoading } = useQuery({
    queryKey: ['teacher-branches', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];

      const { data, error } = await (supabase
        .from('teacher_branches' as any) as any)
        .select(`
          branch_id,
          organization_branches (
            id,
            name,
            address,
            phone,
            organization_id,
            organizations (
              id,
              name
            )
          )
        `)
        .eq('teacher_id', teacherId);

      if (error) {
        console.error('Error fetching teacher branches:', error);
        return [];
      }

      return (data || [])
        .map((item: any) => {
          const branch = item.organization_branches;
          if (!branch) return null;
          
          return {
            ...branch,
            organization_id: branch.organizations?.id,
            organization_name: branch.organizations?.name,
          };
        })
        .filter(Boolean) as Branch[];
    },
    enabled: !!teacherId,
  });

  // Восстанавливаем выбранный филиал из localStorage
  useEffect(() => {
    if (teacherId) {
      const saved = localStorage.getItem(`teacher-selected-branch-${teacherId}`);
      if (saved) {
        setSelectedBranchId(saved);
      }
    }
  }, [teacherId]);

  // Сохраняем выбранный филиал в localStorage
  const selectBranch = (branchId: string | 'all') => {
    setSelectedBranchId(branchId);
    if (teacherId) {
      localStorage.setItem(`teacher-selected-branch-${teacherId}`, branchId);
    }
  };

  const selectedBranch = branches?.find(b => b.id === selectedBranchId);

  // Подсчитываем занятия по филиалам на текущую неделю
  const { data: branchesWithStats } = useQuery({
    queryKey: ['teacher-branches-stats', teacherId],
    queryFn: async () => {
      if (!teacherId || !branches) return branches;

      const start = startOfWeek(new Date(), { weekStartsOn: 1 });
      const end = endOfWeek(new Date(), { weekStartsOn: 1 });

      const stats = await Promise.all(
        branches.map(async (branch) => {
          const { count } = await (supabase
            .from('lesson_sessions' as any) as any)
            .select('*, learning_groups!inner(teacher_id, branch)', { count: 'exact', head: true })
            .eq('learning_groups.teacher_id', teacherId)
            .eq('learning_groups.branch', branch.name)
            .gte('lesson_date', format(start, 'yyyy-MM-dd'))
            .lte('lesson_date', format(end, 'yyyy-MM-dd'));

          return { ...branch, lessonsCount: count || 0 };
        })
      );
      return stats;
    },
    enabled: !!teacherId && !!branches && branches.length > 0,
  });

  return {
    branches: branchesWithStats || branches || [],
    isLoading,
    selectedBranchId,
    selectedBranch,
    selectBranch,
    hasMultipleBranches: (branches?.length || 0) > 1,
  };
};
