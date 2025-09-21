import { Check, CheckCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  
  // If no one read it yet, show "1" with author avatar
  if (readCount === 0) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Avatar className="h-4 w-4">
          <AvatarImage src={authorAvatar} alt={authorName} />
          <AvatarFallback className="text-[8px] bg-muted">
            {authorName?.charAt(0)?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs text-muted-foreground font-medium">1</span>
      </div>
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