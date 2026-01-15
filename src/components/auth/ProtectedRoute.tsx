import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from './LoginForm';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, roles, loading, isRoleEmulation, originalRoles } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  // Если админ в режиме эмуляции - разрешаем доступ везде
  const isAdminEmulating = isRoleEmulation && originalRoles.includes('admin');
  
  // Проверяем пересечение ролей пользователя с разрешёнными ролями
  const hasAllowedRole = () => {
    if (!allowedRoles) return true;
    if (role && allowedRoles.includes(role)) return true;
    if (Array.isArray(roles)) {
      return roles.some(r => allowedRoles.includes(r));
    }
    return false;
  };
  
  if (allowedRoles && !hasAllowedRole() && !isAdminEmulating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Доступ запрещен</h1>
          <p className="text-muted-foreground">
            У вас нет прав для доступа к этой странице
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};