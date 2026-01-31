import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Circle, Phone, Clock, Users, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStaffOnlinePresence, OnlineUser, formatLastSeen } from '@/hooks/useStaffOnlinePresence';
import { ActivityStatus } from '@/hooks/useActivityTracker';

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  pulse?: boolean;
}

const STATUS_CONFIG: Record<ActivityStatus | 'offline', StatusConfig> = {
  online: {
    label: 'Онлайн',
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    icon: <Circle className="h-2 w-2 fill-current" />,
  },
  on_call: {
    label: 'На звонке',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    icon: <Phone className="h-2 w-2" />,
    pulse: true,
  },
  idle: {
    label: 'Неактивен',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
    icon: <Clock className="h-2 w-2" />,
  },
  offline: {
    label: 'Оффлайн',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted-foreground',
    icon: <Circle className="h-2 w-2" />,
  },
};

const formatDuration = (ms: number): string => {
  if (!ms) return '—';
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}ч ${remainingMinutes}м`;
  }
  return `${minutes}м`;
};

const IDLE_ALERT_THRESHOLD = 10 * 60 * 1000; // 10 minutes

interface StaffMemberRowProps {
  user: OnlineUser;
}

const StaffMemberRow: React.FC<StaffMemberRowProps> = ({ user }) => {
  const status = user.status || (user.isOnline ? 'online' : 'offline');
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.offline;
  
  const isIdleAlert = status === 'idle' && 
    user.lastSeen && 
    (Date.now() - user.lastSeen) > IDLE_ALERT_THRESHOLD;

  const sessionDuration = user.sessionStart ? Date.now() - user.sessionStart : 0;
  const activityPercent = user.activityPercentage ?? 100;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
        isIdleAlert ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border bg-card'
      )}
    >
      {/* Avatar with status indicator */}
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
          <AvatarFallback>
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background flex items-center justify-center',
            config.bgColor,
            config.pulse && 'animate-pulse'
          )}
        >
          {config.icon}
        </span>
      </div>

      {/* Name and status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{user.name}</span>
          {isIdleAlert && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent>
                  Неактивен более 10 минут
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={config.color}>{config.label}</span>
          {user.isOnline && user.lastSeen && status !== 'online' && (
            <span>• {formatLastSeen(user.lastSeen)}</span>
          )}
          {!user.isOnline && user.lastSeen && (
            <span>• {formatLastSeen(user.lastSeen)}</span>
          )}
        </div>
      </div>

      {/* Stats */}
      {user.isOnline && (
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="text-muted-foreground text-xs">Онлайн</div>
            <div className="font-medium">{formatDuration(sessionDuration)}</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground text-xs">Акт%</div>
            <div
              className={cn(
                'font-medium',
                activityPercent >= 80 ? 'text-green-600' :
                activityPercent >= 60 ? 'text-yellow-600' :
                'text-red-600'
              )}
            >
              {activityPercent}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const StaffActivityDashboard: React.FC = () => {
  const { allUsers, onlineCount } = useStaffOnlinePresence();
  const [, setTick] = useState(0);

  // Force re-render every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Sort: online first (by activity), then idle, then offline (by lastSeen)
  const sortedUsers = [...allUsers].sort((a, b) => {
    const statusOrder = { on_call: 0, online: 1, idle: 2, offline: 3 };
    const aStatus = a.status || (a.isOnline ? 'online' : 'offline');
    const bStatus = b.status || (b.isOnline ? 'online' : 'offline');
    const aOrder = statusOrder[aStatus as keyof typeof statusOrder] ?? 3;
    const bOrder = statusOrder[bStatus as keyof typeof statusOrder] ?? 3;
    
    if (aOrder !== bOrder) return aOrder - bOrder;
    
    // Within same status, sort by activity percentage or last seen
    if (a.isOnline && b.isOnline) {
      return (b.activityPercentage ?? 0) - (a.activityPercentage ?? 0);
    }
    return (b.lastSeen ?? 0) - (a.lastSeen ?? 0);
  });

  const idleAlerts = sortedUsers.filter(u => 
    u.status === 'idle' && 
    u.lastSeen && 
    (Date.now() - u.lastSeen) > IDLE_ALERT_THRESHOLD
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Активность команды
          </CardTitle>
          <Badge variant="secondary">
            {onlineCount} онлайн
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Alerts */}
        {idleAlerts.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-500">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">
                {idleAlerts.length === 1 
                  ? `${idleAlerts[0].name} неактивен более 10 минут`
                  : `${idleAlerts.length} сотрудников неактивны более 10 минут`
                }
              </span>
            </div>
          </div>
        )}

        {/* Staff list */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 pr-4">
            {sortedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Нет данных о сотрудниках
              </div>
            ) : (
              sortedUsers.map(user => (
                <StaffMemberRow key={user.id} user={user} />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default StaffActivityDashboard;
