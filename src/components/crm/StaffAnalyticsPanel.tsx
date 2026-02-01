import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Activity, 
  Phone, 
  AlertTriangle,
  Users
} from 'lucide-react';
import { useStaffOnlinePresence, OnlineUser } from '@/hooks/useStaffOnlinePresence';

interface StaffMemberStats {
  user: OnlineUser;
  sessionMinutes: number;
  activeMinutes: number;
  idleMinutes: number;
  activityPercent: number;
  status: 'online' | 'idle' | 'on_call' | 'offline';
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  }
  return `${minutes}м`;
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = {
    online: { label: 'Онлайн', variant: 'default' as const, className: 'bg-green-500 hover:bg-green-600' },
    on_call: { label: 'На звонке', variant: 'default' as const, className: 'bg-blue-500 hover:bg-blue-600 animate-pulse' },
    idle: { label: 'Неактивен', variant: 'secondary' as const, className: 'bg-yellow-500 hover:bg-yellow-600 text-black' },
    offline: { label: 'Оффлайн', variant: 'outline' as const, className: '' },
  };

  const { label, variant, className } = config[status as keyof typeof config] || config.offline;

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
};

const StaffRow: React.FC<{ stats: StaffMemberStats }> = ({ stats }) => {
  const { user, sessionMinutes, activityPercent, status } = stats;

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
          {user.name?.charAt(0) || '?'}
        </div>
        <div>
          <div className="font-medium text-sm">{user.name || 'Без имени'}</div>
          <div className="text-xs text-muted-foreground">
            {sessionMinutes > 0 ? formatDuration(sessionMinutes * 60) : '—'}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="w-24">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Активность</span>
            <span className={activityPercent >= 80 ? 'text-green-500' : activityPercent >= 60 ? 'text-yellow-500' : 'text-red-500'}>
              {activityPercent}%
            </span>
          </div>
          <Progress 
            value={activityPercent} 
            className="h-1.5"
          />
        </div>
        <StatusBadge status={status} />
      </div>
    </div>
  );
};

export const StaffAnalyticsPanel: React.FC = () => {
  const { allUsers, onlineCount } = useStaffOnlinePresence();

  const staffStats = useMemo<StaffMemberStats[]>(() => {
    return allUsers
      .map(user => {
        const activeTime = user.activeTime || 0;
        const idleTime = user.idleTime || 0;
        const totalTime = activeTime + idleTime;
        const activityPercent = totalTime > 0 
          ? Math.round((activeTime / totalTime) * 100)
          : 0;

        const sessionStart = user.sessionStart;
        const sessionMinutes = sessionStart 
          ? Math.round((Date.now() - sessionStart) / 60000)
          : 0;

        return {
          user,
          sessionMinutes,
          activeMinutes: Math.round(activeTime / 60000),
          idleMinutes: Math.round(idleTime / 60000),
          activityPercent,
          status: user.status || (user.isOnline ? 'online' : 'offline'),
        };
      })
      .sort((a, b) => {
        // Sort: on_call > online > idle > offline
        const statusOrder = { on_call: 0, online: 1, idle: 2, offline: 3 };
        const orderA = statusOrder[a.status as keyof typeof statusOrder] ?? 4;
        const orderB = statusOrder[b.status as keyof typeof statusOrder] ?? 4;
        if (orderA !== orderB) return orderA - orderB;
        return b.activityPercent - a.activityPercent;
      });
  }, [allUsers]);

  const idleAlerts = staffStats.filter(s => 
    s.status === 'idle' && s.idleMinutes > 10
  );

  const avgActivity = staffStats.length > 0
    ? Math.round(staffStats.reduce((sum, s) => sum + s.activityPercent, 0) / staffStats.length)
    : 0;

  const totalOnlineMinutes = staffStats
    .filter(s => s.status !== 'offline')
    .reduce((sum, s) => sum + s.sessionMinutes, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Онлайн</span>
            </div>
            <div className="text-2xl font-bold mt-1">{onlineCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Ср. активность</span>
            </div>
            <div className="text-2xl font-bold mt-1 flex items-center gap-1">
              {avgActivity}%
              {avgActivity >= 80 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : avgActivity < 60 ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : null}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Общее время</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {formatDuration(totalOnlineMinutes * 60)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">На звонках</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {staffStats.filter(s => s.status === 'on_call').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Idle Alerts */}
      {idleAlerts.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="w-4 h-4" />
              Внимание: длительная неактивность
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {idleAlerts.map(alert => (
                <div key={alert.user.id} className="text-sm flex items-center justify-between">
                  <span>{alert.user.name}</span>
                  <span className="text-muted-foreground">
                    Неактивен {alert.idleMinutes} мин
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Активность команды сегодня</CardTitle>
        </CardHeader>
        <CardContent>
          {staffStats.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Нет данных о сотрудниках
            </div>
          ) : (
            <div className="divide-y divide-border">
              {staffStats.map(stats => (
                <StaffRow key={stats.user.id} stats={stats} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffAnalyticsPanel;
