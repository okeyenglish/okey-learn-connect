import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, BarChart3, TrendingUp, Clock, Users } from 'lucide-react';
import { useStaffHistoricalStats } from '@/hooks/useStaffHistoricalStats';
import { usePersistedBranch } from '@/hooks/usePersistedBranch';
import { useStaffOnlinePresence } from '@/hooks/useStaffOnlinePresence';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line
} from 'recharts';

export const StaffActivityChart: React.FC = () => {
  const { selectedBranch, setSelectedBranch } = usePersistedBranch('all');
  const { allUsers } = useStaffOnlinePresence();
  const { aggregatedStats, isLoading, error } = useStaffHistoricalStats({ 
    days: 14, 
    branch: selectedBranch 
  });

  // Extract unique branches
  const availableBranches = useMemo(() => {
    const branches = new Set<string>();
    allUsers.forEach(user => {
      if (user.branch) branches.add(user.branch);
    });
    return Array.from(branches).sort();
  }, [allUsers]);

  // Format data for charts
  const chartData = useMemo(() => {
    return aggregatedStats.map(stat => ({
      date: format(parseISO(stat.date), 'd MMM', { locale: ru }),
      fullDate: stat.date,
      activeMinutes: stat.activeMinutes,
      idleMinutes: stat.idleMinutes,
      callMinutes: stat.callMinutes,
      totalMinutes: stat.totalOnlineMinutes,
      efficiency: stat.avgEfficiency,
      users: stat.userCount,
      // Convert to hours for better readability
      activeHours: Math.round(stat.activeMinutes / 60 * 10) / 10,
      idleHours: Math.round(stat.idleMinutes / 60 * 10) / 10,
      callHours: Math.round(stat.callMinutes / 60 * 10) / 10,
      totalHours: Math.round(stat.totalOnlineMinutes / 60 * 10) / 10,
    }));
  }, [aggregatedStats]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (chartData.length === 0) return null;

    const totalActive = chartData.reduce((sum, d) => sum + d.activeMinutes, 0);
    const totalIdle = chartData.reduce((sum, d) => sum + d.idleMinutes, 0);
    const totalCall = chartData.reduce((sum, d) => sum + d.callMinutes, 0);
    const avgEfficiency = Math.round(
      chartData.reduce((sum, d) => sum + d.efficiency, 0) / chartData.length
    );
    const avgUsers = Math.round(
      chartData.reduce((sum, d) => sum + d.users, 0) / chartData.length
    );

    return {
      totalActiveHours: Math.round(totalActive / 60),
      totalIdleHours: Math.round(totalIdle / 60),
      totalCallHours: Math.round(totalCall / 60),
      avgEfficiency,
      avgUsers
    };
  }, [chartData]);

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Ошибка загрузки данных: {error}</p>
          <p className="text-sm mt-2">Убедитесь, что таблица staff_daily_stats создана</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Branch Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Историческая активность (14 дней)
        </h3>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Все филиалы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все филиалы</SelectItem>
              {availableBranches.map(branch => (
                <SelectItem key={branch} value={branch}>
                  {branch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      {summaryStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="py-3">
              <div className="text-2xl font-bold text-green-600">
                {summaryStats.totalActiveHours}ч
              </div>
              <div className="text-xs text-muted-foreground">Активное время</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <div className="text-2xl font-bold text-yellow-600">
                {summaryStats.totalIdleHours}ч
              </div>
              <div className="text-xs text-muted-foreground">Простой</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <div className="text-2xl font-bold text-blue-600">
                {summaryStats.totalCallHours}ч
              </div>
              <div className="text-xs text-muted-foreground">На звонках</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <div className="text-2xl font-bold text-primary">
                {summaryStats.avgEfficiency}%
              </div>
              <div className="text-xs text-muted-foreground">Ср. эффективность</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <div className="text-2xl font-bold">
                {summaryStats.avgUsers}
              </div>
              <div className="text-xs text-muted-foreground">Ср. сотрудников/день</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Area Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Время работы по дням (часы)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Загрузка данных...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Нет данных за выбранный период
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorIdle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorCall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      activeHours: 'Активное время',
                      idleHours: 'Простой',
                      callHours: 'На звонках'
                    };
                    return [`${value} ч`, labels[name] || name];
                  }}
                />
                <Legend 
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      activeHours: 'Активное время',
                      idleHours: 'Простой',
                      callHours: 'На звонках'
                    };
                    return labels[value] || value;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="activeHours" 
                  stackId="1"
                  stroke="#22c55e" 
                  fill="url(#colorActive)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="callHours" 
                  stackId="1"
                  stroke="#3b82f6" 
                  fill="url(#colorCall)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="idleHours" 
                  stackId="1"
                  stroke="#eab308" 
                  fill="url(#colorIdle)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Efficiency Line Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Эффективность и количество сотрудников
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Загрузка данных...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Нет данных за выбранный период
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'efficiency') return [`${value}%`, 'Эффективность'];
                    if (name === 'users') return [value, 'Сотрудников'];
                    return [value, name];
                  }}
                />
                <Legend 
                  formatter={(value) => {
                    if (value === 'efficiency') return 'Эффективность (%)';
                    if (value === 'users') return 'Сотрудников';
                    return value;
                  }}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="efficiency" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="users" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
