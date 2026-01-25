import { Check, CheckCheck, Clock, AlertCircle, RotateCcw, Timer } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import { useRetryCountdown } from "@/hooks/useRetryCountdown";
import { MAX_RETRY_ATTEMPTS, getRetryCountFromMetadata } from "@/hooks/useAutoRetryMessages";

export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

interface MessageDeliveryStatusProps {
  status?: DeliveryStatus;
  className?: string;
  onRetry?: () => void;
  showRetryButton?: boolean;
  messageId?: string;
  retryCount?: number;
  metadata?: Record<string, unknown> | null;
}

const statusConfig: Record<DeliveryStatus, { 
  label: string; 
  colorClass: string;
}> = {
  queued: {
    label: 'В очереди',
    colorClass: 'text-muted-foreground/50'
  },
  sent: {
    label: 'Отправлено',
    colorClass: 'text-muted-foreground/60'
  },
  delivered: {
    label: 'Доставлено',
    colorClass: 'text-muted-foreground/70'
  },
  read: {
    label: 'Прочитано',
    colorClass: 'text-primary'
  },
  failed: {
    label: 'Ошибка доставки',
    colorClass: 'text-destructive'
  }
};

// Status icons as separate components for animation
const StatusIcon = ({ status, isAnimating }: { status: DeliveryStatus; isAnimating: boolean }) => {
  const baseClasses = "h-3 w-3 transition-all duration-300 ease-out";
  const animationClasses = isAnimating ? "animate-status-pop" : "";
  
  switch (status) {
    case 'queued':
      return <Clock className={cn(baseClasses, animationClasses)} />;
    case 'sent':
      return <Check className={cn(baseClasses, animationClasses)} />;
    case 'delivered':
      return <CheckCheck className={cn(baseClasses, animationClasses)} />;
    case 'read':
      return <CheckCheck className={cn(baseClasses, animationClasses)} />;
    case 'failed':
      return <AlertCircle className={cn(baseClasses, animationClasses)} />;
    default:
      return <Check className={cn(baseClasses, animationClasses)} />;
  }
};

export const MessageDeliveryStatus = ({ 
  status = 'sent',
  className = "",
  onRetry,
  showRetryButton = true,
  messageId,
  retryCount: propRetryCount,
  metadata
}: MessageDeliveryStatusProps) => {
  const config = statusConfig[status] || statusConfig.sent;
  const [isAnimating, setIsAnimating] = useState(false);
  const prevStatusRef = useRef(status);
  
  // Get countdown from hook
  const countdownSeconds = useRetryCountdown(messageId);
  
  // Get retry count from props or metadata
  const retryCount = propRetryCount ?? getRetryCountFromMetadata(metadata || null);
  const maxRetriesReached = retryCount >= MAX_RETRY_ATTEMPTS;

  // Trigger animation when status changes
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      prevStatusRef.current = status;
      return () => clearTimeout(timer);
    }
  }, [status]);

  const isFailed = status === 'failed';

  // Format countdown display
  const formatCountdown = (seconds: number) => {
    return `${seconds}с`;
  };

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            className={cn(
              "inline-flex items-center transition-colors duration-300 ease-out",
              config.colorClass
            )}
          >
            <StatusIcon status={status} isAnimating={isAnimating} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          <div className="flex flex-col gap-0.5">
            <span>{config.label}</span>
            {isFailed && retryCount > 0 && (
              <span className="text-muted-foreground">
                Попытка {retryCount}/{MAX_RETRY_ATTEMPTS}
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
      
      {/* Countdown timer for scheduled auto-retry */}
      {isFailed && countdownSeconds !== null && countdownSeconds > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span 
              className={cn(
                "inline-flex items-center gap-0.5",
                "text-[10px] font-medium tabular-nums",
                "text-amber-600 dark:text-amber-400",
                "bg-amber-100 dark:bg-amber-900/30",
                "px-1 py-0.5 rounded",
                "animate-pulse"
              )}
            >
              <Timer className="h-2.5 w-2.5" />
              {formatCountdown(countdownSeconds)}
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            <div className="flex flex-col gap-0.5">
              <span>Автоповтор через {countdownSeconds} сек</span>
              <span className="text-muted-foreground">
                Попытка {retryCount + 1} из {MAX_RETRY_ATTEMPTS}
              </span>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
      
      {/* Max retries reached indicator */}
      {isFailed && maxRetriesReached && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span 
              className={cn(
                "inline-flex items-center gap-0.5",
                "text-[10px] font-medium",
                "text-destructive/70",
                "bg-destructive/10",
                "px-1 py-0.5 rounded"
              )}
            >
              {retryCount}/{MAX_RETRY_ATTEMPTS}
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Все попытки исчерпаны. Отправьте вручную.
          </TooltipContent>
        </Tooltip>
      )}
      
      {/* Retry button for failed messages */}
      {isFailed && showRetryButton && onRetry && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              className={cn(
                "inline-flex items-center justify-center",
                "h-4 w-4 rounded-full",
                "bg-destructive/10 hover:bg-destructive/20",
                "text-destructive hover:text-destructive",
                "transition-all duration-200",
                "hover:scale-110 active:scale-95",
                "focus:outline-none focus:ring-2 focus:ring-destructive/30"
              )}
              aria-label="Отправить повторно"
            >
              <RotateCcw className="h-2.5 w-2.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Отправить повторно
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
