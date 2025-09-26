// Centralized role-based access configuration
// Defines which admin sections and CRM routes are available to each role

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

// Map of role -> allowed admin sections
const adminSectionsByRole: Record<AppRole, AdminSectionId[]> = {
  admin: ['dashboard', 'faq', 'schedule', 'whatsapp', 'textbooks', 'sync', 'users', 'permissions', 'settings'],
  branch_manager: ['dashboard', 'schedule', 'whatsapp', 'permissions', 'settings'],
  methodist: ['dashboard', 'faq', 'schedule', 'textbooks', 'permissions', 'settings'],
  head_teacher: ['dashboard', 'schedule'],
  sales_manager: ['dashboard'],
  marketing_manager: ['dashboard'],
  manager: ['dashboard', 'permissions'],
  accountant: ['dashboard', 'settings'],
  receptionist: ['dashboard'],
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

const crmRoutesByRole: Record<AppRole, CrmRouteId[]> = {
  admin: ['crm','teacher-portal','student-portal','crm-schedule','crm-groups','crm-reports','crm-employees','crm-subscriptions','crm-leads','crm-finances','crm-internal-chats','crm-references','admin'],
  branch_manager: ['crm','crm-schedule','crm-groups','crm-reports','crm-employees','crm-internal-chats'],
  methodist: ['crm','teacher-portal','crm-schedule','crm-groups','crm-reports','crm-internal-chats','crm-references','admin'],
  head_teacher: ['crm','teacher-portal','crm-schedule','crm-groups','crm-internal-chats'],
  sales_manager: ['crm','crm-leads','crm-reports'],
  marketing_manager: ['crm','crm-leads','crm-reports'],
  manager: ['crm','crm-schedule','crm-groups','crm-reports','crm-subscriptions','crm-leads','crm-finances','crm-internal-chats'],
  accountant: ['crm','crm-finances','crm-reports','crm-subscriptions'],
  receptionist: ['crm'],
  teacher: ['crm','teacher-portal','crm-internal-chats'],
  student: ['student-portal']
};

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

// Permission keys used by UI checks (manage:roles, manage:all, etc.)
export const buildPermissionsForRoles = (roles: AppRole[] | null | undefined) => {
  const map: Record<string, boolean> = {};
  if (!roles || roles.length === 0) return map;
  if (isAdmin(roles)) {
    map['manage:all'] = true;
    map['manage:roles'] = true;
    map['manage:users'] = true;
    map['manage:clients'] = true;
    map['manage:schedules'] = true;
    map['manage:groups'] = true;
    map['view:reports'] = true;
    return map;
  }

  const grant = (k: string) => (map[k] = true);

  roles.forEach(r => {
    switch (r) {
      case 'branch_manager':
        grant('manage:schedules');
        grant('manage:groups');
        grant('view:reports');
        break;
      case 'methodist':
        grant('manage:schedules');
        grant('manage:groups');
        grant('view:reports');
        break;
      case 'manager':
        grant('manage:clients');
        grant('manage:groups');
        grant('view:reports');
        break;
      case 'accountant':
        grant('view:reports');
        break;
      default:
        break;
    }
  });

  return map;
};
