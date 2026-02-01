import { Clock, Phone, MessageSquare, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useTodayCallsCount } from '@/hooks/useTodayCallsCount';
import { useTodayMessagesCount } from '@/hooks/useTodayMessagesCount';
import { cn } from '@/lib/utils';

interface WorkdayPreviewWidgetProps {
  onClick: () => void;
  className?: string;
}

/**
 * Compact workday preview widget showing:
 * - Active work time
 * - Calls count today
 * - Messages sent today
 * - Activity percentage
 */
export function WorkdayPreviewWidget({ onClick, className }: WorkdayPreviewWidgetProps) {
  const { activeTime, activityPercentage } = useActivityTracker();
  const { callsCount, incomingCalls, outgoingCalls, isLoading: callsLoading } = useTodayCallsCount();
  const { messagesCount, isLoading: messagesLoading } = useTodayMessagesCount();

  // Format active time
  const formatTime = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}ч ${minutes}м`;
    }
    return `${minutes}м`;
  };

  // Get activity color based on percentage
  const getActivityColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Get activity indicator
  const getActivityIndicator = (percentage: number) => {
    if (percentage >= 80) return '🟢';
    if (percentage >= 60) return '🟡';
    return '🔴';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              'flex items-center gap-1.5 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg',
              'bg-muted/50 hover:bg-muted transition-colors cursor-pointer',
              'text-sm border border-border/50',
              className
            )}
          >
            {/* Activity Indicator + Time */}
            <div className="flex items-center gap-1">
              <span className="text-xs">{getActivityIndicator(activityPercentage)}</span>
              <Clock className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              <span className="font-medium text-xs sm:text-sm">{formatTime(activeTime)}</span>
            </div>

            <span className="text-muted-foreground/50 hidden sm:inline">│</span>

            {/* Calls */}
            <div className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-medium text-xs sm:text-sm">
                {callsLoading ? '...' : callsCount}
              </span>
            </div>

            <span className="text-muted-foreground/50 hidden sm:inline">│</span>

            {/* Messages */}
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
              <span className="font-medium text-xs sm:text-sm">
                {messagesLoading ? '...' : messagesCount}
              </span>
            </div>

            <span className="text-muted-foreground/50 hidden sm:inline">│</span>

            {/* Activity Percentage */}
            <div className="flex items-center gap-1">
              <Zap className={cn('h-3.5 w-3.5', getActivityColor(activityPercentage))} />
              <span className={cn('font-medium text-xs sm:text-sm', getActivityColor(activityPercentage))}>
                {activityPercentage}%
              </span>
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 py-1">
            <p className="font-semibold text-sm">Статистика за сегодня</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">Активное время:</span>
              <span className="font-medium">{formatTime(activeTime)}</span>
              
              <span className="text-muted-foreground">Звонки:</span>
              <span className="font-medium">
                {callsCount} (↓{incomingCalls} ↑{outgoingCalls})
              </span>
              
              <span className="text-muted-foreground">Сообщения:</span>
              <span className="font-medium">{messagesCount}</span>
              
              <span className="text-muted-foreground">Активность:</span>
              <span className={cn('font-medium', getActivityColor(activityPercentage))}>
                {activityPercentage}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground pt-1 border-t">
              Нажмите для открытия полного дашборда
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default WorkdayPreviewWidget;
