import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, isRoleEmulation, originalRoles } = useAuth();
  const location = useLocation();
  
  // Если админ в режиме эмуляции - разрешаем доступ везде
  const isAdminEmulating = isRoleEmulation && originalRoles.includes('admin');

  // Показываем загрузку пока проверяем авторизацию
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Проверяем авторизацию...</p>
        </div>
      </div>
    );
  }

  // Если пользователь не авторизован, перенаправляем на страницу входа
  if (!user && !isAdminEmulating) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Если требуется определенная роль, можно добавить проверку здесь
  // Администраторы в режиме эмуляции имеют доступ везде

  return <>{children}</>;
}