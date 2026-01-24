import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from './useAuth';

export interface GroupPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAddStudents: boolean;
  canRemoveStudents: boolean;
  canChangeStatus: boolean;
  canSetCustomName: boolean;
  canViewFinances: boolean;
  canAccessAllBranches: boolean;
}

/**
 * Хук для проверки прав пользователя на действия с группами
 * @param groupId - ID конкретной группы (optional). Если null - проверяются глобальные права
 */
export const useGroupPermissions = (groupId?: string | null) => {
  const { user, roles } = useAuth();
  
  return useQuery<GroupPermissions>({
    queryKey: ['group-permissions', user?.id, groupId],
    queryFn: async () => {
      // Администраторы имеют все права
      if (roles?.includes('admin')) {
        return {
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canAddStudents: true,
          canRemoveStudents: true,
          canChangeStatus: true,
          canSetCustomName: true,
          canViewFinances: true,
          canAccessAllBranches: true
        };
      }
      
      // Получаем права пользователя из таблицы group_permissions
      const { data, error } = await supabase
        .from('group_permissions')
        .select('*')
        .eq('user_id', user?.id!)
        .or(`group_id.is.null,group_id.eq.${groupId || 'null'}`)
        .order('group_id', { ascending: false }) // Сначала специфичные права группы
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching group permissions:', error);
        // По умолчанию запрещаем всё
        return {
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canAddStudents: false,
          canRemoveStudents: false,
          canChangeStatus: false,
          canSetCustomName: false,
          canViewFinances: false,
          canAccessAllBranches: false
        };
      }
      
      // Если прав нет - запрещаем всё, кроме базовых для менеджеров
      if (!data) {
        const isManager = roles?.includes('manager') || roles?.includes('branch_manager');
        return {
          canCreate: isManager,
          canEdit: isManager,
          canDelete: false,
          canAddStudents: isManager,
          canRemoveStudents: isManager,
          canChangeStatus: false,
          canSetCustomName: false,
          canViewFinances: false,
          canAccessAllBranches: false
        };
      }
      
      return {
        canCreate: data.can_create_groups || false,
        canEdit: data.can_edit_groups || false,
        canDelete: data.can_delete_groups || false,
        canAddStudents: data.can_add_students || false,
        canRemoveStudents: data.can_remove_students || false,
        canChangeStatus: data.can_change_status || false,
        canSetCustomName: data.can_set_custom_name || false,
        canViewFinances: data.can_view_finances || false,
        canAccessAllBranches: data.can_access_all_branches || false
      };
    },
    enabled: !!user
  });
};

/**
 * Хук для проверки конкретного права
 */
export const useCheckGroupPermission = (
  groupId: string | null,
  permission: keyof GroupPermissions
) => {
  const { data: permissions, isLoading } = useGroupPermissions(groupId);
  
  return {
    hasPermission: permissions?.[permission] || false,
    isLoading
  };
};
