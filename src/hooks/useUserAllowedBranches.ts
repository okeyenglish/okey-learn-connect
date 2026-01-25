import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook для получения филиалов, доступных текущему пользователю.
 * Использует таблицу user_branches для определения доступа.
 * Админы видят все филиалы.
 */
export function useUserAllowedBranches() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';

  const { data: userBranches = [], isLoading } = useQuery({
    queryKey: ['user-allowed-branches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Админы видят все
      if (isAdmin) return [];
      
      // Получаем филиалы из user_branches
      const { data, error } = await (supabase as any)
        .from('user_branches')
        .select('branch')
        .eq('user_id', user.id);
        
      if (error) {
        console.warn('Error fetching user branches:', error);
        return [];
      }
      
      return (data || []).map((row: { branch: string }) => row.branch);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 минут
  });

  /**
   * Проверяет, есть ли у пользователя доступ к филиалу
   */
  const canAccessBranch = (branchName: string | null | undefined): boolean => {
    // Админы видят все
    if (isAdmin) return true;
    
    // Если нет ограничений (пустой массив) - видит все
    if (userBranches.length === 0) return true;
    
    // Если филиал не указан - показываем
    if (!branchName) return true;
    
    // Проверяем доступ
    const normalizedBranch = normalizeBranchName(branchName);
    return userBranches.some(
      (b: string) => normalizeBranchName(b) === normalizedBranch
    );
  };

  /**
   * Фильтрует массив филиалов, оставляя только доступные
   */
  const filterAllowedBranches = <T extends { name?: string; branch?: string }>(
    branches: T[]
  ): T[] => {
    // Админы или пользователи без ограничений видят все
    if (isAdmin || userBranches.length === 0) return branches;
    
    return branches.filter((b) => {
      const branchName = b.name || b.branch || '';
      return canAccessBranch(branchName);
    });
  };

  return {
    allowedBranches: userBranches,
    hasRestrictions: !isAdmin && userBranches.length > 0,
    isLoading,
    isAdmin,
    canAccessBranch,
    filterAllowedBranches,
  };
}

/**
 * Нормализует название филиала для сравнения
 */
function normalizeBranchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/okey\s*english\s*/gi, '')
    .replace(/o'key\s*english\s*/gi, '')
    .trim();
}
