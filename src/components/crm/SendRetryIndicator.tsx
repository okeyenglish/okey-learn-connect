import { RetryIndicator, RetryStatus } from '@/components/ui/RetryIndicator';
import { cn } from '@/lib/utils';

interface SendRetryIndicatorProps {
  status: RetryStatus;
  currentAttempt?: number;
  maxAttempts?: number;
  className?: string;
}

/**
 * Compact retry indicator for the chat input area
 * Shows when a message send is being retried automatically
 */
export const SendRetryIndicator = ({
  status,
  currentAttempt = 0,
  maxAttempts = 3,
  className,
}: SendRetryIndicatorProps) => {
  if (status === 'idle') {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center justify-center py-1 animate-fade-in",
      className
    )}>
      <RetryIndicator
        status={status}
        currentAttempt={currentAttempt}
        maxAttempts={maxAttempts}
        size="sm"
        inline={true}
      />
    </div>
  );
};
