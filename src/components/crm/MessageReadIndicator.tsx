import { Check, CheckCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { useMessageReadStatus } from "@/hooks/useMessageReadStatus";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface MessageReadIndicatorProps {
  messageId: string;
  isOutgoing: boolean;
  authorName?: string;
  authorAvatar?: string;
  className?: string;
}

export const MessageReadIndicator = ({ 
  messageId, 
  isOutgoing,
  authorName,
  authorAvatar,
  className = "" 
}: MessageReadIndicatorProps) => {
  const { data: readStatuses, isLoading } = useMessageReadStatus(messageId);
  
  // Only show read indicators for messages that have an ID
  if (!messageId || isLoading) {
    return null;
  }

  const readCount = readStatuses?.length || 0;
  
  // If no one has read it yet
  if (readCount === 0) {
    // For outgoing messages, show a single check (sent)
    if (isOutgoing) {
      return (
        <div className={`flex items-center gap-0.5 ${className}`}>
          <Check className="h-3 w-3 text-muted-foreground" />
        </div>
      );
    }
    // For incoming messages, don't show anything until someone reads it
    return null;
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
          <CheckCheck className="h-3 w-3 text-primary" />
          {readCount > 1 && (
            <span className="text-xs text-primary font-medium">
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