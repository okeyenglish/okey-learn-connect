import React, { useState, useEffect } from 'react';
import { Circle, Phone, Clock, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useActivityTracker, ActivityStatus } from '@/hooks/useActivityTracker';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  pulse?: boolean;
}

const STATUS_CONFIG: Record<ActivityStatus, StatusConfig> = {
  online: {
    label: 'Онлайн',
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    icon: <Circle className="h-2.5 w-2.5 fill-current" />,
  },
  on_call: {
    label: 'На звонке',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    icon: <Phone className="h-2.5 w-2.5" />,
    pulse: true,
  },
  idle: {
    label: 'Неактивен',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
    icon: <Clock className="h-2.5 w-2.5" />,
  },
  offline: {
    label: 'Оффлайн',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted-foreground',
    icon: <Circle className="h-2.5 w-2.5" />,
  },
};

// Format milliseconds to human-readable time
const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}ч ${remainingMinutes}м`;
  }
  if (minutes > 0) {
    return `${minutes}м`;
  }
  return `${seconds}с`;
};

// Format time since last activity
const formatLastActivity = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'только что';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
  return `${Math.floor(diff / 3600000)} ч. назад`;
};

interface StaffActivityIndicatorProps {
  isOnCall?: boolean;
  className?: string;
  compact?: boolean;
}

export const StaffActivityIndicator: React.FC<StaffActivityIndicatorProps> = ({
  isOnCall = false,
  className,
  compact = false,
}) => {
  const {
    status,
    lastActivity,
    sessionStart,
    sessionDuration,
    activeTime,
    idleTime,
    activityPercentage,
    isIdle,
  } = useActivityTracker(isOnCall);

  // Persist session data to database
  const currentIdleStreak = isIdle ? Date.now() - lastActivity : 0;
  useSessionPersistence(
    sessionStart,
    activeTime,
    idleTime,
    0, // onCallTime - будет добавлено при интеграции с телефонией
    isIdle,
    currentIdleStreak
  );

  // Force re-render every minute to update timer
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const config = STATUS_CONFIG[status];

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md cursor-default',
                'bg-muted/50 hover:bg-muted transition-colors',
                className
              )}
            >
              <span
                className={cn(
                  config.color,
                  config.pulse && 'animate-pulse'
                )}
              >
                {config.icon}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDuration(sessionDuration)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="w-64">
            <TooltipContentBody
              status={status}
              config={config}
              sessionDuration={sessionDuration}
              activeTime={activeTime}
              idleTime={idleTime}
              activityPercentage={activityPercentage}
              lastActivity={lastActivity}
            />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-3 px-3 py-1.5 rounded-lg cursor-default',
              'bg-muted/50 hover:bg-muted transition-colors border',
              className
            )}
          >
            {/* Status indicator */}
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  config.color,
                  config.pulse && 'animate-pulse'
                )}
              >
                {config.icon}
              </span>
              <span className={cn('text-sm font-medium', config.color)}>
                {config.label}
              </span>
            </div>

            {/* Separator */}
            <div className="w-px h-4 bg-border" />

            {/* Session timer */}
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {formatDuration(sessionDuration)}
              </span>
            </div>

            {/* Separator */}
            <div className="w-px h-4 bg-border" />

            {/* Activity percentage */}
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span
                className={cn(
                  'text-sm font-medium',
                  activityPercentage >= 80 ? 'text-green-600' :
                  activityPercentage >= 60 ? 'text-yellow-600' :
                  'text-red-600'
                )}
              >
                {activityPercentage}%
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-64">
          <TooltipContentBody
            status={status}
            config={config}
            sessionDuration={sessionDuration}
            activeTime={activeTime}
            idleTime={idleTime}
            activityPercentage={activityPercentage}
            lastActivity={lastActivity}
          />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface TooltipContentBodyProps {
  status: ActivityStatus;
  config: StatusConfig;
  sessionDuration: number;
  activeTime: number;
  idleTime: number;
  activityPercentage: number;
  lastActivity: number;
}

const TooltipContentBody: React.FC<TooltipContentBodyProps> = ({
  status,
  config,
  sessionDuration,
  activeTime,
  idleTime,
  activityPercentage,
  lastActivity,
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 pb-2 border-b">
      <span className={config.color}>{config.icon}</span>
      <span className="font-medium">{config.label}</span>
    </div>

    <div className="space-y-1 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Сессия:</span>
        <span className="font-medium">{formatDuration(sessionDuration)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">├─ Активно:</span>
        <span className="text-green-600">
          {formatDuration(activeTime)} ({activityPercentage}%)
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">└─ Неактивно:</span>
        <span className="text-yellow-600">{formatDuration(idleTime)}</span>
      </div>
    </div>

    <div className="pt-2 border-t text-xs text-muted-foreground">
      Последняя активность: {formatLastActivity(lastActivity)}
    </div>

    {/* Progress bar */}
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={cn(
          'h-full transition-all duration-300',
          activityPercentage >= 80 ? 'bg-green-500' :
          activityPercentage >= 60 ? 'bg-yellow-500' :
          'bg-red-500'
        )}
        style={{ width: `${activityPercentage}%` }}
      />
    </div>
  </div>
);

export default StaffActivityIndicator;
