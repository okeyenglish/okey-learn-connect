import { useAuth } from "@/hooks/useAuth";
import { isAdmin as checkIsAdmin } from "@/lib/permissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toBranchKey, isBranchAllowed } from "@/lib/branchUtils";

export interface ManagerBranch {
  id: string;
  branch: string;
}

interface BranchQueryResult {
  branches: ManagerBranch[];
  source: 'manager_branches' | 'user_branches' | 'profile' | 'none' | 'admin' | 'error';
  error?: string;
}

/**
 * Hook для получения филиалов, к которым привязан сотрудник.
 * Использует прямые запросы к self-hosted БД (через supabase client).
 * 
 * Порядок fallback:
 * 1. manager_branches (manager_id = user.id)
 * 2. user_branches (user_id = user.id)
 * 3. profiles.branch (id = user.id)
 * 4. Нет ограничений (пустой массив)
 * 
 * Если у сотрудника нет записей - видит все чаты.
 * Админы видят все чаты по умолчанию.
 */
export function useManagerBranches() {
  const { user, roles } = useAuth();
  
  // Админы всегда видят все
  const isAdmin = checkIsAdmin(roles);
  
  // Загружаем филиалы пользователя напрямую из БД
  const { data: branchData, isLoading, error: queryError } = useQuery({
    queryKey: ['manager-branches-direct', user?.id, isAdmin],
    queryFn: async (): Promise<BranchQueryResult> => {
      if (!user?.id) {
        return { branches: [], source: 'none' };
      }
      
      // Админы видят все — не нужно загружать ограничения
      if (isAdmin) {
        console.log('[useManagerBranches] User is admin, skipping branch restrictions');
        return { branches: [], source: 'admin' };
      }
      
      console.log('[useManagerBranches] Fetching branches for user:', user.id);
      
      try {
        // 1. Try manager_branches table first
        const { data: managerBranches, error: mbError } = await (supabase as any)
          .from('manager_branches')
          .select('id, branch')
          .eq('manager_id', user.id);
        
        if (!mbError && managerBranches?.length > 0) {
          console.log('[useManagerBranches] Found in manager_branches:', managerBranches.length);
          return { branches: managerBranches, source: 'manager_branches' };
        }
        
        if (mbError) {
          console.log('[useManagerBranches] manager_branches query error (table may not exist):', mbError.message);
        }
        
        // 2. Fallback: user_branches table
        const { data: userBranches, error: ubError } = await (supabase as any)
          .from('user_branches')
          .select('id, branch')
          .eq('user_id', user.id);
        
        if (!ubError && userBranches?.length > 0) {
          console.log('[useManagerBranches] Found in user_branches:', userBranches.length);
          return { branches: userBranches, source: 'user_branches' };
        }
        
        if (ubError) {
          console.log('[useManagerBranches] user_branches query error:', ubError.message);
        }
        
        // 3. Fallback: profile.branch
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('branch')
          .eq('id', user.id)
          .single();
        
        if (!profileError && profile?.branch) {
          console.log('[useManagerBranches] Found in profile.branch:', profile.branch);
          return { 
            branches: [{ id: 'profile-branch', branch: profile.branch }], 
            source: 'profile' 
          };
        }
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.log('[useManagerBranches] profile query error:', profileError.message);
        }
        
        // 4. No branches found — user sees all
        console.log('[useManagerBranches] No branches found for user, returning empty (user sees all)');
        return { branches: [], source: 'none' };
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[useManagerBranches] Error fetching branches:', errorMessage);
        return { branches: [], source: 'error', error: errorMessage };
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000,
  });
  
  const userBranches = branchData?.branches || [];
  const source = branchData?.source || 'none';
  
  // Get raw branch names (for display)
  const allowedBranchNames: string[] = userBranches
    .map((b) => b.branch)
    .filter(Boolean);
  
  // Get normalized branch keys (for comparison)
  const allowedBranchKeys: string[] = allowedBranchNames
    .map((name) => toBranchKey(name))
    .filter(Boolean);

  // Если сотрудник привязан к филиалу/филиалам и это не админ — включаем ограничения
  const hasRestrictions = !isAdmin && allowedBranchNames.length > 0;

  /**
   * Проверяет, можно ли сотруднику видеть чат с этим филиалом.
   * Использует единую нормализацию из branchUtils.
   * 
   * @param clientBranch - филиал клиента (clients.branch)
   */
  const canAccessBranch = (clientBranch: string | null | undefined): boolean => {
    // Если нет ограничений - доступ разрешён
    if (!hasRestrictions) return true;

    // При активных ограничениях: если у клиента филиал не указан — НЕ показываем
    // (чтобы не было утечек данных)
    if (!clientBranch) return false;

    const hasAccess = isBranchAllowed(clientBranch, allowedBranchNames);
    
    // Debug logging for branch matching (only on mismatches)
    if (!hasAccess) {
      const clientKey = toBranchKey(clientBranch);
      console.log('[canAccessBranch] No match:', {
        clientBranch,
        clientKey,
        allowedBranchNames,
        allowedBranchKeys,
      });
    }
    
    return hasAccess;
  };

  const managerBranches: ManagerBranch[] = userBranches.map((b) => ({ 
    id: b.id, 
    branch: b.branch 
  }));

  return {
    managerBranches,
    allowedBranchNames,
    allowedBranchKeys,
    hasRestrictions,
    canAccessBranch,
    isLoading,
    isAdmin,
    source,
    error: queryError || branchData?.error,
    userBranch: allowedBranchNames[0] || null, // Для обратной совместимости
  };
}
