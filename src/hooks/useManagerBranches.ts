import { useAuth } from "@/hooks/useAuth";
import { isAdmin as checkIsAdmin } from "@/lib/permissions";

export interface ManagerBranch {
  id: string;
  branch: string;
}

/**
 * Hook для получения филиалов, к которым привязан сотрудник.
 * Использует филиал из профиля пользователя (profile.branch).
 * Если у сотрудника нет филиала - видит все чаты.
 * Админы видят все чаты по умолчанию.
 */
export function useManagerBranches() {
  const { user, profile, roles } = useAuth();
  
  // Админы всегда видят все
  const isAdmin = checkIsAdmin(roles);
  
  // Филиал сотрудника из профиля
  const userBranch = profile?.branch;
  
  // Список филиалов для фильтрации (один филиал из профиля)
  const allowedBranchNames: string[] = userBranch ? [userBranch] : [];
  
  // Если сотрудник не привязан к филиалу (branch = null) или это админ - видит все
  // Если филиал указан - видит только своих клиентов
  const hasRestrictions = !isAdmin && !!userBranch;

  /**
   * Проверяет, можно ли сотруднику видеть чат с этим филиалом
   * @param clientBranch - филиал клиента (clients.branch)
   */
  const canAccessBranch = (clientBranch: string | null | undefined): boolean => {
    // Если нет ограничений - доступ разрешён
    if (!hasRestrictions) return true;
    
    // Если у клиента нет филиала - показываем (чтобы не потерять клиентов)
    if (!clientBranch) return true;
    
    // Нормализуем названия филиалов для сравнения
    // "OKEY ENGLISH Котельники" -> "котельники"
    const normalizedClientBranch = normalizeBranchName(clientBranch);
    const normalizedUserBranch = normalizeBranchName(userBranch!);
    
    return normalizedClientBranch === normalizedUserBranch;
  };

  return {
    managerBranches: allowedBranchNames.map((branch, idx) => ({ id: String(idx), branch })),
    allowedBranchNames,
    hasRestrictions,
    canAccessBranch,
    isLoading: false, // Нет async запроса - данные уже в профиле
    isAdmin,
    userBranch,
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
