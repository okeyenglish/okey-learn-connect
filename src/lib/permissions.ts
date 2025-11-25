// Упрощенная система ролей с фокусом на администратора
// Администратор имеет полные права доступа ко всем функциям

// Упрощенная система ролей с обратной совместимостью
export type AppRole = 
  | 'admin' 
  | 'branch_manager'
  | 'methodist'
  | 'head_teacher'
  | 'sales_manager'
  | 'marketing_manager'
  | 'manager'
  | 'accountant'
  | 'receptionist'
  | 'support'
  | 'teacher'
  | 'student';

// Admin panel sections correspond to AdminSidebar ids  
export type AdminSectionId =
  | 'dashboard'
  | 'faq'
  | 'schedule'
  | 'whatsapp'
  | 'textbooks'
  | 'sync'
  | 'users'
  | 'permissions'
  | 'settings';

// Администратор имеет доступ ко всему, остальные - ограниченный доступ
const adminSectionsByRole: Record<AppRole, AdminSectionId[]> = {
  admin: ['dashboard', 'faq', 'schedule', 'whatsapp', 'textbooks', 'sync', 'users', 'permissions', 'settings'],
  branch_manager: ['dashboard'],
  methodist: ['dashboard'], 
  head_teacher: ['dashboard'],
  sales_manager: ['dashboard'],
  marketing_manager: ['dashboard'],
  manager: ['dashboard'],
  accountant: ['dashboard'],
  receptionist: ['dashboard'],
  support: ['dashboard'],
  teacher: ['dashboard'],
  student: []
};

// CRM routes and their identifiers
export type CrmRouteId =
  | 'crm'
  | 'teacher-portal'
  | 'student-portal'
  | 'crm-schedule'
  | 'crm-groups'
  | 'crm-reports'
  | 'crm-employees'
  | 'crm-subscriptions'
  | 'crm-leads'
  | 'crm-finances'
  | 'crm-internal-chats'
  | 'crm-references'
  | 'admin';

// Администратор имеет доступ ко всем маршрутам CRM
const crmRoutesByRole: Record<AppRole, CrmRouteId[]> = {
  admin: ['crm','teacher-portal','student-portal','crm-schedule','crm-groups','crm-reports','crm-employees','crm-subscriptions','crm-leads','crm-finances','crm-internal-chats','crm-references','admin'],
  branch_manager: ['crm'],
  methodist: ['crm'],
  head_teacher: ['crm'],
  sales_manager: ['crm'],
  marketing_manager: ['crm'],
  manager: ['crm'],
  accountant: ['crm'],
  receptionist: ['crm'],
  support: ['crm'],
  teacher: ['crm','teacher-portal'],
  student: ['student-portal']
};

// Функции для проверки прав администратора
export const isAdmin = (roles?: AppRole[] | null) => !!roles?.includes('admin');

export const canAccessAdminSection = (roles: AppRole[] | null | undefined, section: AdminSectionId) => {
  if (isAdmin(roles)) return true;
  if (!roles || roles.length === 0) return false;
  return roles.some(r => adminSectionsByRole[r]?.includes(section));
};

export const canAccessCrmRoute = (roles: AppRole[] | null | undefined, routeId: CrmRouteId) => {
  if (isAdmin(roles)) return true;
  if (!roles || roles.length === 0) return false;
  return roles.some(r => crmRoutesByRole[r]?.includes(routeId));
};

// Упрощенная система прав - администратор имеет все права
export const buildPermissionsForRoles = (roles: AppRole[] | null | undefined) => {
  const map: Record<string, boolean> = {};
  if (!roles || roles.length === 0) return map;
  
  if (isAdmin(roles)) {
    // Администратор получает все права
    map['manage:all'] = true;
    map['manage:roles'] = true;
    map['manage:users'] = true;
    map['manage:clients'] = true;
    map['manage:schedules'] = true;
    map['manage:groups'] = true;
    map['manage:finances'] = true;
    map['manage:branches'] = true;
    map['manage:chats'] = true;
    map['manage:leads'] = true;
    map['manage:tasks'] = true;
    map['manage:reports'] = true;
    map['view:reports'] = true;
    map['access:admin'] = true;
    return map;
  }

  // Обычные пользователи получают минимальные права
  map['view:basic'] = true;
  return map;
};
