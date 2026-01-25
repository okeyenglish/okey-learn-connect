import { Check, CheckCheck, Clock, AlertCircle, RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";

export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

interface MessageDeliveryStatusProps {
  status?: DeliveryStatus;
  className?: string;
  onRetry?: () => void;
  showRetryButton?: boolean;
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
  showRetryButton = true
}: MessageDeliveryStatusProps) => {
  const config = statusConfig[status] || statusConfig.sent;
  const [isAnimating, setIsAnimating] = useState(false);
  const prevStatusRef = useRef(status);

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
          {config.label}
        </TooltipContent>
      </Tooltip>
      
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
