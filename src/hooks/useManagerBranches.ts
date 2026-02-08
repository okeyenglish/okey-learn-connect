import { useAuth } from "@/hooks/useAuth";
import { isAdmin as checkIsAdmin } from "@/lib/permissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ManagerBranch {
  id: string;
  branch: string;
}

/**
 * Hook для получения филиалов, к которым привязан сотрудник.
 * Использует таблицу user_branches для определения доступа.
 * Если у сотрудника нет записей в user_branches - видит все чаты.
 * Админы видят все чаты по умолчанию.
 */
export function useManagerBranches() {
  const { user, profile, roles } = useAuth();
  
  // Админы всегда видят все
  const isAdmin = checkIsAdmin(roles);
  
  // Загружаем филиалы пользователя из user_branches
  const { data: userBranches = [], isLoading } = useQuery({
    queryKey: ['manager-branches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Админы видят все — не нужно загружать ограничения
      if (isAdmin) return [];
      
      // Получаем филиалы из user_branches
      const { data, error } = await (supabase as any)
        .from('user_branches')
        .select('id, branch')
        .eq('user_id', user.id);
        
      if (error) {
        console.warn('Error fetching user branches:', error);
        return [];
      }
      
      return (data || []) as { id: string; branch: string }[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
  
  // Список названий филиалов для фильтрации
  const branchesFromTable: string[] = userBranches
    .map((b) => b.branch)
    .filter(Boolean);

  // Fallback: если таблица пустая, используем филиал из профиля (single-branch режим)
  const branchFromProfile = profile?.branch || null;

  const allowedBranchNames: string[] =
    branchesFromTable.length > 0
      ? branchesFromTable
      : branchFromProfile
        ? [branchFromProfile]
        : [];

  // Если сотрудник привязан к филиалу/филиалам и это не админ — включаем ограничения
  const hasRestrictions = !isAdmin && allowedBranchNames.length > 0;

  /**
   * Проверяет, можно ли сотруднику видеть чат с этим филиалом
   * @param clientBranch - филиал клиента (clients.branch)
   */
  const canAccessBranch = (clientBranch: string | null | undefined): boolean => {
    // Если нет ограничений - доступ разрешён
    if (!hasRestrictions) return true;

    // При активных ограничениях: если у клиента филиал не указан — НЕ показываем (чтобы не было утечек)
    if (!clientBranch) return false;

    const normalizedClientBranch = normalizeBranchName(clientBranch);

    return allowedBranchNames.some(
      (userBranch) => normalizeBranchName(userBranch) === normalizedClientBranch
    );
  };

  const managerBranches: ManagerBranch[] =
    branchesFromTable.length > 0
      ? userBranches.map((b) => ({ id: b.id, branch: b.branch }))
      : branchFromProfile
        ? [{ id: 'profile-branch', branch: branchFromProfile }]
        : [];

  return {
    managerBranches,
    allowedBranchNames,
    hasRestrictions,
    canAccessBranch,
    isLoading,
    isAdmin,
    userBranch: allowedBranchNames[0] || null, // Для обратной совместимости
  };
}

/**
 * Нормализует название филиала для сравнения
 * "OKEY ENGLISH Котельники" -> "котельники"
 * "Котельники" -> "котельники"
 * "Филиал Окская" -> "окская"
 */
function normalizeBranchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/okey\s*english\s*/gi, '')
    .replace(/o'key\s*english\s*/gi, '')
    .replace(/филиал\s*/gi, '')
    .trim();
}
