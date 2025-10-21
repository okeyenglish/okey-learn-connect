import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, Users, TrendingUp, TrendingDown, BookOpen, UserCheck } from "lucide-react";

export const OwnerDashboard = () => {
  // Mock data - replace with actual API calls
  const revenueData = [
    { date: '1', amount: 45000 },
    { date: '5', amount: 52000 },
    { date: '10', amount: 48000 },
    { date: '15', amount: 61000 },
    { date: '20', amount: 55000 },
    { date: '25', amount: 67000 },
    { date: '30', amount: 72000 },
  ];

  const branchData = [
    { name: 'Филиал 1', revenue: 250000 },
    { name: 'Филиал 2', revenue: 180000 },
    { name: 'Филиал 3', revenue: 220000 },
    { name: 'Филиал 4', revenue: 195000 },
    { name: 'Филиал 5', revenue: 155000 },
  ];

  const studentLevelData = [
    { name: 'Kids', value: 120, color: '#6366f1' },
    { name: 'Teens', value: 85, color: '#8b5cf6' },
    { name: 'Adults', value: 95, color: '#ec4899' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Дашборд Управляющего</h2>
        <p className="text-muted-foreground">Общая аналитика по всем филиалам</p>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выручка за месяц</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1 200 000 ₽</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+12.5%</span> к прошлому месяцу
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные ученики</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">300</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+18</span> новых за месяц
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Средний чек</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4 000 ₽</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingDown className="h-3 w-3 text-red-500" />
              <span className="text-red-500">-2.1%</span> к прошлому месяцу
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Посещаемость</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+3.2%</span> к прошлому месяцу
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Динамика выручки</CardTitle>
            <CardDescription>Выручка по дням за текущий месяц</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} name="Выручка" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ТОП-5 филиалов по выручке</CardTitle>
            <CardDescription>Сравнение выручки по филиалам</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={branchData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#8b5cf6" name="Выручка" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Распределение учеников по программам</CardTitle>
            <CardDescription>Количество учеников в каждой категории</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={studentLevelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {studentLevelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ключевые метрики</CardTitle>
            <CardDescription>Операционная сводка</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Активные группы</span>
              <span className="text-2xl font-bold">42</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Средняя наполняемость групп</span>
              <span className="text-2xl font-bold">7.1</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Активные преподаватели</span>
              <span className="text-2xl font-bold">18</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Новые лиды за месяц</span>
              <span className="text-2xl font-bold">127</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Конверсия лиды → ученики</span>
              <span className="text-2xl font-bold">42%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
