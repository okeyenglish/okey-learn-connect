import { Skeleton } from "@/components/ui/skeleton";

interface MessageSkeletonProps {
  count?: number;
}

/**
 * Skeleton loading state for chat messages
 * Shows realistic message bubbles while loading
 */
export const MessageSkeleton = ({ count = 6 }: MessageSkeletonProps) => {
  // Alternate between left and right aligned messages
  const skeletons = Array.from({ length: count }, (_, i) => ({
    id: i,
    isOutgoing: i % 3 === 0, // Every 3rd message is outgoing
    width: [60, 80, 45, 70, 55, 90][i % 6], // Varying widths %
  }));

  return (
    <div className="flex flex-col gap-3 p-4 animate-pulse">
      {skeletons.map(({ id, isOutgoing, width }) => (
        <div
          key={id}
          className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`flex gap-2 max-w-[70%] ${isOutgoing ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar for incoming messages */}
            {!isOutgoing && (
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            )}
            
            {/* Message bubble */}
            <div className="flex flex-col gap-1">
              <Skeleton 
                className={`h-10 rounded-2xl ${isOutgoing ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                style={{ width: `${width * 2}px`, minWidth: '80px', maxWidth: '300px' }}
              />
              {/* Timestamp */}
              <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Chat list skeleton for initial loading
 */
export const ChatListSkeleton = ({ count = 8 }: { count?: number }) => {
  return (
    <div className="flex flex-col animate-pulse">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border-b border-border/50">
          {/* Avatar */}
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-full max-w-[200px]" />
          </div>
          
          {/* Unread badge (occasionally) */}
          {i % 3 === 0 && (
            <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
};

export default MessageSkeleton;
