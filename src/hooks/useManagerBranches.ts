import { useAuth } from "@/hooks/useAuth";
import { isAdmin as checkIsAdmin } from "@/lib/permissions";
import { useQuery } from "@tanstack/react-query";
import { selfHostedPost } from "@/lib/selfHostedApi";

export interface ManagerBranch {
  id: string;
  branch: string;
}

interface BranchResponse {
  branches: { id: string; branch: string }[];
  source: string;
}

/**
 * Hook для получения филиалов, к которым привязан сотрудник.
 * Использует self-hosted API для получения данных из manager_branches/user_branches/profile.
 * Если у сотрудника нет записей - видит все чаты.
 * Админы видят все чаты по умолчанию.
 */
export function useManagerBranches() {
  const { user, roles } = useAuth();
  
  // Админы всегда видят все
  const isAdmin = checkIsAdmin(roles);
  
  // Загружаем филиалы пользователя через self-hosted API
  const { data: branchData, isLoading } = useQuery({
    queryKey: ['manager-branches-selfhosted', user?.id],
    queryFn: async () => {
      if (!user?.id) return { branches: [], source: 'no-user' };
      
      // Админы видят все — не нужно загружать ограничения
      if (isAdmin) return { branches: [], source: 'admin' };
      
      const response = await selfHostedPost<BranchResponse>('get-user-branches', { 
        user_id: user.id 
      });
      
      if (!response.success || !response.data) {
        console.warn('[useManagerBranches] Failed to fetch user branches:', response.error);
        return { branches: [], source: 'error' };
      }
      
      console.log('[useManagerBranches] Got branches:', response.data);
      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
  
  const userBranches = branchData?.branches || [];
  const allowedBranchNames: string[] = userBranches
    .map((b) => b.branch)
    .filter(Boolean);

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

  const managerBranches: ManagerBranch[] = userBranches.map((b) => ({ 
    id: b.id, 
    branch: b.branch 
  }));

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
