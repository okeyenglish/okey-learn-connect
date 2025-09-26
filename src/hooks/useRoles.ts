import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type AppRole = 'admin' | 'branch_manager' | 'methodist' | 'head_teacher' | 'sales_manager' | 'marketing_manager' | 'manager' | 'accountant' | 'receptionist' | 'teacher' | 'student';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

interface UserWithRoles {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  branch: string | null;
  roles: AppRole[];
}

interface RolePermission {
  id: string;
  role: AppRole;
  permission: string;
  resource: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export const useRoles = () => {
  const [loading, setLoading] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const { toast } = useToast();

  // Получить все роли пользователей
  const fetchUserRoles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('*');
      
      if (error) throw error;
      setUserRoles(data || []);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить роли пользователей",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Получить права ролей
  const fetchRolePermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role', { ascending: true })
        .order('resource', { ascending: true });
      
      if (error) throw error;
      setRolePermissions(data || []);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      toast({
        title: "Ошибка", 
        description: "Не удалось загрузить права ролей",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Получить пользователей с их ролями
  const fetchUsersWithRoles = async (): Promise<UserWithRoles[]> => {
    try {
      // Получаем всех пользователей
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Получаем все роли пользователей
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        throw rolesError;
      }

      // Группируем роли по пользователям
      const rolesByUser: Record<string, AppRole[]> = {};
      (userRolesData || []).forEach(userRole => {
        if (!rolesByUser[userRole.user_id]) {
          rolesByUser[userRole.user_id] = [];
        }
        rolesByUser[userRole.user_id].push(userRole.role);
      });

      // Преобразуем данные в нужный формат
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => ({
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone,
        branch: profile.branch,
        roles: rolesByUser[profile.id] || []
      }));
      
      console.log('Loaded users with roles:', usersWithRoles);
      return usersWithRoles;
    } catch (error) {
      console.error('Error fetching users with roles:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить пользователей с ролями",
        variant: "destructive"
      });
      return [];
    }
  };

  // Назначить роль пользователю
  const assignRole = async (userId: string, role: AppRole) => {
    try {
      console.log('Assigning role:', { userId, role });
      
      // Проверяем, есть ли уже такая роль у пользователя
      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', role)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existingRole) {
        toast({
          title: "Информация",
          description: `У пользователя уже есть роль ${getRoleDisplayName(role)}`,
          variant: "default"
        });
        return false;
      }
      
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      toast({
        title: "Успешно",
        description: `Роль ${getRoleDisplayName(role)} назначена пользователю`
      });
      
      await fetchUserRoles();
      return true;
    } catch (error: any) {
      console.error('Error assigning role:', error);
      let errorMessage = "Не удалось назначить роль";
      
      if (error.code === '23505') {
        errorMessage = "У пользователя уже есть эта роль";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    }
  };

  // Отозвать роль у пользователя
  const revokeRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      
      if (error) throw error;
      
      toast({
        title: "Успешно",
        description: `Роль ${getRoleDisplayName(role)} отозвана у пользователя`
      });
      
      await fetchUserRoles();
      return true;
    } catch (error) {
      console.error('Error revoking role:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отозвать роль",
        variant: "destructive"
      });
      return false;
    }
  };

  // Получить отображаемое имя роли
  const getRoleDisplayName = (role: AppRole): string => {
    const roleNames = {
      'admin': 'Администратор',
      'branch_manager': 'Управляющий филиалом',
      'methodist': 'Методист',
      'head_teacher': 'Старший преподаватель',
      'sales_manager': 'Менеджер по продажам',
      'marketing_manager': 'Маркетолог',
      'manager': 'Менеджер',
      'accountant': 'Бухгалтер',
      'receptionist': 'Администратор',
      'teacher': 'Преподаватель',
      'student': 'Студент'
    };
    
    return roleNames[role] || role;
  };

  // Получить описание роли
  const getRoleDescription = (role: AppRole): string => {
    const descriptions = {
      'admin': 'Полный доступ ко всем функциям системы',
      'branch_manager': 'Управление филиалом, расписанием и сотрудниками',
      'methodist': 'Управление учебным процессом и методическими материалами',
      'head_teacher': 'Координация преподавателей и контроль качества обучения',
      'sales_manager': 'Работа с лидами и продажи курсов',
      'marketing_manager': 'Маркетинговые кампании и аналитика',
      'manager': 'Работа с клиентами и общие управленческие задачи',
      'accountant': 'Финансовый учет и управление платежами',
      'receptionist': 'Работа с клиентами на ресепшн',
      'teacher': 'Проведение занятий и работа со студентами',
      'student': 'Доступ к учебным материалам и расписанию'
    };
    
    return descriptions[role] || '';
  };

  const availableRoles: AppRole[] = [
    'admin', 'branch_manager', 'methodist', 'head_teacher', 
    'sales_manager', 'marketing_manager', 'manager', 'accountant', 
    'receptionist', 'teacher', 'student'
  ];

  useEffect(() => {
    fetchUserRoles();
    fetchRolePermissions();
  }, []);

  return {
    loading,
    userRoles,
    rolePermissions,
    availableRoles,
    fetchUserRoles,
    fetchRolePermissions,
    fetchUsersWithRoles,
    assignRole,
    revokeRole,
    getRoleDisplayName,
    getRoleDescription
  };
};