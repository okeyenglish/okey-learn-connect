import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Phone, Calendar, DollarSign, TrendingUp, Users, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const SalesManagerDashboard = () => {
  // Mock data - replace with actual API calls
  const leadsData = [
    { status: 'Новые', count: 23, color: '#6366f1' },
    { status: 'В работе', count: 15, color: '#8b5cf6' },
    { status: 'Пробный урок', count: 8, color: '#ec4899' },
    { status: 'Записан', count: 12, color: '#10b981' },
    { status: 'Отказ', count: 5, color: '#ef4444' },
  ];

  const conversionData = [
    { week: 'Нед 1', leads: 18, trials: 8, students: 5 },
    { week: 'Нед 2', leads: 22, trials: 10, students: 6 },
    { week: 'Нед 3', leads: 19, trials: 9, students: 7 },
    { week: 'Нед 4', leads: 25, trials: 12, students: 8 },
  ];

  const salesPlan = 180000;
  const salesActual = 142000;
  const salesProgress = (salesActual / salesPlan) * 100;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Дашборд Менеджера по продажам</h2>
        <p className="text-muted-foreground">Лиды, звонки и конверсия</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Новые лиды</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">За эту неделю</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Пробные уроки</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Назначено на этой неделе</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Конверсия</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42%</div>
            <p className="text-xs text-muted-foreground">Лид → Ученик</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Продажи за месяц</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142 000 ₽</div>
            <p className="text-xs text-muted-foreground">Из 12 оплат</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Plan Progress */}
      <Card>
        <CardHeader>
          <CardTitle>План продаж</CardTitle>
          <CardDescription>Выполнение месячного плана</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Прогресс</span>
              <span className="font-medium">{salesProgress.toFixed(1)}%</span>
            </div>
            <Progress value={salesProgress} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{salesActual.toLocaleString()} ₽</span>
              <span>{salesPlan.toLocaleString()} ₽</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Осталось</p>
              <p className="text-lg font-bold">{(salesPlan - salesActual).toLocaleString()} ₽</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Средний чек</p>
              <p className="text-lg font-bold">11 833 ₽</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Нужно продаж</p>
              <p className="text-lg font-bold">3-4</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Воронка лидов</CardTitle>
            <CardDescription>Распределение лидов по статусам</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={leadsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="status" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" name="Количество" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Конверсия по неделям</CardTitle>
            <CardDescription>Динамика конверсии лидов в учеников</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="leads" stroke="#6366f1" name="Лиды" />
                <Line type="monotone" dataKey="trials" stroke="#8b5cf6" name="Пробные" />
                <Line type="monotone" dataKey="students" stroke="#10b981" name="Записались" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Leads Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Работа с лидами сегодня</CardTitle>
          <CardDescription>Активность и задачи</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Иванова Мария</p>
                  <p className="text-sm text-muted-foreground">Перезвонить в 14:00</p>
                </div>
              </div>
              <span className="text-xs bg-yellow-500/10 text-yellow-700 px-2 py-1 rounded">Важно</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Петров Алексей</p>
                  <p className="text-sm text-muted-foreground">Пробный урок в 16:30</p>
                </div>
              </div>
              <span className="text-xs bg-green-500/10 text-green-700 px-2 py-1 rounded">Сегодня</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Сидорова Анна</p>
                  <p className="text-sm text-muted-foreground">Отправить договор</p>
                </div>
              </div>
              <span className="text-xs bg-blue-500/10 text-blue-700 px-2 py-1 rounded">В работе</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
