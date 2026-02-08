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
  const allowedBranchNames: string[] = userBranches.map(b => b.branch);
  
  // Если сотрудник не привязан к филиалам (user_branches пусто) или это админ - видит все
  const hasRestrictions = !isAdmin && allowedBranchNames.length > 0;

  /**
   * Проверяет, можно ли сотруднику видеть чат с этим филиалом
   * @param clientBranch - филиал клиента (clients.branch)
   */
  const canAccessBranch = (clientBranch: string | null | undefined): boolean => {
    // Если нет ограничений - доступ разрешён
    if (!hasRestrictions) return true;
    
    // Если у клиента нет филиала - показываем (чтобы не потерять клиентов)
    if (!clientBranch) return true;
    
    // Нормализуем название филиала клиента
    const normalizedClientBranch = normalizeBranchName(clientBranch);
    
    // Проверяем, есть ли совпадение с любым из разрешённых филиалов
    return allowedBranchNames.some(
      userBranch => normalizeBranchName(userBranch) === normalizedClientBranch
    );
  };

  return {
    managerBranches: userBranches.map((b) => ({ id: b.id, branch: b.branch })),
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
