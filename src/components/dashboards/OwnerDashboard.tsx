import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, Users, TrendingUp, TrendingDown, UserCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { CallStatisticsWidget } from "./CallStatisticsWidget";

export const OwnerDashboard = () => {
  // Current month revenue
  const { data: currentMonthRevenue } = useQuery({
    queryKey: ["revenue-current-month"],
    queryFn: async () => {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      
      const { data, error } = await supabase
        .from("payments")
        .select("amount")
        .eq("status", "completed")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      
      if (error) throw error;
      return data.reduce((sum, p) => sum + (p.amount || 0), 0);
    },
  });

  // Previous month revenue
  const { data: previousMonthRevenue } = useQuery({
    queryKey: ["revenue-previous-month"],
    queryFn: async () => {
      const start = startOfMonth(subMonths(new Date(), 1));
      const end = endOfMonth(subMonths(new Date(), 1));
      
      const { data, error } = await supabase
        .from("payments")
        .select("amount")
        .eq("status", "completed")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      
      if (error) throw error;
      return data.reduce((sum, p) => sum + (p.amount || 0), 0);
    },
  });

  // Active students count
  const { data: activeStudentsCount } = useQuery({
    queryKey: ["active-students-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      
      if (error) throw error;
      return count || 0;
    },
  });

  // New students this month
  const { data: newStudentsCount } = useQuery({
    queryKey: ["new-students-count"],
    queryFn: async () => {
      const start = startOfMonth(new Date());
      
      const { count, error } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .gte("created_at", start.toISOString());
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Average check
  const { data: averageCheck } = useQuery({
    queryKey: ["average-check"],
    queryFn: async () => {
      const start = startOfMonth(new Date());
      
      const { data, error } = await supabase
        .from("payments")
        .select("amount")
        .eq("status", "completed")
        .gte("created_at", start.toISOString());
      
      if (error) throw error;
      if (data.length === 0) return 0;
      return data.reduce((sum, p) => sum + (p.amount || 0), 0) / data.length;
    },
  });

  // Daily revenue for chart
  const { data: dailyRevenue } = useQuery({
    queryKey: ["daily-revenue"],
    queryFn: async () => {
      const start = startOfMonth(new Date());
      
      const { data, error} = await supabase
        .from("payments")
        .select("amount, created_at")
        .eq("status", "completed")
        .gte("created_at", start.toISOString())
        .order("created_at");
      
      if (error) throw error;
      
      // Group by day
      const grouped = data.reduce((acc: any, payment) => {
        const day = format(new Date(payment.created_at), "d");
        if (!acc[day]) acc[day] = 0;
        acc[day] += payment.amount || 0;
        return acc;
      }, {});
      
      return Object.entries(grouped).map(([date, amount]) => ({
        date,
        amount,
      }));
    },
  });

  // Branch revenue - группируем по клиентам и их филиалам
  const { data: branchRevenue } = useQuery({
    queryKey: ["branch-revenue"],
    queryFn: async () => {
      const start = startOfMonth(new Date());
      
      const { data, error } = await supabase
        .from("payments")
        .select("amount, client:clients(branch)")
        .eq("status", "completed")
        .gte("created_at", start.toISOString());
      
      if (error) throw error;
      
      const grouped = data.reduce((acc: any, payment: any) => {
        const branch = payment.client?.branch || "Не указан";
        if (!acc[branch]) acc[branch] = 0;
        acc[branch] += payment.amount || 0;
        return acc;
      }, {});
      
      return Object.entries(grouped)
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 5);
    },
  });

  // Active groups
  const { data: activeGroupsCount } = useQuery({
    queryKey: ["active-groups-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("learning_groups")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      
      if (error) throw error;
      return count || 0;
    },
  });

  // New leads this month
  const { data: newLeadsCount } = useQuery({
    queryKey: ["new-leads-count"],
    queryFn: async () => {
      const start = startOfMonth(new Date());
      
      const { count, error } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte("created_at", start.toISOString());
      
      if (error) throw error;
      return count || 0;
    },
  });

  const revenueGrowth = previousMonthRevenue && currentMonthRevenue
    ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue * 100).toFixed(1)
    : 0;

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
            <div className="text-2xl font-bold">
              {currentMonthRevenue?.toLocaleString('ru-RU') || 0} ₽
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {Number(revenueGrowth) >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{revenueGrowth}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">{revenueGrowth}%</span>
                </>
              )}
              {' '}к прошлому месяцу
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные ученики</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStudentsCount || 0}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+{newStudentsCount || 0}</span> новых за месяц
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Средний чек</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageCheck?.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) || 0} ₽
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Средняя оплата за месяц
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные группы</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGroupsCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Всего групп в работе
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
            {dailyRevenue && dailyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} name="Выручка" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Нет данных за текущий месяц
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ТОП-5 филиалов по выручке</CardTitle>
            <CardDescription>Сравнение выручки по филиалам</CardDescription>
          </CardHeader>
          <CardContent>
            {branchRevenue && branchRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={branchRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8b5cf6" name="Выручка" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Нет данных по филиалам
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ключевые метрики</CardTitle>
            <CardDescription>Операционная сводка за текущий месяц</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Активные группы</span>
              <div className="text-3xl font-bold">{activeGroupsCount || 0}</div>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Активные ученики</span>
              <div className="text-3xl font-bold">{activeStudentsCount || 0}</div>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Новые лиды</span>
              <div className="text-3xl font-bold">{newLeadsCount || 0}</div>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Выручка</span>
              <div className="text-3xl font-bold">
                {(currentMonthRevenue || 0) / 1000}К ₽
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Statistics Widget */}
      <CallStatisticsWidget />
    </div>
  );
};
