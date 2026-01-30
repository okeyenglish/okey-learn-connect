import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MessageSkeletonProps {
  count?: number;
  /** Show animated entrance */
  animated?: boolean;
}

/**
 * Skeleton loading state for chat messages
 * Shows realistic message bubbles while loading with staggered animation
 */
export const MessageSkeleton = ({ count = 6, animated = true }: MessageSkeletonProps) => {
  // Alternate between left and right aligned messages
  const skeletons = Array.from({ length: count }, (_, i) => ({
    id: i,
    isOutgoing: i % 3 === 0, // Every 3rd message is outgoing
    width: [60, 80, 45, 70, 55, 90][i % 6], // Varying widths %
  }));

  return (
    <div className="flex flex-col gap-3 p-4">
      {skeletons.map(({ id, isOutgoing, width }) => (
        <div
          key={id}
          className={cn(
            "flex transition-all duration-300",
            isOutgoing ? 'justify-end' : 'justify-start',
            animated && "animate-fade-in"
          )}
          style={animated ? { animationDelay: `${id * 50}ms`, animationFillMode: 'backwards' } : undefined}
        >
          <div className={cn(
            "flex gap-2 max-w-[70%]",
            isOutgoing ? 'flex-row-reverse' : 'flex-row'
          )}>
            {/* Avatar for incoming messages */}
            {!isOutgoing && (
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0 animate-pulse" />
            )}
            
            {/* Message bubble */}
            <div className="flex flex-col gap-1">
              <Skeleton 
                className={cn(
                  "h-10 animate-pulse",
                  isOutgoing ? 'rounded-2xl rounded-br-sm bg-primary/20' : 'rounded-2xl rounded-bl-sm'
                )}
                style={{ width: `${width * 2}px`, minWidth: '80px', maxWidth: '300px' }}
              />
              {/* Timestamp */}
              <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                <Skeleton className="h-3 w-10 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Full-screen chat loading overlay with pulsing indicator
 */
export const ChatLoadingOverlay = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;
  
  return (
    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-20 animate-fade-in">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-3 border-primary/30 border-t-primary animate-spin" />
          <div className="absolute inset-0 h-10 w-10 rounded-full border-3 border-transparent border-b-primary/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
        </div>
        <span className="text-sm text-muted-foreground animate-pulse">Загрузка сообщений...</span>
      </div>
    </div>
  );
};

/**
 * Chat list skeleton for initial loading
 */
export const ChatListSkeleton = ({ count = 8 }: { count?: number }) => {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }, (_, i) => (
        <div 
          key={i} 
          className="flex items-center gap-3 p-3 border-b border-border/50 animate-fade-in"
          style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'backwards' }}
        >
          {/* Avatar */}
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0 animate-pulse" />
          
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-24 animate-pulse" />
              <Skeleton className="h-3 w-10 animate-pulse" />
            </div>
            <Skeleton className="h-3 w-full max-w-[200px] animate-pulse" />
          </div>
          
          {/* Unread badge (occasionally) */}
          {i % 3 === 0 && (
            <Skeleton className="h-5 w-5 rounded-full flex-shrink-0 animate-pulse" />
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Compact inline loading indicator for chat switching
 */
export const ChatSwitchIndicator = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;
  
  return (
    <div className="flex items-center justify-center py-8 animate-fade-in">
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full">
        <div className="flex gap-1">
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-xs text-muted-foreground ml-1">Загрузка...</span>
      </div>
    </div>
  );
};

/**
 * Messenger tab switching overlay with smooth animation
 */
export const MessengerTabLoadingOverlay = ({ 
  visible, 
  messengerType 
}: { 
  visible: boolean;
  messengerType?: 'whatsapp' | 'telegram' | 'max' | 'chatos' | 'email' | 'calls';
}) => {
  if (!visible) return null;
  
  const getMessengerColor = () => {
    switch (messengerType) {
      case 'whatsapp': return 'bg-green-500';
      case 'telegram': return 'bg-blue-500';
      case 'max': return 'bg-purple-500';
      case 'chatos': return 'bg-teal-500';
      case 'email': return 'bg-orange-500';
      case 'calls': return 'bg-rose-500';
      default: return 'bg-primary';
    }
  };
  
  const getMessengerLabel = () => {
    switch (messengerType) {
      case 'whatsapp': return 'WhatsApp';
      case 'telegram': return 'Telegram';
      case 'max': return 'Max';
      case 'chatos': return 'ChatOS';
      case 'email': return 'Email';
      case 'calls': return 'Звонки';
      default: return 'Загрузка';
    }
  };
  
  return (
    <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] flex items-center justify-center z-10 animate-in fade-in duration-150">
      <div className="flex flex-col items-center gap-3 p-4 bg-background/80 rounded-xl shadow-lg border border-border/50">
        <div className="relative">
          <div className={`h-8 w-8 rounded-full ${getMessengerColor()} opacity-20 animate-ping`} />
          <div className={`absolute inset-0 h-8 w-8 rounded-full ${getMessengerColor()} flex items-center justify-center`}>
            <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
          </div>
        </div>
        <span className="text-sm font-medium text-foreground/80">{getMessengerLabel()}</span>
      </div>
    </div>
  );
};

export default MessageSkeleton;
