import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ConnectionStatus } from '@/hooks/useOrganizationRealtimeMessages';

interface RealtimeStatusIndicatorProps {
  status: ConnectionStatus;
  className?: string;
}

const statusConfig: Record<ConnectionStatus, {
  icon: typeof Wifi;
  color: string;
  label: string;
  animate?: boolean;
}> = {
  connecting: {
    icon: Wifi,
    color: 'text-yellow-500',
    label: 'Подключение...',
    animate: true,
  },
  connected: {
    icon: Wifi,
    color: 'text-green-500',
    label: 'Realtime подключён',
  },
  disconnected: {
    icon: WifiOff,
    color: 'text-red-500',
    label: 'Нет соединения',
  },
  polling: {
    icon: RefreshCw,
    color: 'text-blue-500',
    label: 'Режим polling (обновление каждые 10с)',
    animate: true,
  },
  reconnecting: {
    icon: RefreshCw,
    color: 'text-orange-500',
    label: 'Переподключение...',
    animate: true,
  },
};

export function RealtimeStatusIndicator({ status, className }: RealtimeStatusIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1', className)}>
            <Icon 
              className={cn(
                'h-4 w-4',
                config.color,
                config.animate && (status === 'polling' || status === 'reconnecting') && 'animate-spin',
                config.animate && status === 'connecting' && 'animate-pulse'
              )} 
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
