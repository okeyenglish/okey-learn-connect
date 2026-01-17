import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ManagerBranch {
  id: string;
  branch: string;
}

/**
 * Hook для получения филиалов, к которым привязан менеджер.
 * Если менеджер не привязан ни к одному филиалу - возвращает пустой массив (видит все чаты).
 * Админы видят все чаты по умолчанию.
 */
export function useManagerBranches() {
  const { user, role } = useAuth();
  
  const { data: managerBranches = [], isLoading } = useQuery({
    queryKey: ['manager-branches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('manager_branches')
        .select('id, branch')
        .eq('manager_id', user.id);
        
      if (error) {
        console.error('Error fetching manager branches:', error);
        return [];
      }
      
      return (data || []) as ManagerBranch[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 минут
  });

  // Админы всегда видят все (проверяем role, который может быть из допустимых значений)
  const isAdmin = role === 'branch_manager' || role === 'head_teacher';
  
  // Список имён филиалов для фильтрации
  const allowedBranchNames = managerBranches.map(b => b.branch);
  
  // Если менеджер не привязан к филиалам или это админ - видит все
  const hasRestrictions = !isAdmin && allowedBranchNames.length > 0;

  /**
   * Проверяет, можно ли менеджеру видеть чат с этим филиалом
   * @param clientBranch - филиал клиента (clients.branch или client_branches.branch)
   */
  const canAccessBranch = (clientBranch: string | null | undefined): boolean => {
    // Если нет ограничений - доступ разрешён
    if (!hasRestrictions) return true;
    
    // Если у клиента нет филиала - показываем (чтобы не потерять клиентов)
    if (!clientBranch) return true;
    
    // Нормализуем названия филиалов для сравнения
    // "OKEY ENGLISH Котельники" -> "котельники"
    const normalizedClientBranch = normalizeBranchName(clientBranch);
    
    return allowedBranchNames.some(branch => 
      normalizeBranchName(branch) === normalizedClientBranch
    );
  };

  return {
    managerBranches,
    allowedBranchNames,
    hasRestrictions,
    canAccessBranch,
    isLoading,
    isAdmin,
  };
}

/**
 * Нормализует название филиала для сравнения
 * "OKEY ENGLISH Котельники" -> "котельники"
 * "Котельники" -> "котельники"
 */
function normalizeBranchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/okey\s*english\s*/gi, '')
    .replace(/o'key\s*english\s*/gi, '')
    .trim();
}
