import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export const useTeacherBranches = (teacherId?: string) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string | 'all'>('all');

  // Загружаем филиалы преподавателя
  const { data: branches, isLoading } = useQuery({
    queryKey: ['teacher-branches', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];

      const { data, error } = await supabase
        .from('teacher_branches')
        .select(`
          branch_id,
          organization_branches (
            id,
            name,
            address,
            phone
          )
        `)
        .eq('teacher_id', teacherId);

      if (error) {
        console.error('Error fetching teacher branches:', error);
        return [];
      }

      return (data || [])
        .map((item: any) => item.organization_branches)
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

  return {
    branches: branches || [],
    isLoading,
    selectedBranchId,
    selectedBranch,
    selectBranch,
    hasMultipleBranches: (branches?.length || 0) > 1,
  };
};
