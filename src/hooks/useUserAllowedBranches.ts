import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AVAILABLE_BRANCHES } from '@/hooks/useUserBranches';

/**
 * Hook для получения филиалов, доступных текущему пользователю.
 * Использует таблицу user_branches для определения доступа.
 * Админы видят все филиалы.
 */
export function useUserAllowedBranches() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';

  // Загружаем филиалы пользователя из user_branches
  const { data: userBranches = [], isLoading: userBranchesLoading } = useQuery({
    queryKey: ['user-allowed-branches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Админы видят все — не нужно загружать ограничения
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

  // Загружаем все филиалы из organization_branches
  const { data: allBranches = [], isLoading: allBranchesLoading } = useQuery({
    queryKey: ['all-organization-branches'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('organization_branches')
        .select('name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
        
      if (error) {
        console.warn('Error fetching organization branches:', error);
        // Fallback на статический список
        return AVAILABLE_BRANCHES;
      }
      
      const branchNames = (data || []).map((row: { name: string }) => row.name);
      // Если нет филиалов в БД, используем статический список
      return branchNames.length > 0 ? branchNames : AVAILABLE_BRANCHES;
    },
    staleTime: 10 * 60 * 1000, // 10 минут
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

  /**
   * Возвращает список филиалов для отображения в dropdown
   * Для админов и пользователей без ограничений — все филиалы
   * Для остальных — только разрешённые
   */
  const getBranchesForDropdown = (): string[] => {
    if (isAdmin || userBranches.length === 0) {
      return allBranches;
    }
    return userBranches;
  };

  return {
    allowedBranches: userBranches,
    allBranches,
    branchesForDropdown: getBranchesForDropdown(),
    hasRestrictions: !isAdmin && userBranches.length > 0,
    isLoading: userBranchesLoading || allBranchesLoading,
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
