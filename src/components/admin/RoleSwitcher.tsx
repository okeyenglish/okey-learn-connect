import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { UserCog, RefreshCw } from 'lucide-react';
import type { AppRole } from '@/lib/permissions';

const roleLabels: Record<AppRole, string> = {
  admin: 'Администратор',
  branch_manager: 'Управляющий филиалом',
  methodist: 'Методист',
  head_teacher: 'Старший преподаватель',
  sales_manager: 'Менеджер по продажам',
  marketing_manager: 'Менеджер по маркетингу',
  manager: 'Менеджер',
  accountant: 'Бухгалтер',
  receptionist: 'Администратор',
  support: 'Поддержка',
  teacher: 'Преподаватель',
  student: 'Студент',
  parent: 'Родитель',
};

export const RoleSwitcher = () => {
  const { roles, originalRoles, isRoleEmulation, switchToRole, resetRole } = useAuth();

  // Only show for admins
  const isAdmin = originalRoles.includes('admin') || (roles.includes('admin') && !isRoleEmulation);
  
  if (!isAdmin) return null;

  const availableRoles: AppRole[] = [
    'admin',
    'branch_manager',
    'sales_manager',
    'marketing_manager',
    'manager',
    'methodist',
    'head_teacher',
    'accountant',
    'receptionist',
    'support',
    'teacher',
    'student',
    'parent',
  ];

  const currentRole = roles[0];

  return (
    <div className="flex items-center gap-2">
      {isRoleEmulation && (
        <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
          Режим эмуляции
        </Badge>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={isRoleEmulation ? "default" : "outline"} 
            size="sm"
            className="gap-2"
          >
            <UserCog className="h-4 w-4" />
            {roleLabels[currentRole]}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Переключить роль</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {availableRoles.map((role) => (
            <DropdownMenuItem
              key={role}
              onClick={() => switchToRole(role)}
              disabled={!isRoleEmulation && role === currentRole}
            >
              {roleLabels[role]}
              {!isRoleEmulation && role === currentRole && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Текущая
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
          
          {isRoleEmulation && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={resetRole} className="text-primary">
                <RefreshCw className="h-4 w-4 mr-2" />
                Вернуться к админу
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
