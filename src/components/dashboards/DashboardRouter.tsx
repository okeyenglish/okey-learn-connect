import { useAuth } from "@/hooks/useAuth";
import { OwnerDashboard } from "./OwnerDashboard";
import { SalesManagerDashboard } from "./SalesManagerDashboard";
import { BranchAdminDashboard } from "./BranchAdminDashboard";
import { TeacherDashboard } from "./TeacherDashboard";
import { StudentDashboard } from "./StudentDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const DashboardRouter = () => {
  const { roles, isRoleEmulation } = useAuth();

  // Определяем, какой дашборд показать на основе роли пользователя
  const getDashboard = () => {
    if (!roles || roles.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Дашборд недоступен</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              У вас нет назначенных ролей. Обратитесь к администратору для получения доступа.
            </p>
          </CardContent>
        </Card>
      );
    }

    // В режиме эмуляции роли показываем дашборд для эмулируемой роли
    // Проверяем специфичные роли (teacher, student) в первую очередь
    if (roles.includes('teacher')) {
      return <TeacherDashboard />;
    }

    if (roles.includes('student')) {
      return <StudentDashboard />;
    }

    // Затем административные роли
    if (roles.includes('admin')) {
      return <OwnerDashboard />;
    }
    
    if (roles.includes('branch_manager')) {
      return <BranchAdminDashboard />;
    }
    
    if (roles.includes('sales_manager') || roles.includes('manager')) {
      return <SalesManagerDashboard />;
    }
    
    if (roles.includes('methodist') || roles.includes('head_teacher')) {
      return <BranchAdminDashboard />;
    }
    
    if (roles.includes('accountant')) {
      return <OwnerDashboard />; // Бухгалтер видит финансовый дашборд
    }
    
    if (roles.includes('receptionist') || roles.includes('support')) {
      return <BranchAdminDashboard />;
    }

    // Дефолтный дашборд для других ролей
    return (
      <Card>
        <CardHeader>
          <CardTitle>Добро пожаловать</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Выберите раздел из меню для начала работы.
          </p>
        </CardContent>
      </Card>
    );
  };

  return <div className="w-full">{getDashboard()}</div>;
};
