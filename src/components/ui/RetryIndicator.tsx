import { RotateCcw, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type RetryStatus = 'idle' | 'retrying' | 'success' | 'failed';

interface RetryIndicatorProps {
  /** Current retry status */
  status: RetryStatus;
  /** Current retry attempt number */
  currentAttempt?: number;
  /** Maximum retry attempts */
  maxAttempts?: number;
  /** Whether the indicator is visible */
  visible?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show as inline badge */
  inline?: boolean;
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const containerSizeClasses = {
  sm: 'text-[10px] px-1 py-0.5',
  md: 'text-xs px-1.5 py-1',
  lg: 'text-sm px-2 py-1.5',
};

/**
 * RetryIndicator - Shows the current status of API request retries
 * 
 * Used to indicate when the system is automatically retrying a failed request
 * with exponential backoff.
 */
export const RetryIndicator = ({
  status,
  currentAttempt = 0,
  maxAttempts = 3,
  visible = true,
  className,
  size = 'sm',
  inline = true,
}: RetryIndicatorProps) => {
  if (!visible || status === 'idle') {
    return null;
  }

  const iconClass = sizeClasses[size];

  const getStatusConfig = () => {
    switch (status) {
      case 'retrying':
        return {
          icon: <Loader2 className={cn(iconClass, 'animate-spin')} />,
          label: `Повтор ${currentAttempt}/${maxAttempts}`,
          bgColor: 'bg-amber-100 dark:bg-amber-900/30',
          textColor: 'text-amber-700 dark:text-amber-300',
          tooltip: `Автоматический повтор запроса (попытка ${currentAttempt} из ${maxAttempts})`,
        };
      case 'success':
        return {
          icon: <CheckCircle className={iconClass} />,
          label: 'Успешно',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          textColor: 'text-green-700 dark:text-green-300',
          tooltip: currentAttempt > 1 
            ? `Успешно после ${currentAttempt} попыток` 
            : 'Запрос выполнен успешно',
        };
      case 'failed':
        return {
          icon: <AlertTriangle className={iconClass} />,
          label: `Ошибка (${currentAttempt}/${maxAttempts})`,
          bgColor: 'bg-destructive/10',
          textColor: 'text-destructive',
          tooltip: `Не удалось выполнить запрос после ${currentAttempt} попыток`,
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  if (inline) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded font-medium",
              containerSizeClasses[size],
              config.bgColor,
              config.textColor,
              className
            )}
          >
            {config.icon}
            <span>{config.label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {config.tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Non-inline variant - just icon with tooltip
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full p-1",
            config.bgColor,
            config.textColor,
            className
          )}
        >
          {config.icon}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{config.label}</span>
          <span className="text-muted-foreground">{config.tooltip}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

/**
 * Floating retry indicator that can be positioned absolutely
 */
export const FloatingRetryIndicator = ({
  status,
  currentAttempt = 0,
  maxAttempts = 3,
  visible = true,
  className,
  position = 'top-right',
}: RetryIndicatorProps & {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}) => {
  const positionClasses = {
    'top-right': 'top-0 right-0 -translate-y-1/2 translate-x-1/2',
    'top-left': 'top-0 left-0 -translate-y-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-0 right-0 translate-y-1/2 translate-x-1/2',
    'bottom-left': 'bottom-0 left-0 translate-y-1/2 -translate-x-1/2',
  };

  if (!visible || status === 'idle') {
    return null;
  }

  return (
    <div className={cn('absolute z-10', positionClasses[position])}>
      <RetryIndicator
        status={status}
        currentAttempt={currentAttempt}
        maxAttempts={maxAttempts}
        inline={false}
        className={className}
      />
    </div>
  );
};
