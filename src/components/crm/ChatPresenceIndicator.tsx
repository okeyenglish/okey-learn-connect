import React from 'react';
import { Phone, Users } from 'lucide-react';
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

// Animated reading eyes component - emoji style 👀 with blinking
const ReadingEyes: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-[2px] ${className}`}>
    {/* Left eye - oval shape like 👀 */}
    <div className="relative w-[9px] h-[11px] rounded-[45%] bg-white border border-slate-300 overflow-hidden shadow-sm animate-blink origin-center">
      {/* Black pupil */}
      <div 
        className="absolute w-[5px] h-[5px] bg-slate-900 rounded-full animate-look-around"
        style={{ top: '3px', left: '2px' }}
      />
    </div>
    {/* Right eye - oval shape like 👀 */}
    <div className="relative w-[9px] h-[11px] rounded-[45%] bg-white border border-slate-300 overflow-hidden shadow-sm animate-blink origin-center">
      {/* Black pupil */}
      <div 
        className="absolute w-[5px] h-[5px] bg-slate-900 rounded-full animate-look-around"
        style={{ top: '3px', left: '2px' }}
      />
    </div>
  </div>
);

// Sleepy eyes component - closed eyes with Z for idle status 😴
const SleepyEyes: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-[2px] ${className}`}>
    {/* Left closed eye - curved line */}
    <div className="relative w-[9px] h-[11px] flex items-center justify-center">
      <div className="w-[7px] h-[2px] bg-slate-400 rounded-full" 
           style={{ transform: 'rotate(-10deg)' }} />
    </div>
    {/* Right closed eye - curved line */}
    <div className="relative w-[9px] h-[11px] flex items-center justify-center">
      <div className="w-[7px] h-[2px] bg-slate-400 rounded-full" 
           style={{ transform: 'rotate(10deg)' }} />
    </div>
    {/* Floating Z */}
    <span className="text-[8px] font-bold text-slate-400 animate-pulse ml-0.5">
      z
    </span>
  </div>
);

const getPresenceColor = (type: PresenceType) => {
  switch (type) {
    case 'on_call':
      return 'bg-green-100 border-green-300 dark:bg-green-950/50 dark:border-green-700';
    case 'idle':
      return 'bg-slate-100 border-slate-300 dark:bg-slate-800/50 dark:border-slate-600';
    case 'viewing':
    default:
      return 'bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-700';
  }
};

const getPresenceIcon = (type: PresenceType) => {
  switch (type) {
    case 'on_call':
      return <Phone className="h-3 w-3 text-green-500 animate-pulse" />;
    case 'idle':
      return <SleepyEyes />;
    case 'viewing':
    default:
      return <ReadingEyes />;
  }
};

const getTooltipTitle = (viewers: Array<{ type: PresenceType }>) => {
  const hasCall = viewers.some(v => v.type === 'on_call');
  const allIdle = viewers.every(v => v.type === 'idle');
  
  if (hasCall) return '📞 На связи:';
  if (allIdle) return '😴 Неактивны:';
  return '👀 Сейчас смотрят:';
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
  const hasIdle = viewers.some(v => v.type === 'idle');
  const allIdle = viewers.every(v => v.type === 'idle');
  const primaryViewer = viewers[0];
  const additionalCount = viewers.length - 1;

  // Determine main icon based on presence types (priority: call > viewing > idle)
  const mainIcon = hasCall 
    ? <Phone className="h-3 w-3 text-green-500 animate-pulse" />
    : allIdle 
      ? <SleepyEyes />
      : <ReadingEyes />;

  const containerClass = hasCall
    ? 'bg-green-100 border-green-300 dark:bg-green-950/50 dark:border-green-700'
    : allIdle
      ? 'bg-slate-100 border-slate-300 dark:bg-slate-800/50 dark:border-slate-600'
      : 'bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-700';

  const tooltipContent = (
    <div className="space-y-1.5 p-1">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        {getTooltipTitle(viewers)}
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
            {viewer.type === 'idle' && (
              <span className="text-[10px] text-slate-400 ml-1">💤</span>
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
