import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Medal,
  Clock,
  Activity,
  Building2
} from 'lucide-react';
import { useStaffOnlinePresence, OnlineUser } from '@/hooks/useStaffOnlinePresence';
import { usePersistedBranch } from '@/hooks/usePersistedBranch';
import { cn } from '@/lib/utils';

interface StaffMetrics {
  user: OnlineUser;
  rank: number;
  sessionMinutes: number;
  activeMinutes: number;
  idleMinutes: number;
  activityPercent: number;
  callsCount: number;
  status: 'online' | 'idle' | 'on_call' | 'offline';
}

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}ч ${mins}м`;
  }
  return `${mins}м`;
};

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  if (rank === 1) {
    return (
      <div className="flex items-center gap-1">
        <Trophy className="w-4 h-4 text-yellow-500" />
        <span className="font-bold text-yellow-600">1</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center gap-1">
        <Medal className="w-4 h-4 text-gray-400" />
        <span className="font-semibold text-gray-500">2</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center gap-1">
        <Medal className="w-4 h-4 text-amber-600" />
        <span className="font-semibold text-amber-700">3</span>
      </div>
    );
  }
  return <span className="text-muted-foreground">{rank}</span>;
};

const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  const config = {
    online: { color: 'bg-green-500', label: 'Онлайн' },
    on_call: { color: 'bg-blue-500 animate-pulse', label: 'На звонке' },
    idle: { color: 'bg-yellow-500', label: 'Неактивен' },
    offline: { color: 'bg-gray-400', label: 'Оффлайн' },
  };

  const { color, label } = config[status as keyof typeof config] || config.offline;

  return (
    <div className="flex items-center gap-2">
      <div className={cn('w-2 h-2 rounded-full', color)} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
};

const TrendIndicator: React.FC<{ value: number; threshold: number }> = ({ value, threshold }) => {
  if (value >= threshold + 10) {
    return <TrendingUp className="w-4 h-4 text-green-500" />;
  }
  if (value < threshold - 10) {
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  }
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

export const StaffComparisonTable: React.FC = () => {
  const { allUsers } = useStaffOnlinePresence();
  const { selectedBranch, setSelectedBranch } = usePersistedBranch('all');

  // Extract unique branches from users
  const availableBranches = useMemo(() => {
    const branches = new Set<string>();
    allUsers.forEach(user => {
      if (user.branch) branches.add(user.branch);
    });
    return Array.from(branches).sort();
  }, [allUsers]);

  const staffMetrics = useMemo<StaffMetrics[]>(() => {
    const filteredUsers = selectedBranch === 'all' 
      ? allUsers 
      : allUsers.filter(u => u.branch === selectedBranch);

    const metrics = filteredUsers
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
          rank: 0,
          sessionMinutes,
          activeMinutes: Math.round(activeTime / 60000),
          idleMinutes: Math.round(idleTime / 60000),
          activityPercent,
          callsCount: 0, // TODO: integrate with call logs
          status: (user.status || (user.isOnline ? 'online' : 'offline')) as StaffMetrics['status'],
        };
      })
      // Sort by activity percent, then by session time
      .sort((a, b) => {
        if (b.activityPercent !== a.activityPercent) {
          return b.activityPercent - a.activityPercent;
        }
        return b.sessionMinutes - a.sessionMinutes;
      });

    // Assign ranks
    return metrics.map((m, index) => ({ ...m, rank: index + 1 }));
  }, [allUsers, selectedBranch]);

  const avgActivity = staffMetrics.length > 0
    ? Math.round(staffMetrics.reduce((sum, s) => sum + s.activityPercent, 0) / staffMetrics.length)
    : 0;

  if (staffMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Рейтинг сотрудников
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Нет данных о сотрудниках для сравнения
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Рейтинг сотрудников по активности
        </CardTitle>
        
        {/* Branch Filter */}
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
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Сотрудник</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Время</span>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Activity className="w-4 h-4" />
                  <span>Активность</span>
                </div>
              </TableHead>
              <TableHead className="text-center">Тренд</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffMetrics.map((staff) => (
              <TableRow 
                key={staff.user.id}
                className={cn(
                  staff.rank <= 3 && 'bg-muted/30',
                  staff.status === 'offline' && 'opacity-60'
                )}
              >
                <TableCell>
                  <RankBadge rank={staff.rank} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {staff.user.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="font-medium">{staff.user.name || 'Без имени'}</div>
                      {staff.idleMinutes > 10 && staff.status === 'idle' && (
                        <div className="text-xs text-yellow-600">
                          Неактивен {staff.idleMinutes} мин
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusIndicator status={staff.status} />
                </TableCell>
                <TableCell className="text-center">
                  <span className={cn(
                    'font-medium',
                    staff.sessionMinutes < 30 && staff.status !== 'offline' && 'text-yellow-600'
                  )}>
                    {staff.sessionMinutes > 0 ? formatDuration(staff.sessionMinutes) : '—'}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant={staff.activityPercent >= 80 ? 'default' : staff.activityPercent >= 60 ? 'secondary' : 'destructive'}
                    className={cn(
                      staff.activityPercent >= 80 && 'bg-green-500 hover:bg-green-600',
                      staff.activityPercent >= 60 && staff.activityPercent < 80 && 'bg-yellow-500 hover:bg-yellow-600 text-black'
                    )}
                  >
                    {staff.activityPercent}%
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <TrendIndicator value={staff.activityPercent} threshold={avgActivity} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Summary footer */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
          <span>Средняя активность команды: <strong className="text-foreground">{avgActivity}%</strong></span>
          <span>Всего сотрудников: <strong className="text-foreground">{staffMetrics.length}</strong></span>
        </div>
      </CardContent>
    </Card>
  );
};

export default StaffComparisonTable;
