import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from './LoginForm';
import { Loader2 } from 'lucide-react';
import type { AppRole } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, loading, isRoleEmulation, originalRoles } = useAuth();

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
  const isAdmin = isRoleEmulation && originalRoles.includes('admin');
  
  if (allowedRoles && role && !allowedRoles.includes(role) && !isAdmin) {
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