import { Check, CheckCheck, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMessageReadStatus } from "@/hooks/useMessageReadStatus";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface MessageReadIndicatorProps {
  messageId: string;
  isOutgoing: boolean;
  className?: string;
}

export const MessageReadIndicator = ({ 
  messageId, 
  isOutgoing, 
  className = "" 
}: MessageReadIndicatorProps) => {
  const { data: readStatuses, isLoading } = useMessageReadStatus(messageId);
  
  // Only show read indicators for outgoing messages
  if (!isOutgoing || isLoading) {
    return null;
  }

  const readCount = readStatuses?.length || 0;
  
  // If no one read it yet, show single gray check
  if (readCount === 0) {
    return (
      <Check className={`h-3 w-3 text-muted-foreground ${className}`} />
    );
  }

  // If people read it, show double blue checks with tooltip
  const tooltipContent = (
    <div className="space-y-1 max-w-xs">
      <p className="font-medium text-xs">Прочитано:</p>
      {readStatuses?.map((status) => (
        <div key={status.user_id} className="flex items-center justify-between gap-2 text-xs">
          <span>{status.user_name}</span>
          <span className="text-muted-foreground">
            {format(new Date(status.read_at), 'HH:mm', { locale: ru })}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-0.5 ${className}`}>
          <CheckCheck className="h-3 w-3 text-blue-500" />
          {readCount > 1 && (
            <span className="text-xs text-blue-500 font-medium">
              {readCount}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
};