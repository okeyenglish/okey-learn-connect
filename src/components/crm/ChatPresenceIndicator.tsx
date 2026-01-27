import React from 'react';
import { Eye, Phone, Users } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { PresenceInfo, PresenceType } from '@/hooks/useChatPresence';

interface ChatPresenceIndicatorProps {
  presence: PresenceInfo | null | undefined;
  compact?: boolean;
}

const getPresenceIcon = (type: PresenceType) => {
  switch (type) {
    case 'on_call':
      return <Phone className="h-3 w-3 text-green-500 animate-pulse" />;
    case 'viewing':
    default:
      return <Eye className="h-3 w-3 text-blue-500" />;
  }
};

const getPresenceColor = (type: PresenceType) => {
  switch (type) {
    case 'on_call':
      return 'bg-green-100 border-green-300 dark:bg-green-950/50 dark:border-green-700';
    case 'viewing':
    default:
      return 'bg-blue-100 border-blue-300 dark:bg-blue-950/50 dark:border-blue-700';
  }
};

export const ChatPresenceIndicator: React.FC<ChatPresenceIndicatorProps> = ({
  presence,
  compact = false,
}) => {
  if (!presence || presence.viewers.length === 0) {
    return null;
  }

  const { viewers } = presence;
  const hasCall = viewers.some(v => v.type === 'on_call');
  const primaryViewer = viewers[0];
  const additionalCount = viewers.length - 1;

  // Determine main icon based on presence types
  const mainIcon = hasCall ? (
    <Phone className="h-3 w-3 text-green-500 animate-pulse" />
  ) : (
    <Eye className="h-3 w-3 text-blue-500" />
  );

  const containerClass = hasCall
    ? 'bg-green-100 border-green-300 dark:bg-green-950/50 dark:border-green-700'
    : 'bg-blue-100 border-blue-300 dark:bg-blue-950/50 dark:border-blue-700';

  const tooltipContent = (
    <div className="space-y-1.5 p-1">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        {hasCall ? '📞 На связи:' : '👀 Сейчас смотрят:'}
      </p>
      {viewers.map((viewer, idx) => (
        <div key={viewer.userId} className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            {viewer.avatarUrl && <AvatarImage src={viewer.avatarUrl} alt={viewer.name} />}
            <AvatarFallback className="text-[8px] bg-primary/10">
              {viewer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs flex items-center gap-1">
            {viewer.name}
            {viewer.type === 'on_call' && (
              <Phone className="h-3 w-3 text-green-500 ml-1" />
            )}
          </span>
        </div>
      ))}
    </div>
  );

  if (compact) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border ${containerClass} cursor-default`}>
              {mainIcon}
              {additionalCount > 0 && (
                <span className="text-[10px] font-medium text-muted-foreground ml-0.5">
                  +{additionalCount}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full border ${containerClass} cursor-default`}>
            {/* Show first viewer's avatar */}
            <Avatar className="h-4 w-4">
              {primaryViewer.avatarUrl && (
                <AvatarImage src={primaryViewer.avatarUrl} alt={primaryViewer.name} />
              )}
              <AvatarFallback className="text-[7px] bg-primary/10">
                {primaryViewer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {mainIcon}
            
            {additionalCount > 0 && (
              <div className="flex items-center gap-0.5">
                <Users className="h-2.5 w-2.5 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground">
                  +{additionalCount}
                </span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ChatPresenceIndicator;
