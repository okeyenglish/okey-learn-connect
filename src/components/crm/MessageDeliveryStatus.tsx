import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";

export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

interface MessageDeliveryStatusProps {
  status?: DeliveryStatus;
  className?: string;
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
  className = "" 
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

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span 
          className={cn(
            "inline-flex items-center transition-colors duration-300 ease-out",
            config.colorClass, 
            className
          )}
        >
          <StatusIcon status={status} isAnimating={isAnimating} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        {config.label}
      </TooltipContent>
    </Tooltip>
  );
};
