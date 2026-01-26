import { useAuth } from "@/hooks/useAuth";
import { OwnerDashboard } from "./OwnerDashboard";
import { SalesManagerDashboard } from "./SalesManagerDashboard";
import { BranchAdminDashboard } from "./BranchAdminDashboard";
import { TeacherDashboard } from "./TeacherDashboard";
import { StudentDashboard } from "./StudentDashboard";
import { CallQualityDashboard } from "./CallQualityDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Phone, Users } from "lucide-react";
import { useState } from "react";

export const DashboardRouter = () => {
  const { roles } = useAuth();
  const [activeTab, setActiveTab] = useState('main');

  // Check if user has admin/manager role to show call quality
  const canSeeCallQuality = roles?.some(r => 
    ['admin', 'manager', 'branch_manager', 'sales_manager'].includes(r)
  );

  // Определяем, какой дашборд показать на основе роли пользователя
  const getMainDashboard = () => {
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

  // If user can see call quality, show tabs
  if (canSeeCallQuality) {
    return (
      <div className="w-full space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="main" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Основной
            </TabsTrigger>
            <TabsTrigger value="calls" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Качество звонков
            </TabsTrigger>
          </TabsList>

          <TabsContent value="main" className="mt-4">
            {getMainDashboard()}
          </TabsContent>

          <TabsContent value="calls" className="mt-4">
            <CallQualityDashboard />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return <div className="w-full">{getMainDashboard()}</div>;
};
