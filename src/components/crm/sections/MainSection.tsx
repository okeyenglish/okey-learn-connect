import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, FileText, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

import { ManagerInterface } from '@/components/crm/ManagerInterface';
import { useAuth } from '@/hooks/useAuth';

export default function MainSection() {
  const { role } = useAuth();
  
  // Для менеджеров показываем полноценный интерфейс с чатами
  if (role && ['manager', 'branch_manager', 'methodist', 'head_teacher', 'sales_manager', 'marketing_manager', 'accountant', 'receptionist', 'support'].includes(role)) {
    return <ManagerInterface />;
  }
  
  // Для остальных ролей показываем карточки с разделами
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Главная</h1>
        <p className="text-muted-foreground mt-2">
          Добро пожаловать в систему управления школой
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/crm/students">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ученики
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Управление учениками
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/crm/groups">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Группы
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Учебные группы
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/crm/schedule">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Расписание
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Управление расписанием
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/crm/finances">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Финансы
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Финансовый учет
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/crm/leads">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Лиды
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Управление лидами
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/crm/employees">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Сотрудники
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Управление персоналом
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/crm/reports">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Отчеты
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Аналитика и отчеты
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/crm/internal-chats">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Внутренние чаты
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Чаты с клиентами
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
