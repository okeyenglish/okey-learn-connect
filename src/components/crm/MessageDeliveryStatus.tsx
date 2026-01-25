import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

interface MessageDeliveryStatusProps {
  status?: DeliveryStatus;
  className?: string;
}

const statusConfig: Record<DeliveryStatus, { 
  icon: React.ReactNode; 
  label: string; 
  colorClass: string;
}> = {
  queued: {
    icon: <Clock className="h-3 w-3" />,
    label: 'В очереди',
    colorClass: 'text-muted-foreground/50'
  },
  sent: {
    icon: <Check className="h-3 w-3" />,
    label: 'Отправлено',
    colorClass: 'text-muted-foreground/60'
  },
  delivered: {
    icon: <CheckCheck className="h-3 w-3" />,
    label: 'Доставлено',
    colorClass: 'text-muted-foreground/70'
  },
  read: {
    icon: <CheckCheck className="h-3 w-3" />,
    label: 'Прочитано',
    colorClass: 'text-blue-500'
  },
  failed: {
    icon: <AlertCircle className="h-3 w-3" />,
    label: 'Ошибка доставки',
    colorClass: 'text-destructive'
  }
};

export const MessageDeliveryStatus = ({ 
  status = 'sent',
  className = "" 
}: MessageDeliveryStatusProps) => {
  const config = statusConfig[status] || statusConfig.sent;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex items-center", config.colorClass, className)}>
          {config.icon}
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        {config.label}
      </TooltipContent>
    </Tooltip>
  );
};
