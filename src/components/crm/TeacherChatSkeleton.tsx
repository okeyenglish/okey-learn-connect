import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface TeacherChatSkeletonProps {
  onBack?: () => void;
  showBackButton?: boolean;
}

/**
 * Full-page skeleton for teacher chat loading state
 * Mimics the real chat layout for smooth perceived loading
 */
export const TeacherChatSkeleton: React.FC<TeacherChatSkeletonProps> = ({
  onBack,
  showBackButton = false
}) => {
  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header skeleton */}
      <div className="border-b shrink-0 bg-background p-3">
        <div className="flex items-center gap-3">
          {showBackButton && onBack && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {/* Avatar */}
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          
          {/* Name and status */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>

      {/* Messages area skeleton */}
      <div className="flex-1 overflow-hidden p-4 space-y-4">
        {/* Incoming message skeleton */}
        <div className="flex items-start gap-2 max-w-[70%]">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-16 w-48 rounded-xl rounded-tl-sm" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        </div>

        {/* Outgoing message skeleton */}
        <div className="flex items-start gap-2 justify-end">
          <div className="space-y-1.5 flex flex-col items-end">
            <Skeleton className="h-10 w-36 rounded-xl rounded-tr-sm" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        </div>

        {/* Another incoming message */}
        <div className="flex items-start gap-2 max-w-[70%]">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-20 w-56 rounded-xl rounded-tl-sm" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        </div>

        {/* Outgoing message */}
        <div className="flex items-start gap-2 justify-end">
          <div className="space-y-1.5 flex flex-col items-end">
            <Skeleton className="h-12 w-44 rounded-xl rounded-tr-sm" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        </div>

        {/* Loading indicator in center */}
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs">Загрузка чата...</span>
          </div>
        </div>
      </div>

      {/* Input area skeleton */}
      <div className="border-t shrink-0 bg-background p-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md shrink-0" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-8 w-8 rounded-md shrink-0" />
        </div>
      </div>
    </div>
  );
};
