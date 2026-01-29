import { memo } from 'react';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageCacheProgress } from '@/hooks/useAutoCacheImages';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ImageCacheIndicatorProps {
  progress: ImageCacheProgress;
  className?: string;
  compact?: boolean;
}

/**
 * Visual indicator showing image caching progress
 * Shows cloud icon with progress when caching is active
 */
export const ImageCacheIndicator = memo(({
  progress,
  className,
  compact = false,
}: ImageCacheIndicatorProps) => {
  const { total, cached, inProgress, isActive, percentage } = progress;
  
  // Don't show if no images in chat
  if (total === 0) return null;
  
  const allCached = cached === total && !isActive;
  
  const content = (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs transition-all duration-300",
        isActive && "animate-pulse",
        allCached ? "text-green-500" : "text-muted-foreground",
        className
      )}
    >
      {isActive ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : allCached ? (
        <Cloud className="h-3.5 w-3.5" />
      ) : (
        <CloudOff className="h-3.5 w-3.5" />
      )}
      
      {!compact && (
        <span className="font-medium">
          {isActive ? (
            `${cached}/${total}`
          ) : allCached ? (
            `${total} 💾`
          ) : (
            `${cached}/${total}`
          )}
        </span>
      )}
      
      {/* Progress bar for active caching */}
      {isActive && !compact && (
        <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );

  const tooltipText = isActive
    ? `Кэширование изображений: ${cached} из ${total} (${inProgress} в очереди)`
    : allCached
      ? `Все ${total} изображений сохранены для офлайн`
      : `${cached} из ${total} изображений сохранено`;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

ImageCacheIndicator.displayName = 'ImageCacheIndicator';
