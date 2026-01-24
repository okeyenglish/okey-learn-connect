import { useQuery } from '@tanstack/react-query';
import { supabaseTyped as supabase } from '@/integrations/supabase/typedClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Activity, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';

interface AuditStats {
  total_events: number;
  events_by_type: Record<string, number>;
  events_by_entity: Record<string, number>;
  recent_activity: Array<{
    hour: string;
    count: number;
  }>;
}

export const AuditDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['audit-dashboard-stats'],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      // Total events
      const { count: totalEvents } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo);

      // Events by type
      const { data: eventTypes } = await supabase
        .from('audit_log')
        .select('event_type')
        .gte('created_at', sevenDaysAgo);

      // Events by entity
      const { data: entityTypes } = await supabase
        .from('audit_log')
        .select('aggregate_type')
        .gte('created_at', sevenDaysAgo);

      // Recent activity by hour
      const { data: recentActivity } = await supabase
        .from('audit_log')
        .select('created_at')
        .gte('created_at', subDays(new Date(), 1).toISOString())
        .order('created_at', { ascending: false });

      // Process data
      const eventsByType = eventTypes?.reduce((acc, item) => {
        acc[item.event_type] = (acc[item.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const eventsByEntity = entityTypes?.reduce((acc, item) => {
        acc[item.aggregate_type] = (acc[item.aggregate_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Group by hour
      const activityByHour = recentActivity?.reduce((acc, item) => {
        const hour = format(new Date(item.created_at), 'HH:00', { locale: ru });
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const activityData = Object.entries(activityByHour)
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      return {
        total_events: totalEvents || 0,
        events_by_type: eventsByType,
        events_by_entity: eventsByEntity,
        recent_activity: activityData,
      } as AuditStats;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

  const eventTypeData = stats?.events_by_type
    ? Object.entries(stats.events_by_type).map(([name, value]) => ({ name, value }))
    : [];

  const entityTypeData = stats?.events_by_entity
    ? Object.entries(stats.events_by_entity).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Dashboard аудита</h2>
          <p className="text-muted-foreground">Статистика за последние 7 дней</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего событий</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_events || 0}</div>
                <p className="text-xs text-muted-foreground">За последние 7 дней</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Смена статусов</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.events_by_type?.['status_change'] || 0}
                </div>
                <p className="text-xs text-muted-foreground">Переходы FSM</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Компенсации</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.events_by_type?.['sessions_reverted'] || 0}
                </div>
                <p className="text-xs text-muted-foreground">Откаты операций</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Типов сущностей</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.keys(stats?.events_by_entity || {}).length}
                </div>
                <p className="text-xs text-muted-foreground">Отслеживаемых типов</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Активность за 24 часа</CardTitle>
                <CardDescription>Количество событий по часам</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.recent_activity && stats.recent_activity.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.recent_activity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Нет данных за последние 24 часа
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>События по типам</CardTitle>
                <CardDescription>Распределение типов событий</CardDescription>
              </CardHeader>
              <CardContent>
                {eventTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={eventTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {eventTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Нет данных
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>События по сущностям</CardTitle>
                <CardDescription>Распределение по типам сущностей</CardDescription>
              </CardHeader>
              <CardContent>
                {entityTypeData.length > 0 ? (
                  <div className="space-y-2">
                    {entityTypeData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <Badge variant="outline">{item.value} событий</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Нет данных</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
